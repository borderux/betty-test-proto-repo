/**
 * What this dataset is for — shown by the data registry
 * (`src/data/index.ts`) so agents/designers can tell what a dataset is
 * without opening it.
 */
export const description =
  "Issues a monitoring system found in a small online retailer's operations, each with what it costs to leave alone, how much work it is, and how sure the system is — the dataset behind the Worklist prototype.";

/** Where a triaged issue has got to. One value per issue, shown as its badge. */
export type IssueStatus = "New" | "Checking" | "Queued" | "Dismissed";

/**
 * How sure the system is that the issue is real. Displayed as its own
 * column because every issue carries one — the point of the screen is that
 * the system admits what it does not know rather than reporting a single
 * accuracy score.
 */
export type Confidence = "High" | "Medium" | "Low";

/**
 * Rough size of the fix, as a bucket rather than a measured duration.
 * These are estimates a person would give, not clock values.
 */
export type Effort = "1 hour" | "Half a day" | "1 day" | "2 days" | "1 week";

/** One thing the system noticed that may need a person to act on it. */
export interface Issue {
  /** Stable identifier for the issue. */
  id: string;
  /** What was found, in one sentence. The column the reader scans. */
  title: string;
  /** Where this issue has got to in triage. */
  status: IssueStatus;
  /**
   * What leaving this alone costs per month, in whole currency units.
   * `null` where the system cannot estimate it — a real state, not a zero,
   * and the reason the headline figure is a floor rather than a total.
   */
  monthlyCost: number | null;
  /** Rough size of the fix. */
  effort: Effort;
  /** How sure the system is that this is real. */
  confidence: Confidence;
  /** Date-only (no time) — the day the system first saw this. */
  firstSeen: string;
  /** Which check produced this, so the reader can trace it to a source. */
  source: string;
  /** What the system actually observed. Shown in the detail modal. */
  observed: string[];
  /**
   * What the system is NOT sure about. Never empty — an issue with nothing
   * to caveat still says so, because a system that only admits doubt
   * sometimes is one whose silence cannot be read.
   */
  uncertainty: string;
}

/**
 * The normal-case dataset: eighteen open and triaged issues across a small
 * retailer's orders, stock, refunds and supplier data.
 */
