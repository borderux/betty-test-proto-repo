import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import {
  Badge,
  Button,
  Container,
  Heading,
  Stack,
  Table,
  Text,
  TextField,
  Group,
  Chip,
  Loader,
  Toast,
} from "@recursica/adapter-mantine-v8";
import { Prototype } from "../../Prototype";
import { usePrototypeModes } from "../../modes";
import type { Claim, ReviewReason, CodeEntry } from "../../../data/fixpoint";
import { CONFIG } from "../../../data/fixpoint";
import { handlers, errorHandlers, emptyHandlers } from "../../../api/fixpoint";
import { worker } from "../../../api/worker";
import { modes } from "./modes";

export const meta = {
  title: "Fixpoint Audit Queue",
  description:
    "The auditor's queue: claims in In audit grouped by review reason, with deadline, resubmission and ownership flags.",
};

/** The signed-in auditor for this prototype. Real auth is out of scope. */
const CURRENT_AUDITOR = "J. Mills";

const HANDLERS_BY_MODE: Record<number, typeof handlers> = {
  1: handlers,
  2: emptyHandlers,
  3: errorHandlers,
};

type LoadState =
  | { status: "loading" }
  | {
      status: "ok";
      claims: Claim[];
      codes: CodeEntry[];
    }
  | { status: "error"; message: string };

const REVIEW_REASON_ORDER: ReviewReason[] = [
  "High value",
  "Random sample",
  "Repeat unit",
  "Standard review",
  "Fast-track",
  "Unclassified",
];

const ALL_BRANDS = ["Corvell", "Halvorsen"] as const;

