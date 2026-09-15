import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router";
import {
  Badge,
  Button,
  Container,
  Heading,
  Link,
  Modal,
  Stack,
  Table,
  Text,
  Toast,
} from "@recursica/adapter-mantine-v8";
import type { PrototypeMeta } from "..";
import { Prototype } from "../../Prototype";
import { usePrototypeModes } from "../../modes";
import type {
  Confidence,
  Effort,
  Issue,
  IssueStatus,
} from "../../../data/worklist";
import {
  handlers,
  emptyHandlers,
  loadErrorHandlers,
  malformedHandlers,
  submitErrorHandlers,
} from "../../../api/worklist";
import { worker } from "../../../api/worker";
import { modes } from "./modes";

export const meta: PrototypeMeta = {
  title: "Worklist",
  description:
    "A triage screen for issues a monitoring system found in a small retailer's operations — what each costs to leave alone, how big the fix is, and what the system is unsure about.",
};

/** Maps each mode's id to the handler set it swaps into /api/worklist. */
const HANDLERS_BY_MODE: Record<number, typeof handlers> = {
  1: handlers,
  2: emptyHandlers,
  3: loadErrorHandlers,
  4: malformedHandlers,
  5: submitErrorHandlers,
};

/**
 * The day this data was last checked. Fixed, because the data is mock — but
 * present because a screen that reports findings has to say how current they
 * are, or the reader assumes "now".
 */
const DATA_AS_OF = "2026-09-15";

/**
 * Column widths, by data type rather than by screen — every narrow type gets
 * an explicit width and the sentence column (`title`) deliberately gets none,
 * so it takes whatever the others did not. Fixing a width on the sentence
 * column instead is the failure this ordering avoids: it holds the prose
 * steady and squeezes the dates until they wrap.
 *
 * Applied through a plain `<colgroup>` rather than through the header cells.
 * Recursica's table header cell exposes only `children`, `sorted`, `disabled`
 * and `variant`, and its styling keys are sandboxed — so there is no prop to
 * carry a width. A `<colgroup>` is the HTML table's own column-sizing
 * mechanism rather than an override of anything the component owns, which
 * keeps this off the `overStyled` escape hatch. Paired with `layout="fixed"`
 * on the table so the widths are honoured exactly.
 */
const COLUMN_WIDTH = {
  status: 128,
  monthlyCost: 176,
  effort: 108,
  confidence: 124,
  firstSeen: 136,
} as const;

/**
 * Built once and shared, never per row: a formatter per call site is how one
 * screen ends up with three date formats, and constructing one per row is
 * measurably slow.
 *
 * No locale argument anywhere — passing one would name a locale the reader
 * did not choose.
 */
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

/** Two decimals on every value, so the decimal point lands in one place. */
const currencyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * `firstSeen` carries a day and no time. Handing "2024-11-03" to `new Date()`
 * parses it as UTC midnight, which renders as the previous day for any reader
 * west of Greenwich — a wrong date that looks entirely plausible. Splitting
 * the parts and building a local date keeps the day the day.
 */
function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatDateOnly(value: string): string | null {
  const parsed = parseDateOnly(value);
  return parsed ? dateFormatter.format(parsed) : null;
}

/**
 * The null cell: the literal string `NA`, italic, in neutral 500 — the same
 * string in every column, as real text rather than an empty cell styled to
 * look absent. An empty cell is announced as nothing at all, and a `0` in a
 * currency column is a different claim entirely.
 *
 * PARTIAL, and the shortfall is a gap in the design system rather than a
 * choice. The rule asks for italic *and* neutral 500.
 *
 * `<Text component="i">` was tried first and measured: it renders
 * `font-style: normal`, because Recursica's Text resolves font-style from its
 * own token and overrides the element. So the component cannot produce this
 * treatment at all — not the colour, which has no prop, and not the italic,
 * which it actively normalises. Both are reachable only through `overStyled`,
 * which this repository lints as an error and OVERSTYLING.md calls technical
 * debt.
 *
 * A bare `<i>` is used instead: the platform's own element for offset text,
 * inheriting the cell's typography rather than authoring a type value. That
 * recovers the italic. Neutral 500 stays missing, and is reported to the
 * design system rather than invented here — the typography rule is explicit
 * that a missing type style is stated, not filled in.
 *
 * Meaning still does not ride on colour alone, which is what the rule was
 * protecting: the cell says `NA` in words, in a face the reader can see is
 * different from a value.
 */