export const worklist: Issue[] = [
  {
    id: "wl-1",
    title: "Nightly stock sync reports success while writing no rows",
    status: "New",
    monthlyCost: 3120,
    effort: "Half a day",
    confidence: "High",
    firstSeen: "2024-11-03",
    source: "Job outcome vs. rows written",
    observed: [
      "The sync job has exited 0 on all 41 of the last 41 nights.",
      "On 9 of those nights it wrote 0 rows.",
      "Stock levels on the storefront were last changed 9 days ago.",
    ],
    uncertainty:
      "A zero-row night is normal if nothing changed. We cannot tell those apart from failures without a change feed we do not have.",
  },
  {
    id: "wl-2",
    title: "Refunds past 60 days can only be issued by one person",
    status: "New",
    monthlyCost: 1840,
    effort: "1 day",
    confidence: "High",
    firstSeen: "2023-06-14",
    source: "Who completed each action",
    observed: [
      "All 63 refunds older than 60 days in the last year were completed by the same account.",
      "During a 3-week gap in that account's activity, 11 such refunds sat untouched.",
      "No written procedure exists for this case.",
    ],
    uncertainty:
      "Others may know how and simply not do it. We can see who acted, not who could have.",
  },
  {
    id: "wl-3",
    title: "Product codes in the supplier file do not match the storefront",
    status: "Checking",
    monthlyCost: 2450,
    effort: "2 days",
    confidence: "High",
    firstSeen: "2024-02-20",
    source: "Cross-system identifier match",
    observed: [
      "412 of 1,908 product codes appear in only one of the two systems.",
      "Of those, 96 differ only by a leading zero or a space.",
      "Reorder quantities for the 412 are calculated from the storefront alone.",
    ],
    uncertainty:
      "Some of the 412 are probably retired lines that should not match. We have no end-of-life flag to check against.",
  },
  {
    id: "wl-4",
    title: "Discount codes stay live after their campaign ends",
    status: "Queued",
    monthlyCost: 980,
    effort: "1 hour",
    confidence: "High",
    firstSeen: "2022-09-08",
    source: "Code use after end date",
    observed: [
      "17 codes past their stated end date were used in the last 90 days.",
      "They account for 1,204 orders.",
      "The oldest still-working code ended 2 years ago.",
    ],
    uncertainty:
      "Some may have been extended deliberately without the end date being updated.",
  },
  {
    id: "wl-5",
    title: "Returned stock is not deducted before the reorder runs",
    status: "New",
    monthlyCost: 2210,
    effort: "2 days",
    confidence: "Medium",
    firstSeen: "2023-11-27",
    source: "Reorder input vs. returns ledger",
    observed: [
      "The reorder calculation reads the sales table and not the returns table.",
      "Returns were 6.8% of orders over the last year.",
      "14 lines were reordered while returned units of the same line sat in the warehouse.",
    ],
    uncertainty:
      "Returned units may not be resaleable. We cannot see condition, so the real overstock is somewhere between 0 and the full 6.8%.",
  },
  {
    id: "wl-6",
    title: "Customer email list has not been deduplicated in two years",
    status: "New",
    monthlyCost: 640,
    effort: "Half a day",
    confidence: "High",
    firstSeen: "2023-01-15",
    source: "Exact and near-match address comparison",
    observed: [
      "3,417 addresses differ from another only by case or a trailing space.",
      "A further 208 differ only by a plus-suffix.",
      "Send volume is billed per address.",
    ],
    uncertainty:
      "Plus-suffix addresses can be deliberate and separate. Merging them is a judgment call, not a cleanup.",
  },
  {
    id: "wl-7",
    title: "Two suppliers are recorded under three different names",
    status: "Checking",
    monthlyCost: null,
    effort: "1 day",
    confidence: "Medium",
    firstSeen: "2024-05-02",
    source: "Supplier name and bank detail clustering",
    observed: [
      "Three supplier records share two sets of bank details.",
      "Spend is reported per record, so per-supplier totals are split.",
      "Volume discounts are agreed per supplier.",
    ],
    uncertainty:
      "We cannot price this. Whether split spend actually lost a discount tier depends on contract terms we cannot read.",
  },
  {
    id: "wl-8",
    title: "Shipping cost per order stopped being recorded in March",
    status: "New",
    monthlyCost: null,
    effort: "1 hour",
    confidence: "High",
    firstSeen: "2025-03-11",
    source: "Field population over time",
    observed: [
      "The shipping cost field was populated on 99.2% of orders before Mar 2025.",
      "Since then it is populated on 0%.",
      "Margin per order is calculated from it.",
    ],
    uncertainty:
      "We cannot price this, because the missing field is the one the price would be calculated from.",
  },
  {
    id: "wl-9",
    title: "Out-of-stock lines stay visible and take orders",
    status: "Queued",
    monthlyCost: 1560,
    effort: "Half a day",
    confidence: "High",
    firstSeen: "2024-08-19",
    source: "Orders against zero-stock lines",
    observed: [
      "228 orders in the last quarter were for lines showing zero stock.",
      "191 of those were later cancelled.",
      "Each cancellation is handled by hand.",
    ],
    uncertainty:
      "Some lines are drop-shipped and correctly show zero. We cannot tell which from stock data alone.",
  },
  {
    id: "wl-10",
    title: "Order totals disagree between the till and the storefront",
    status: "Checking",
    monthlyCost: 1330,
    effort: "2 days",
    confidence: "Medium",
    firstSeen: "2024-01-30",
    source: "Same-order total comparison",
    observed: [
      "1,046 orders appear in both systems with different totals.",
      "The gap is under 1.00 in 890 of them and over 20.00 in 24.",
      "The two figures are used in different reports.",
    ],
    uncertainty:
      "Rounding explains the small gaps. The 24 large ones look like a different cause we have not identified.",
  },
  {
    id: "wl-11",
    title: "Nobody is alerted when the payment provider rejects a batch",
    status: "New",
    monthlyCost: 2890,
    effort: "1 day",
    confidence: "High",
    firstSeen: "2024-06-25",
    source: "Rejected batches vs. notifications sent",
    observed: [
      "7 batches were rejected in the last 6 months.",
      "No notification was sent for any of them.",
      "Median time to notice was 4 days.",
    ],
    uncertainty:
      "Someone may be checking manually without leaving a trace we can see.",
  },
  {
    id: "wl-12",
    title: "Supplier lead times in the system are three years old",
    status: "New",
    monthlyCost: 1170,
    effort: "1 week",
    confidence: "Medium",
    firstSeen: "2022-04-12",
    source: "Recorded lead time vs. actual delivery",
    observed: [
      "Recorded lead times were last edited in 2022.",
      "Actual delivery is a median of 9 days longer.",
      "Reorder points are calculated from the recorded value.",
    ],
    uncertainty:
      "Delivery delays may be recent and temporary rather than a permanent shift.",
  },
  {
    id: "wl-13",
    title: "Product photos are missing on a tenth of live lines",
    status: "Queued",
    monthlyCost: 820,
    effort: "1 week",
    confidence: "High",
    firstSeen: "2023-08-04",
    source: "Image presence per live line",
    observed: [
      "196 of 1,908 live lines have no image.",
      "Those lines convert at roughly a third of the rate of lines with one.",
      "They have been live a median of 14 months.",
    ],
    uncertainty:
      "Lines without photos may be unpopular for other reasons. This is a correlation, not a cause.",
  },
  {
    id: "wl-14",
    title: "Address validation is skipped for orders over a threshold",
    status: "New",
    monthlyCost: 740,
    effort: "1 hour",
    confidence: "Low",
    firstSeen: "2025-01-22",
    source: "Validation calls vs. orders placed",
    observed: [
      "Orders above 500.00 skip the validation step.",
      "Failed deliveries are 2.1x more common in that group.",
      "The threshold is not documented anywhere we can find.",
    ],
    uncertainty:
      "Low confidence. Large orders may fail delivery more often for reasons that have nothing to do with the address check.",
  },
  {
    id: "wl-15",
    title: "The weekly sales report has been unopened since August",
    status: "Dismissed",
    monthlyCost: null,
    effort: "1 hour",
    confidence: "Medium",
    firstSeen: "2024-09-16",
    source: "Report open events",
    observed: [
      "The report has been generated every week for 14 months.",
      "It was last opened 13 months ago.",
      "It takes 40 minutes of compute to build.",
    ],
    uncertainty:
      "It may be read through a forwarded copy we cannot see open events for.",
  },
  {
    id: "wl-16",
    title: "Tax rate for one region was never updated after the change",
    status: "Queued",
    monthlyCost: 1990,
    effort: "1 hour",
    confidence: "High",
    firstSeen: "2024-04-01",
    source: "Applied rate vs. published rate",
    observed: [
      "The applied rate for one region is 0.5 points below the published rate.",
      "It has been applied to 2,046 orders.",
      "The published rate changed 17 months ago.",
    ],
    uncertainty:
      "A registered exemption could make the lower rate correct. We cannot see registration status.",
  },
  {
    id: "wl-17",
    title: "Abandoned basket emails stopped sending after a template edit",
    status: "Dismissed",
    monthlyCost: 1420,
    effort: "1 hour",
    confidence: "High",
    firstSeen: "2025-02-08",
    source: "Trigger events vs. messages sent",
    observed: [
      "The trigger has fired 4,180 times since Feb 2025.",
      "0 messages were sent.",
      "The template was edited the day before sending stopped.",
    ],
    uncertainty:
      "The edit and the stop are same-day, which is suggestive but not proof of cause.",
  },
  {
    id: "wl-18",
    title: "Warehouse stock counts are entered from a printed sheet",
    status: "Checking",
    monthlyCost: 1050,
    effort: "1 week",
    confidence: "Low",
    firstSeen: "2023-03-21",
    source: "Count entry timing and correction rate",
    observed: [
      "Counts are entered in batches, a median of 3 days after the count date.",
      "8.4% of entries are corrected within a week.",
      "Reorder decisions run daily against those counts.",
    ],
    uncertainty:
      "Low confidence. A correction may mean a miscount, a re-count, or a genuine stock movement — we cannot tell which.",
  },
];