/** Days remaining until the submission deadline (negative if past). */
function daysToDeadline(claim: Claim, today: Date): number {
  const deadline = new Date(claim.submission_deadline);
  const diffMs = deadline.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/** Days the claim has been sitting in In audit, from its repair date as a stand-in for the move event. */
function daysInAudit(claim: Claim, today: Date): number {
  const entered = new Date(claim.repair_date);
  const diffMs = today.getTime() - entered.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

type SortKey = "deadline" | "amount" | "daysInAudit" | "shop";

function FixpointAuditContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeMode } = usePrototypeModes();

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  const reasonFilters = searchParams.getAll("reason") as ReviewReason[];
  const brandFilters = searchParams.getAll("brand");
  const shopFilter = searchParams.get("shop") || "";
  const amountMin = searchParams.get("amountMin") || "";
  const amountMax = searchParams.get("amountMax") || "";
  const deadlineWindow = searchParams.get("deadline") || "all"; // all | soon
  const resubmittedOnly = searchParams.get("resubmitted") === "1";
  const lateIntakeOnly = searchParams.get("lateIntake") === "1";
  const migratedOnly = searchParams.get("migrated") === "1";
  const scope = searchParams.get("scope") || "all"; // all | mine
  const sortBy = (searchParams.get("sortBy") as SortKey) || "deadline";
  const sortDir = searchParams.get("sortDir") || "asc";

  const load = useCallback(() => {
    if (!activeMode) return;
    worker.use(...HANDLERS_BY_MODE[activeMode.id]);
    setLoadState({ status: "loading" });
    fetch("/api/fixpoint/claims")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data.claims)) {
          throw new Error("Invalid response format");
        }
        setLoadState({ status: "ok", claims: data.claims, codes: data.codes ?? [] });
      })
      .catch((err: unknown) => {
        setLoadState({
          status: "error",
          message: err instanceof Error ? err.message : "Failed to load claims",
        });
      });
    return () => worker.resetHandlers();
  }, [activeMode]);

  useEffect(() => {
    load();
  }, [load]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params);
  };

  const toggleListParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    const values = params.getAll(key);
    params.delete(key);
    if (values.includes(value)) {
      values.filter((v) => v !== value).forEach((v) => params.append(key, v));
    } else {
      [...values, value].forEach((v) => params.append(key, v));
    }
    setSearchParams(params);
  };

  const handleSort = (column: SortKey) => {
    const params = new URLSearchParams(searchParams);
    if (sortBy === column) {
      params.set("sortDir", sortDir === "asc" ? "desc" : "asc");
    } else {
      params.set("sortBy", column);
      params.set("sortDir", "asc");
    }
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    setSearchParams(params);
  };

  if (!activeMode) return null;

  if (loadState.status === "loading") {
    return (
      <Container>
        <Stack gap="lg" py="xl">
          <Heading order={1}>Audit queue</Heading>
          <div style={{ display: "flex", justifyContent: "center", padding: "2rem 0" }}>
            <Loader />
          </div>
        </Stack>
      </Container>
    );
  }

  if (loadState.status === "error") {
    return (
      <Container>
        <Stack gap="lg" py="xl">
          <Heading order={1}>Audit queue</Heading>
          <Toast variant="error" title="Failed to load the audit queue">
            {loadState.message}
          </Toast>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </Stack>
      </Container>
    );
  }

  // Only claims currently In audit belong in this view (AUD-13: Returned/Denied never appear here).
  const inAudit = loadState.claims.filter((c) => c.state === "In audit");

  const scoped =
    scope === "mine"
      ? inAudit.filter((c) => c.reviewer === CURRENT_AUDITOR)
      : inAudit;

  const filtered = scoped.filter((c) => {
    if (reasonFilters.length > 0 && !reasonFilters.includes(c.review_reason)) {
      return false;
    }
    if (brandFilters.length > 0 && !brandFilters.includes(c.brand)) {
      return false;
    }
    if (shopFilter && c.shop !== shopFilter) {
      return false;
    }
    if (amountMin && c.amount < parseFloat(amountMin)) {
      return false;
    }
    if (amountMax && c.amount > parseFloat(amountMax)) {
      return false;
    }
    if (deadlineWindow === "soon" && daysToDeadline(c, today) > CONFIG.deadlineWarningDays) {
      return false;
    }
    if (resubmittedOnly && c.resubmission_count === 0) {
      return false;
    }
    if (lateIntakeOnly && !c.late_intake) {
      return false;
    }
    if (migratedOnly && !c.migrated_from_legacy) {
      return false;
    }
    return true;
  });

  const sortFn = (a: Claim, b: Claim) => {
    let cmp = 0;
    switch (sortBy) {
      case "amount":
        cmp = a.amount - b.amount;
        break;
      case "daysInAudit":
        cmp = daysInAudit(a, today) - daysInAudit(b, today);
        break;
      case "shop":
        cmp = a.shop.localeCompare(b.shop);
        break;
      case "deadline":
      default:
        cmp = new Date(a.submission_deadline).getTime() - new Date(b.submission_deadline).getTime();
    }
    return sortDir === "asc" ? cmp : -cmp;
  };

  const groups = REVIEW_REASON_ORDER.map((reason) => ({
    reason,
    claims: filtered.filter((c) => c.review_reason === reason).sort(sortFn),
  })).filter((g) => g.claims.length > 0 || reasonFilters.length === 0);

  const auditTotal = inAudit.length;
  const groupSum = groups.reduce((sum, g) => sum + g.claims.length, 0);
  const anyFilterActive =
    reasonFilters.length > 0 ||
    brandFilters.length > 0 ||
    !!shopFilter ||
    !!amountMin ||
    !!amountMax ||
    deadlineWindow !== "all" ||
    resubmittedOnly ||
    lateIntakeOnly ||
    migratedOnly;

  return (
    <Container>
      <Stack gap="lg" py="xl">
        <Group justify="space-between">
          <Heading order={1}>Audit queue</Heading>
          <Group gap="xs">
            <Chip checked={scope === "all"} onChange={() => setParam("scope", null)}>
              All claims
            </Chip>
            <Chip checked={scope === "mine"} onChange={() => setParam("scope", "mine")}>
              Mine ({CURRENT_AUDITOR})
            </Chip>
          </Group>
        </Group>

        <Text>
          {auditTotal} claims in audit, totaling {formatCurrency(inAudit.reduce((s, c) => s + c.amount, 0))}.
          {groupSum !== filtered.length ? " " : ""}
        </Text>

        <TextField
          label="Filter by shop"
          placeholder="Shop name"
          value={shopFilter}
          onChange={(e) => setParam("shop", e.currentTarget.value || null)}
        />

        <Stack gap="sm">
          <Text>Review reason</Text>
          <Group gap="xs" wrap="wrap">
            {REVIEW_REASON_ORDER.map((reason) => (
              <Chip
                key={reason}
                checked={reasonFilters.includes(reason)}
                onChange={() => toggleListParam("reason", reason)}
              >
                {reason}
              </Chip>
            ))}
          </Group>

          <Text>Brand</Text>
          <Group gap="xs" wrap="wrap">
            {ALL_BRANDS.map((brand) => (
              <Chip
                key={brand}
                checked={brandFilters.includes(brand)}
                onChange={() => toggleListParam("brand", brand)}
              >
                {brand}
              </Chip>
            ))}
          </Group>

          <Text>Amount range</Text>
          <Group gap="xs" wrap="wrap">
            <TextField
              label="Min"
              placeholder="$0"
              value={amountMin}
              onChange={(e) => setParam("amountMin", e.currentTarget.value || null)}
            />
            <TextField
              label="Max"
              placeholder="No max"
              value={amountMax}
              onChange={(e) => setParam("amountMax", e.currentTarget.value || null)}
            />
          </Group>

          <Text>Other filters</Text>
          <Group gap="xs" wrap="wrap">
            <Chip
              checked={deadlineWindow === "soon"}
              onChange={() => setParam("deadline", deadlineWindow === "soon" ? null : "soon")}
            >
              Deadline within {CONFIG.deadlineWarningDays} days
            </Chip>
            <Chip checked={resubmittedOnly} onChange={() => setParam("resubmitted", resubmittedOnly ? null : "1")}>
              Resubmitted
            </Chip>
            <Chip checked={lateIntakeOnly} onChange={() => setParam("lateIntake", lateIntakeOnly ? null : "1")}>
              Late intake
            </Chip>
            <Chip checked={migratedOnly} onChange={() => setParam("migrated", migratedOnly ? null : "1")}>
              Migrated
            </Chip>
          </Group>

          {anyFilterActive ? (
            <Button variant="outline" onClick={handleClearFilters}>
              Clear filters
            </Button>
          ) : null}
        </Stack>

        <Text>
          Showing {filtered.length} of {auditTotal} claims.
        </Text>

        {groups.length === 0 ? (
          <div style={{ border: "1px solid var(--mantine-color-gray-2)", padding: "1rem" }}>
            <Text>
              {anyFilterActive || inAudit.length === 0
                ? anyFilterActive
                  ? "No claims match these filters."
                  : "No claims are in audit right now."
                : "No claims are in audit right now."}
            </Text>
            {anyFilterActive ? (
              <Button variant="outline" mt="md" onClick={handleClearFilters}>
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          groups.map((group) => (
            <Stack key={group.reason} gap="sm">
              <Group justify="space-between">
                <Heading order={2}>{group.reason}</Heading>
                <Text>
                  {group.claims.length} claims &middot;{" "}
                  {formatCurrency(group.claims.reduce((s, c) => s + c.amount, 0))}
                </Text>
              </Group>

              <Table striped aria-label={`${group.reason} claims`}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Claim</Table.Th>
                    <Table.Th
                      onClick={() => handleSort("shop")}
                      sorted={sortBy === "shop" ? (sortDir as "asc" | "desc") : undefined}
                    >
                      Shop / brand
                    </Table.Th>
                    <Table.Th
                      onClick={() => handleSort("amount")}
                      sorted={sortBy === "amount" ? (sortDir as "asc" | "desc") : undefined}
                    >
                      Amount
                    </Table.Th>
                    <Table.Th>Review reason</Table.Th>
                    <Table.Th
                      onClick={() => handleSort("daysInAudit")}
                      sorted={sortBy === "daysInAudit" ? (sortDir as "asc" | "desc") : undefined}
                    >
                      Days in audit
                    </Table.Th>
                    <Table.Th
                      onClick={() => handleSort("deadline")}
                      sorted={sortBy === "deadline" ? (sortDir as "asc" | "desc") : undefined}
                    >
                      Deadline
                    </Table.Th>
                    <Table.Th>Flags</Table.Th>
                    <Table.Th>Reviewer</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {group.claims.map((claim) => {
                    const dLeft = daysToDeadline(claim, today);
                    const nearDeadline = dLeft <= CONFIG.deadlineWarningDays;
                    const dInAudit = daysInAudit(claim, today);
                    return (
                      <Table.Tr key={claim.claim_id}>
                        <Table.Td>{claim.claim_id}</Table.Td>
                        <Table.Td>
                          {claim.shop} &middot; {claim.brand}
                        </Table.Td>
                        <Table.Td>{formatCurrency(claim.amount)}</Table.Td>
                        <Table.Td>
                          <Stack gap={4}>
                            <Text>{claim.review_reason_detail}</Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>{dInAudit}</Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Text>
                              {dLeft >= 0 ? `${dLeft} days left` : `${Math.abs(dLeft)} days past`}
                            </Text>
                            {nearDeadline && <Badge variant="alert">Deadline soon</Badge>}
                            {claim.late_intake && <Badge variant="warning">Late intake</Badge>}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="wrap">
                            {claim.resubmission_count > 0 && (
                              <Badge variant="primary-color">
                                Resubmitted &middot; round {claim.resubmission_count}
                              </Badge>
                            )}
                            {claim.migrated_from_legacy && <Badge variant="warning">Legacy</Badge>}
                            {claim.qc_type === "Technician attestation" && (
                              <Badge variant="warning">Technician attestation</Badge>
                            )}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          {claim.reviewer ? (
                            claim.reviewer === CURRENT_AUDITOR ? (
                              "You"
                            ) : (
                              `In review by ${claim.reviewer}`
                            )
                          ) : (
                            "NA"
                          )}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Stack>
          ))
        )}
      </Stack>
    </Container>
  );
}

export default function FixpointAudit() {
  return (
    <Prototype modes={modes}>
      <FixpointAuditContent />
    </Prototype>
  );
}