function NullValue() {
  return <i>NA</i>;
}

/**
 * A badge is heavy, so it is spent only where the reader's next decision
 * turns on it. Three statuses are open questions and carry one; `Dismissed`
 * is settled, asks nothing of the reader, and so carries the word alone.
 * Weight only works when it is scarce.
 *
 * This started as `Dismissed: undefined`, expecting the component's default
 * to be the quiet treatment. Measured in the browser, that default resolves
 * to the same red as `primary-color` — so a closed issue rendered
 * indistinguishably from the one most needing attention. Recursica's Badge
 * offers `alert`, `primary-color`, `success` and `warning` and no neutral,
 * and `alert` would say "problem" about an issue somebody deliberately
 * closed. The missing neutral variant is reported to the design system.
 *
 * Colour is never the only channel here either way: every cell says the
 * status in words.
 */
const STATUS_VARIANT: Record<
  IssueStatus,
  "alert" | "primary-color" | "success" | "warning" | null
> = {
  New: "primary-color",
  Checking: "warning",
  Queued: "success",
  Dismissed: null,
};

const STATUSES: IssueStatus[] = ["New", "Checking", "Queued", "Dismissed"];
const CONFIDENCES: Confidence[] = ["High", "Medium", "Low"];
const EFFORTS: Effort[] = ["1 hour", "Half a day", "1 day", "2 days", "1 week"];

/**
 * Coerces one row of an untrusted payload into an `Issue`, or rejects it.
 *
 * A row missing an id or a title cannot be identified or acted on, so it is
 * rejected rather than rendered as a blank line. A cost that arrived as a
 * string is treated as unknown rather than parsed — guessing what a
 * malformed number meant is how a wrong figure reaches a screen that looks
 * right. How many rows were rejected is reported to the reader; silently
 * dropping them would make the screen understate its own findings.
 */
function toIssue(raw: unknown): Issue | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;

  const id = typeof row.id === "string" ? row.id : null;
  const title = typeof row.title === "string" ? row.title : null;
  if (!id || !title) return null;

  const status =
    typeof row.status === "string" &&
    (STATUSES as string[]).includes(row.status)
      ? (row.status as IssueStatus)
      : null;
  if (!status) return null;

  const confidence =
    typeof row.confidence === "string" &&
    (CONFIDENCES as string[]).includes(row.confidence)
      ? (row.confidence as Confidence)
      : null;
  const effort =
    typeof row.effort === "string" && (EFFORTS as string[]).includes(row.effort)
      ? (row.effort as Effort)
      : null;
  if (!confidence || !effort) return null;

  return {
    id,
    title,
    status,
    monthlyCost: typeof row.monthlyCost === "number" ? row.monthlyCost : null,
    effort,
    confidence,
    firstSeen: typeof row.firstSeen === "string" ? row.firstSeen : "",
    source: typeof row.source === "string" ? row.source : "",
    observed: Array.isArray(row.observed)
      ? row.observed.filter((line): line is string => typeof line === "string")
      : [],
    uncertainty: typeof row.uncertainty === "string" ? row.uncertainty : "",
  };
}

interface ParsedPayload {
  issues: Issue[];
  rejected: number;
}

function parsePayload(body: unknown): ParsedPayload {
  if (!Array.isArray(body)) return { issues: [], rejected: 0 };
  const issues: Issue[] = [];
  let rejected = 0;
  for (const raw of body) {
    const issue = toIssue(raw);
    if (issue) issues.push(issue);
    else rejected += 1;
  }
  return { issues, rejected };
}