/** Empty-case dataset: the fetch worked and found nothing to triage. */
export const emptyWorklist: Issue[] = [];

/**
 * Bad-data case: records that violate the `Issue` contract in the ways a
 * real feed does — a missing title, a status outside the union, a cost sent
 * as a string, a malformed date, and a missing `observed` array. Typed
 * `unknown[]` because they deliberately do not match the schema.
 */
export const malformedWorklist: unknown[] = [
  {
    id: "wl-bad-1",
    status: "New",
    monthlyCost: 100,
    effort: "1 hour",
    confidence: "High",
    firstSeen: "2024-01-01",
    source: "Unknown",
    observed: [],
    uncertainty: "",
  },
  {
    id: "wl-bad-2",
    title: "Status outside the known set",
    status: "Escalated",
    monthlyCost: 200,
    effort: "1 day",
    confidence: "High",
    firstSeen: "2024-02-01",
    source: "Unknown",
    observed: [],
    uncertainty: "",
  },
  {
    id: "wl-bad-3",
    title: "Cost arrived as a string",
    status: "New",
    monthlyCost: "1200",
    effort: "1 hour",
    confidence: "Medium",
    firstSeen: "2024-03-01",
    source: "Unknown",
    observed: [],
    uncertainty: "",
  },
  {
    id: "wl-bad-4",
    title: "First-seen date is not a date",
    status: "Checking",
    monthlyCost: 300,
    effort: "2 days",
    confidence: "Low",
    firstSeen: "not-a-date",
    source: "Unknown",
    observed: [],
    uncertainty: "",
  },
  {
    id: "wl-bad-5",
    title: "Detail arrays missing entirely",
    status: "Queued",
    monthlyCost: null,
    effort: "1 week",
    confidence: "High",
    firstSeen: "2024-05-01",
  },
];