type LoadState =
  | { status: "loading" }
  | { status: "ok"; payload: ParsedPayload }
  | { status: "error"; message: string };

/** An issue is still open — and still costing — until it is dismissed. */
function isOpen(issue: Issue): boolean {
  return issue.status !== "Dismissed";
}

function IssueModal({
  issue,
  saveFailed,
  isSaving,
  onClose,
  onDecide,
}: {
  issue: Issue;
  saveFailed: string | null;
  isSaving: boolean;
  onClose: () => void;
  onDecide: (status: IssueStatus) => void;
}) {
  const firstSeen = formatDateOnly(issue.firstSeen);

  return (
    <Modal opened onClose={onClose} title={issue.title}>
      <Stack gap="rec-lg">
        {saveFailed && (
          <Toast variant="error" title="Could not save that decision">
            {saveFailed}
          </Toast>
        )}

        <Stack gap="rec-sm">
          <Text variant="overline">What the system saw</Text>
          {issue.observed.length > 0 ? (
            <Stack gap="rec-none" component="ul">
              {issue.observed.map((line) => (
                <Text key={line} component="li">
                  {line}
                </Text>
              ))}
            </Stack>
          ) : (
            <NullValue />
          )}
        </Stack>

        <Stack gap="rec-sm">
          <Text variant="overline">What it is not sure about</Text>
          {issue.uncertainty ? <Text>{issue.uncertainty}</Text> : <NullValue />}
        </Stack>

        <Stack gap="rec-sm">
          <Text variant="overline">Where this came from</Text>
          {issue.source ? <Text>{issue.source}</Text> : <NullValue />}
        </Stack>

        <Stack gap="rec-sm">
          <Text variant="overline">First seen</Text>
          {firstSeen ? <Text>{firstSeen}</Text> : <NullValue />}
        </Stack>

        <Modal.Footer>
          {/* Dismiss is the quieter of two outcomes of one decision, so it
              sits immediately beside the primary rather than away from it.
              Neither is confirmed: both are reversible from this same
              surface, and confirming a reversible action buys nothing. */}
          <Button
            variant="outline"
            onClick={() => onDecide("Dismissed")}
            disabled={isSaving}
          >
            Dismiss issue
          </Button>
          <Button
            variant="solid"
            onClick={() => onDecide("Queued")}
            loading={isSaving}
          >
            Queue issue
          </Button>
        </Modal.Footer>
      </Stack>
    </Modal>
  );
}

function WorklistContent() {
  const { activeMode } = usePrototypeModes();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [searchParams, setSearchParams] = useSearchParams();
  const [saveFailed, setSaveFailed] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const issueId = searchParams.get("issue");

  // The detail modal is routable via ?issue=<id>, per "everything is
  // routable" — so a particular issue is a link somebody can send. Every
  // other search param is carried through, which is what keeps the active
  // mode from resetting the moment someone opens an issue.
  const issueHref = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("issue", id);
    return `?${next.toString()}`;
  };

  const closeIssue = useCallback(() => {
    setSaveFailed(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("issue");
      return next;
    });
  }, [setSearchParams]);

  const load = useCallback(() => {
    setState({ status: "loading" });
    fetch("/api/worklist")
      .then(async (res) => {
        const body: unknown = await res.json();
        if (!res.ok) {
          const message =
            typeof body === "object" &&
            body !== null &&
            typeof (body as { error?: unknown }).error === "string"
              ? (body as { error: string }).error
              : `HTTP ${res.status}`;
          throw new Error(message);
        }
        return body;
      })
      .then((body) => setState({ status: "ok", payload: parsePayload(body) }))
      .catch((err: unknown) =>
        setState({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        }),
      );
  }, []);

  useEffect(() => {
    if (!activeMode) return;
    worker.use(...HANDLERS_BY_MODE[activeMode.id]);
    load();
    return () => worker.resetHandlers();
  }, [activeMode, load]);

  const decide = async (status: IssueStatus) => {
    if (!issueId) return;
    setIsSaving(true);
    setSaveFailed(null);
    try {
      const res = await fetch(`/api/worklist/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body: unknown = await res.json();
      if (!res.ok) {
        const message =
          typeof body === "object" &&
          body !== null &&
          typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : `HTTP ${res.status}`;
        throw new Error(message);
      }
      closeIssue();
      load();
    } catch (err: unknown) {
      setSaveFailed(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeMode) return null;

  // A page that is loading shows nothing, then shows the content. No
  // spinner and no skeleton: this is a local mock well under the three
  // seconds that would earn one.
  if (state.status === "loading") return null;

  const asOf = formatDateOnly(DATA_AS_OF);

  if (state.status === "error") {
    return (
      <Container size="lg" py="xl">
        <Stack gap="rec-lg">
          <Heading order={1}>Worklist</Heading>
          {/* Worded as a failure to fetch, which is a different thing from
              having fetched and found nothing. Collapsing the two leaves the
              reader unable to tell whether to retry or to stop looking. */}
          <Toast variant="error" title="Could not load the worklist">
            {state.message}
          </Toast>
        </Stack>
      </Container>
    );
  }

  const { issues, rejected } = state.payload;

  // Sorted by what each issue costs, largest first, because that is the
  // ranking the screen exists to produce. Issues with no estimate sort last
  // — unknown is not the same as small, but it cannot be placed among the
  // known values either.
  const rows = [...issues].sort((a, b) => {
    if (a.monthlyCost === null && b.monthlyCost === null)
      return a.title.localeCompare(b.title);
    if (a.monthlyCost === null) return 1;
    if (b.monthlyCost === null) return -1;
    return b.monthlyCost - a.monthlyCost;
  });

  const openIssues = issues.filter(isOpen);
  const pricedOpen = openIssues.filter((issue) => issue.monthlyCost !== null);
  const unpricedOpen = openIssues.length - pricedOpen.length;
  const openCost = pricedOpen.reduce(
    (total, issue) => total + (issue.monthlyCost ?? 0),
    0,
  );

  const selectedIssue = rows.find((issue) => issue.id === issueId);

  return (
    <Container size="lg" py="xl">
      <Stack gap="rec-xl">
        <Heading order={1}>Worklist</Heading>

        {rejected > 0 && (
          <Toast variant="error" title="Some rows could not be read">
            {rejected} of {rejected + issues.length} rows did not match the
            expected shape and are not shown below. The figures on this screen
            cover only the rows that could be read.
          </Toast>
        )}

        {issues.length === 0 ? (
          // The fetch worked and found nothing. Said plainly, and worded so
          // it cannot be mistaken for the failure message above.
          <Text>
            No issues are open. The last check ran on {asOf} and found nothing
            to triage.
          </Text>
        ) : (
          <>
            {/* The one figure on the screen, and it is here rather than in
                the table footer on purpose. The house rule puts a column
                total in a fixed footer — but the Recursica table has no
                sticky footer (Mantine offers `stickyHeader` and no
                equivalent for `Tfoot`, and `RecursicaTableProps` is empty),
                so a total placed there scrolls away. Anything below a
                region of variable length is effectively not on the screen,
                and this number is the whole argument the screen exists to
                hand its reader. Reported to the design system. */}
            <Stack gap="rec-sm">
              {/* The label is the heading, because the label is what this
                  region is. The figure is its content.

                  The dashboard rule asks for a number given weight through
                  typographic scale, and Recursica has no display or figure
                  type style to give it — `subtitle` is the largest body
                  variant that exists. Promoting the number to an `h2` to buy
                  that size is exactly the substitution the typography rule
                  forbids, and it would leave a screen reader announcing a
                  bare number as a section heading. So the gap is stated
                  rather than filled: reported to the design system. */}
              <Heading order={2}>Open issues, cost per month (USD $)</Heading>
              <Text variant="subtitle">
                {currencyFormatter.format(openCost)}
              </Text>
              {/* Survives deletion: without it the reader takes this for a
                  complete total, and the research this screen is built from
                  says these readers distrust a system that will not admit
                  what it does not know. */}
              <Text variant="caption">
                At least — {unpricedOpen} of {openIssues.length} open issues
                have no estimate yet, so the real figure is higher. Checked{" "}
                {asOf}.
              </Text>
            </Stack>

            <Table layout="fixed">
              {/* The sentence column carries no width and takes the
                  remainder; every narrow column is pinned. See COLUMN_WIDTH. */}
              <colgroup>
                <col />
                <col style={{ width: COLUMN_WIDTH.status }} />
                <col style={{ width: COLUMN_WIDTH.monthlyCost }} />
                <col style={{ width: COLUMN_WIDTH.effort }} />
                <col style={{ width: COLUMN_WIDTH.confidence }} />
                <col style={{ width: COLUMN_WIDTH.firstSeen }} />
              </colgroup>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Issue</Table.Th>
                  <Table.Th>Status</Table.Th>
                  {/* Sorted on cost rather than on the leading column: the
                      ranking this screen exists to produce is "what is
                      bleeding most", and the indicator has to say so even
                      though the sort cannot be changed here. */}
                  <Table.Th variant="currency" sorted="desc">
                    Monthly cost (USD $)
                  </Table.Th>
                  <Table.Th>Effort</Table.Th>
                  <Table.Th>Confidence</Table.Th>
                  <Table.Th>First seen</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((issue) => {
                  const firstSeen = formatDateOnly(issue.firstSeen);
                  return (
                    <Table.Tr key={issue.id}>
                      <Table.Td>
                        {/* The way into the record is its own identifying
                            value, and it is a link rather than a button.

                            Opening a surface is normally an action and so
                            normally a button — but this modal is
                            deliberately deep-linkable: `?issue=<id>` is a
                            real URL a person can copy out of the address
                            bar and send to the colleague who owns the fix.
                            That is the one case the house rule hands to a
                            link, and it comes with a real `href`, so
                            right-click, open-in-new-tab and copy-link all
                            keep working.

                            It also fixes something measured rather than
                            reasoned: as a text Button this cell truncated
                            every title past roughly 55 characters, because
                            the Button sets `overflow: hidden` and a button
                            is not built to hold a wrapping sentence. The
                            house rule prefers wrapping to truncation where
                            a cell has no secondary text. An anchor wraps.

                            It is the only interactive thing in the row,
                            which is what keeps a click unambiguous. */}
                        <Link component={RouterLink} to={issueHref(issue.id)}>
                          {issue.title}
                        </Link>
                      </Table.Td>
                      <Table.Td>
                        {STATUS_VARIANT[issue.status] ? (
                          <Badge
                            variant={STATUS_VARIANT[issue.status] ?? undefined}
                          >
                            {issue.status}
                          </Badge>
                        ) : (
                          <Text>{issue.status}</Text>
                        )}
                      </Table.Td>
                      <Table.Td variant="currency">
                        {issue.monthlyCost === null ? (
                          <NullValue />
                        ) : (
                          currencyFormatter.format(issue.monthlyCost)
                        )}
                      </Table.Td>
                      <Table.Td>{issue.effort}</Table.Td>
                      <Table.Td>{issue.confidence}</Table.Td>
                      <Table.Td>{firstSeen ?? <NullValue />}</Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </>
        )}
      </Stack>

      {selectedIssue && (
        <IssueModal
          key={selectedIssue.id}
          issue={selectedIssue}
          saveFailed={saveFailed}
          isSaving={isSaving}
          onClose={closeIssue}
          onDecide={decide}
        />
      )}
    </Container>
  );
}

function Worklist() {
  return (
    <Prototype modes={modes}>
      <WorklistContent />
    </Prototype>
  );
}

export default Worklist;
