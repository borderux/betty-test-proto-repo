/**
 * Mock data for the Fixpoint Auditor Workflow prototype.
 *
 * Models the auditor's slice of fixpoint.db: claims in (or recently out of)
 * In audit, plus the supporting codes, rule checks, return items and event
 * history each screen needs. Field names are the prototype's, not a build
 * contract (per the PRD).
 */

export const description =
  "Fixpoint auditor workflow: claims, codes, rule checks, return items and claim events for the audit queue, claim review, resubmission, returned and appeals screens.";

export type ClaimState = "In audit" | "Closed" | "Returned" | "Denied";

export type ReviewReason =
  | "High value"
  | "Random sample"
  | "Repeat unit"
  | "Standard review"
  | "Fast-track"
  | "Unclassified";

export type QcType = "QC sign-off" | "Technician attestation";

export type AppealStatus = "none" | "open" | "overturned" | "upheld";

export type ActorType = "human" | "system";

export interface CodeEntry {
  code: string;
  type: "symptom" | "cause" | "correction" | "return" | "denial";
  label: string;
  description: string;
}

export interface PartLine {
  part: string;
  quantity: number;
  received_date: string; // ISO date
}

export interface RuleCheck {
  claim_id: string;
  rule: "Evidence" | "Core return" | "Parts";
  result: "pass" | "fail";
  detail: string;
}

export interface ReturnItem {
  claim_id: string;
  round: number;
  code: string; // references CodeEntry.code, type "return"
  auditor_note?: string;
  addressed: boolean;
  shop_response?: string;
}

export interface ClaimEvent {
  claim_id: string;
  at: string; // ISO datetime
  from_state: ClaimState | "Submitted" | null;
  to_state: ClaimState;
  actor: string;
  actor_type: ActorType;
  note?: string;
}

export interface UnitHistoryEntry {
  claim_id: string;
  date: string;
  symptom_code: string;
  cause_code: string;
  correction_code: string;
  amount: number;
  state: ClaimState;
}

export interface Claim {
  claim_id: string;
  state: ClaimState;
  shop: string;
  brand: "Corvell" | "Halvorsen";
  amount: number;
  unit_serial: string;
  repair_date: string; // ISO date
  submission_deadline: string; // ISO date, 30 days from repair_date unless late intake
  late_intake: boolean;
  qc_type: QcType;
  technician: string;
  entered_by: string;
  migrated_from_legacy: boolean;
  legacy_label?: string;
  legacy_mapping_note?: string;

  review_reason: ReviewReason;
  review_reason_detail: string;

  symptom_code: string;
  cause_code: string;
  correction_code: string;
  parts: PartLine[];

  reviewer: string | null;
  reviewer_claimed_at: string | null;

  resubmission_count: number;
  returned_at: string | null;

  denial_code: string | null;
  decision_message: string | null;
  appeal_status: AppealStatus;
  appeal_opened_at: string | null;

  next_actor: "Halvorsen" | "Shop" | "None";

  unit_history: UnitHistoryEntry[];
}

export const CONFIG = {
  deadlineWarningDays: 7,
  returnedEscalationDays: 14,
  submissionWindowDays: 30,
  standardReviewMin: 50,
  standardReviewMax: 199,
};

/** Codes referenced by the seed claims, each with a plain-language description (FR-38). */
export const codes: CodeEntry[] = [
  { code: "SYM-104", type: "symptom", label: "No start", description: "Vehicle will not start or crank." },
  { code: "SYM-212", type: "symptom", label: "Warning light", description: "Dashboard warning light illuminated." },
  { code: "SYM-330", type: "symptom", label: "Fluid leak", description: "Visible fluid leak under the unit." },
  { code: "SYM-441", type: "symptom", label: "Unusual noise", description: "Grinding or knocking noise during operation." },
  { code: "CAU-501", type: "cause", label: "Worn component", description: "Component failed from normal wear." },
  { code: "CAU-512", type: "cause", label: "Manufacturing defect", description: "Part failed due to a manufacturing defect." },
  { code: "CAU-530", type: "cause", label: "Improper prior repair", description: "A previous repair was not performed to spec." },
  { code: "COR-601", type: "correction", label: "Part replaced", description: "Failed part was replaced with a new unit." },
  { code: "COR-615", type: "correction", label: "Component rebuilt", description: "Component was rebuilt in place." },
  { code: "COR-620", type: "correction", label: "Fluid and seal service", description: "Fluid was replaced and seals renewed." },
  { code: "RET-701", type: "return", label: "Missing photo evidence", description: "Photo evidence of the failed part was not included." },
  { code: "RET-702", type: "return", label: "Missing core return", description: "The failed core part was not returned." },
  { code: "RET-703", type: "return", label: "Incomplete parts list", description: "One or more part lines are missing quantity or date." },
  { code: "RET-704", type: "return", label: "Mismatched labor time", description: "Labor time does not match the correction code's standard." },
  { code: "DEN-801", type: "denial", label: "Outside warranty window", description: "Repair date falls outside the covered warranty period." },
  { code: "DEN-802", type: "denial", label: "Pre-existing condition", description: "Evidence shows the condition predates the warranty start." },
];

export function codeDetail(code: string) {
  const c = codes.find((c) => c.code === code);
  return c ? (c.label + " — " + c.description) : code;
}

/**
 * 15 seed claims per the PRD's seed table — one row per numbered scenario,
 * each with a distinct shop, brand and amount so grouping/filtering show up.
 */
export const claims: Claim[] = [
  {
    claim_id: "CLM-1001", state: "In audit", shop: "Redline Collision", brand: "Corvell", amount: 2450.0,
    unit_serial: "UN-88213", repair_date: "2026-09-05", submission_deadline: "2026-10-05", late_intake: false,
    qc_type: "QC sign-off", technician: "M. Alvarez", entered_by: "D. Ruiz", migrated_from_legacy: false,
    review_reason: "High value", review_reason_detail: "Claim amount exceeds the high-value threshold; full parts and evidence review required.",
    symptom_code: "SYM-330", cause_code: "CAU-512", correction_code: "COR-601",
    parts: [{ part: "Transmission assembly", quantity: 1, received_date: "2026-09-04" }, { part: "Seal kit", quantity: 1, received_date: "2026-09-04" }],
    reviewer: null, reviewer_claimed_at: null, resubmission_count: 0, returned_at: null,
    denial_code: null, decision_message: null, appeal_status: "none", appeal_opened_at: null,
    next_actor: "Halvorsen", unit_history: [],
  },
  {
    claim_id: "CLM-1002", state: "In audit", shop: "Summit Auto Repair", brand: "Halvorsen", amount: 340.0,
    unit_serial: "UN-77410", repair_date: "2026-09-10", submission_deadline: "2026-10-10", late_intake: false,
    qc_type: "QC sign-off", technician: "R. Okafor", entered_by: "R. Okafor", migrated_from_legacy: false,
    review_reason: "Random sample", review_reason_detail: "Randomly selected; not flagged for a specific issue.",
    symptom_code: "SYM-212", cause_code: "CAU-501", correction_code: "COR-615",
    parts: [{ part: "Sensor module", quantity: 1, received_date: "2026-09-09" }],
    reviewer: null, reviewer_claimed_at: null, resubmission_count: 0, returned_at: null,
    denial_code: null, decision_message: null, appeal_status: "none", appeal_opened_at: null,
    next_actor: "Halvorsen", unit_history: [],
  },
  {
    claim_id: "CLM-1003", state: "In audit", shop: "Redline Collision", brand: "Corvell", amount: 610.0,
    unit_serial: "UN-55120", repair_date: "2026-09-12", submission_deadline: "2026-10-12", late_intake: false,
    qc_type: "QC sign-off", technician: "M. Alvarez", entered_by: "D. Ruiz", migrated_from_legacy: false,
    review_reason: "Repeat unit", review_reason_detail: "This unit has had 2 prior claims.",
    symptom_code: "SYM-441", cause_code: "CAU-530", correction_code: "COR-615",
    parts: [{ part: "Bearing set", quantity: 1, received_date: "2026-09-11" }],
    reviewer: null, reviewer_claimed_at: null, resubmission_count: 0, returned_at: null,
    denial_code: null, decision_message: null, appeal_status: "none", appeal_opened_at: null,
    next_actor: "Halvorsen",
    unit_history: [
      { claim_id: "CLM-0811", date: "2026-03-02", symptom_code: "SYM-441", cause_code: "CAU-501", correction_code: "COR-615", amount: 420.0, state: "Closed" },
      { claim_id: "CLM-0944", date: "2026-06-18", symptom_code: "SYM-441", cause_code: "CAU-530", correction_code: "COR-601", amount: 580.0, state: "Closed" },
    ],
  },
  {
    claim_id: "CLM-1004", state: "In audit", shop: "Valley Motorworks", brand: "Corvell", amount: 120.0,
    unit_serial: "UN-33991", repair_date: "2026-09-15", submission_deadline: "2026-10-15", late_intake: false,
    qc_type: "QC sign-off", technician: "P. Nguyen", entered_by: "P. Nguyen", migrated_from_legacy: false,
    review_reason: "Standard review", review_reason_detail: "Amount falls in the standard review range ($50 to $199).",
    symptom_code: "SYM-212", cause_code: "CAU-501", correction_code: "COR-601",
    parts: [{ part: "Relay", quantity: 2, received_date: "2026-09-14" }],
    reviewer: null, reviewer_claimed_at: null, resubmission_count: 0, returned_at: null,
    denial_code: null, decision_message: null, appeal_status: "none", appeal_opened_at: null,
    next_actor: "Halvorsen", unit_history: [],
  },
  {
    claim_id: "CLM-1005", state: "In audit", shop: "Northgate Auto", brand: "Halvorsen", amount: 85.0,
    unit_serial: "UN-12044", repair_date: "2026-09-18", submission_deadline: "2026-10-18", late_intake: false,
    qc_type: "QC sign-off", technician: "S. Blake", entered_by: "S. Blake", migrated_from_legacy: false,
    review_reason: "Fast-track", review_reason_detail: "Every rule met.",
    symptom_code: "SYM-212", cause_code: "CAU-501", correction_code: "COR-601",
    parts: [{ part: "Fuse", quantity: 1, received_date: "2026-09-17" }],
    reviewer: null, reviewer_claimed_at: null, resubmission_count: 0, returned_at: null,
    denial_code: null, decision_message: null, appeal_status: "none", appeal_opened_at: null,
    next_actor: "Halvorsen", unit_history: [],
  },
  {
    claim_id: "CLM-1006", state: "In audit", shop: "Eastside Garage", brand: "Corvell", amount: 95.0,
    unit_serial: "UN-90221", repair_date: "2026-09-19", submission_deadline: "2026-10-19", late_intake: false,
    qc_type: "QC sign-off", technician: "K. Dubois", entered_by: "K. Dubois", migrated_from_legacy: false,
    review_reason: "Fast-track", review_reason_detail: "One rule check failed; routed to standard review.",
    symptom_code: "SYM-330", cause_code: "CAU-512", correction_code: "COR-620",
    parts: [{ part: "Gasket", quantity: 1, received_date: "2026-09-18" }],
    reviewer: null, reviewer_claimed_at: null, resubmission_count: 0, returned_at: null,
    denial_code: null, decision_message: null, appeal_status: "none", appeal_opened_at: null,
    next_actor: "Halvorsen", unit_history: [],
  },
  {
    claim_id: "CLM-1007", state: "In audit", shop: "Mercer Street Auto", brand: "Halvorsen", amount: 780.0,
    unit_serial: "UN-66110", repair_date: "2026-08-20", submission_deadline: "2026-09-10", late_intake: true,
    qc_type: "QC sign-off", technician: "J. Farah", entered_by: "J. Farah", migrated_from_legacy: false,
    review_reason: "Standard review", review_reason_detail: "Amount falls in the standard review range; entered late relative to the repair date.",
    symptom_code: "SYM-104", cause_code: "CAU-501", correction_code: "COR-601",
    parts: [{ part: "Starter motor", quantity: 1, received_date: "2026-08-19" }],
    reviewer: null, reviewer_claimed_at: null, resubmission_count: 0, returned_at: null,
    denial_code: null, decision_message: null, appeal_status: "none", appeal_opened_at: null,
    next_actor: "Halvorsen", unit_history: [],
  },
  {
    claim_id: "CLM-1008", state: "In audit", shop: "Redline Collision", brand: "Corvell", amount: 430.0,
    unit_serial: "UN-20087", repair_date: "2026-09-02", submission_deadline: "2026-10-02", late_intake: false,
    qc_type: "QC sign-off", technician: "M. Alvarez", entered_by: "D. Ruiz", migrated_from_legacy: false,
    review_reason: "Standard review", review_reason_detail: "Amount falls in the standard review range.",
    symptom_code: "SYM-441", cause_code: "CAU-501", correction_code: "COR-615",
    parts: [{ part: "CV joint", quantity: 1, received_date: "2026-09-01" }],
    reviewer: null, reviewer_claimed_at: null, resubmission_count: 0, returned_at: null,
    denial_code: null, decision_message: null, appeal_status: "none", appeal_opened_at: null,
    next_actor: "Halvorsen", unit_history: [],
  },
  {
    claim_id: "CLM-1009", state: "In audit", shop: "Coastal Repair Co.", brand: "Corvell", amount: 310.0,
    unit_serial: "UN-41029", repair_date: "2026-06-01", submission_deadline: "2026-07-01", late_intake: false,
    qc_type: "QC sign-off", technician: "L. Whitfield", entered_by: "L. Whitfield", migrated_from_legacy: true,
    legacy_label: "AUDIT-HOLD",
    legacy_mapping_note: "Legacy status \"AUDIT-HOLD\" covered both In audit and Returned; mapped to In audit because the claim had not yet gone back to the shop.",
    review_reason: "Standard review", review_reason_detail: "Amount falls in the standard review range; migrated from the legacy system.",
    symptom_code: "SYM-330", cause_code: "CAU-530", correction_code: "COR-620",
    parts: [{ part: "Radiator", quantity: 1, received_date: "2026-05-31" }],
    reviewer: null, reviewer_claimed_at: null, resubmission_count: 0, returned_at: null,
    denial_code: null, decision_message: null, appeal_status: "none", appeal_opened_at: null,
    next_actor: "Halvorsen", unit_history: [],
  },
  {
    claim_id: "CLM-1010", state: "In audit", shop: "Pinehill Auto (small shop)", brand: "Halvorsen", amount: 150.0,
    unit_serial: "UN-70033", repair_date: "2026-09-16", submission_deadline: "2026-10-16", late_intake: false,
    qc_type: "Technician attestation", technician: "T. Greer", entered_by: "T. Greer", migrated_from_legacy: false,
    review_reason: "Standard review", review_reason_detail: "Amount falls in the standard review range; shop has no QC person on staff.",
    symptom_code: "SYM-212", cause_code: "CAU-501", correction_code: "COR-601",
    parts: [{ part: "Alternator", quantity: 1, received_date: "2026-09-15" }],
    reviewer: null, reviewer_claimed_at: null, resubmission_count: 0, returned_at: null,
    denial_code: null, decision_message: null, appeal_status: "none", appeal_opened_at: null,
    next_actor: "Halvorsen", unit_history: [],
  },
  {
    claim_id: "CLM-1011", state: "In audit", shop: "Ferro Auto Group", brand: "Corvell", amount: 990.0,
    unit_serial: "UN-58822", repair_date: "2026-09-08", submission_deadline: "2026-10-08", late_intake: false,
    qc_type: "QC sign-off", technician: "A. Petrov", entered_by: "A. Petrov", migrated_from_legacy: false,
    review_reason: "High value", review_reason_detail: "Claim amount exceeds the high-value threshold; full parts and evidence review required.",
    symptom_code: "SYM-330", cause_code: "CAU-512", correction_code: "COR-601",
    parts: [{ part: "Engine block", quantity: 1, received_date: "2026-09-07" }],
    reviewer: "J. Mills", reviewer_claimed_at: "2026-09-29T14:12:00Z", resubmission_count: 0, returned_at: null,
    denial_code: null, decision_message: null, appeal_status: "none", appeal_opened_at: null,
    next_actor: "Halvorsen", unit_history: [],
  },
  {
    claim_id: "CLM-1012", state: "In audit", shop: "Summit Auto Repair", brand: "Halvorsen", amount: 260.0,
    unit_serial: "UN-19945", repair_date: "2026-08-25", submission_deadline: "2026-09-24", late_intake: false,
    qc_type: "QC sign-off", technician: "R. Okafor", entered_by: "R. Okafor", migrated_from_legacy: false,
    review_reason: "Standard review", review_reason_detail: "Amount falls in the standard review range; returned once and resubmitted with every item addressed.",
    symptom_code: "SYM-441", cause_code: "CAU-530", correction_code: "COR-615",
    parts: [{ part: "Wheel bearing", quantity: 1, received_date: "2026-08-24" }],
    reviewer: null, reviewer_claimed_at: null, resubmission_count: 1, returned_at: "2026-09-20T09:00:00Z",
    denial_code: null, decision_message: null, appeal_status: "none", appeal_opened_at: null,
    next_actor: "Halvorsen", unit_history: [],
  },
  {
    claim_id: "CLM-1013", state: "Returned", shop: "Valley Motorworks", brand: "Corvell", amount: 540.0,
    unit_serial: "UN-83321", repair_date: "2026-08-10", submission_deadline: "2026-09-09", late_intake: false,
    qc_type: "QC sign-off", technician: "P. Nguyen", entered_by: "P. Nguyen", migrated_from_legacy: false,
    review_reason: "Standard review", review_reason_detail: "Amount falls in the standard review range.",
    symptom_code: "SYM-330", cause_code: "CAU-512", correction_code: "COR-620",
    parts: [{ part: "Water pump", quantity: 1, received_date: "2026-08-09" }],
    reviewer: null, reviewer_claimed_at: null, resubmission_count: 0, returned_at: "2026-09-14T11:30:00Z",
    denial_code: null, decision_message: "Needs your fix, not denied. Missing core return for the failed water pump.",
    appeal_status: "none", appeal_opened_at: null,
    next_actor: "Shop", unit_history: [],
  },
  {
    claim_id: "CLM-1014", state: "Denied", shop: "Coastal Repair Co.", brand: "Corvell", amount: 220.0,
    unit_serial: "UN-10456", repair_date: "2026-04-01", submission_deadline: "2026-05-01", late_intake: false,
    qc_type: "QC sign-off", technician: "L. Whitfield", entered_by: "L. Whitfield", migrated_from_legacy: false,
    review_reason: "Standard review", review_reason_detail: "Amount falls in the standard review range.",
    symptom_code: "SYM-104", cause_code: "CAU-530", correction_code: "COR-601",
    parts: [{ part: "Ignition switch", quantity: 1, received_date: "2026-03-31" }],
    reviewer: null, reviewer_claimed_at: null, resubmission_count: 0, returned_at: null,
    denial_code: "DEN-801", decision_message: "Repair date falls outside the covered warranty period, so this claim was denied.",
    appeal_status: "open", appeal_opened_at: "2026-09-22T10:00:00Z",
    next_actor: "None", unit_history: [],
  },
  {
    claim_id: "CLM-1015", state: "Denied", shop: "Ferro Auto Group", brand: "Corvell", amount: 175.0,
    unit_serial: "UN-30987", repair_date: "2026-05-15", submission_deadline: "2026-06-14", late_intake: false,
    qc_type: "QC sign-off", technician: "A. Petrov", entered_by: "A. Petrov", migrated_from_legacy: false,
    review_reason: "Standard review", review_reason_detail: "Amount falls in the standard review range.",
    symptom_code: "SYM-212", cause_code: "CAU-530", correction_code: "COR-615",
    parts: [{ part: "Oxygen sensor", quantity: 1, received_date: "2026-05-14" }],
    reviewer: null, reviewer_claimed_at: null, resubmission_count: 0, returned_at: null,
    denial_code: "DEN-802", decision_message: "Evidence shows the condition predates the warranty start, so this claim was denied.",
    appeal_status: "none", appeal_opened_at: null,
    next_actor: "None", unit_history: [],
  },
];

/** Rule checks: evidence, core return and parts rows per claim. */
export const ruleChecks: RuleCheck[] = claims.flatMap((c): RuleCheck[] => {
  if (c.claim_id === "CLM-1005") {
    return [
      { claim_id: c.claim_id, rule: "Evidence", result: "pass", detail: "Photo evidence present for the failed part." },
      { claim_id: c.claim_id, rule: "Core return", result: "pass", detail: "Failed core returned and logged." },
      { claim_id: c.claim_id, rule: "Parts", result: "pass", detail: "Parts list matches the correction code." },
    ];
  }
  if (c.claim_id === "CLM-1006") {
    return [
      { claim_id: c.claim_id, rule: "Evidence", result: "fail", detail: "No photo evidence attached for the gasket failure." },
      { claim_id: c.claim_id, rule: "Core return", result: "pass", detail: "Failed core returned and logged." },
      { claim_id: c.claim_id, rule: "Parts", result: "pass", detail: "Parts list matches the correction code." },
    ];
  }
  return [
    { claim_id: c.claim_id, rule: "Evidence", result: "pass", detail: "Photo evidence present for the failed part." },
    { claim_id: c.claim_id, rule: "Core return", result: c.claim_id === "CLM-1013" ? "fail" : "pass", detail: c.claim_id === "CLM-1013" ? "Failed core not returned." : "Failed core returned and logged." },
    { claim_id: c.claim_id, rule: "Parts", result: "pass", detail: "Parts list matches the correction code." },
  ];
});

/** Return items: four for claim 12's resubmission round, plus claim 13's open round. */
export const returnItems: ReturnItem[] = [
  { claim_id: "CLM-1012", round: 1, code: "RET-701", auditor_note: "Include a clear photo of the failed bearing.", addressed: true, shop_response: "Added photo taken at teardown." },
  { claim_id: "CLM-1012", round: 1, code: "RET-702", auditor_note: "Core was not received.", addressed: true, shop_response: "Shipped core back via the return label." },
  { claim_id: "CLM-1012", round: 1, code: "RET-703", auditor_note: "Parts line is missing a received date.", addressed: true, shop_response: "Added the received date." },
  { claim_id: "CLM-1012", round: 1, code: "RET-704", auditor_note: "Labor time looks high for this correction.", addressed: true, shop_response: "Corrected the labor time entry." },
  { claim_id: "CLM-1013", round: 1, code: "RET-702", auditor_note: "Missing core return for the failed water pump.", addressed: false },
];

/** Claim events: realistic history per claim, including the move to In audit. */
export const claimEvents: ClaimEvent[] = claims.flatMap((c): ClaimEvent[] => {
  const events: ClaimEvent[] = [
    { claim_id: c.claim_id, at: c.repair_date + "T09:00:00Z", from_state: null, to_state: "In audit", actor: c.entered_by, actor_type: "human", note: "Claim submitted." },
    { claim_id: c.claim_id, at: c.repair_date + "T09:05:00Z", from_state: "In audit", to_state: "In audit", actor: "system", actor_type: "system", note: "Routed to audit." },
  ];
  if (c.claim_id === "CLM-1006") {
    events.push({ claim_id: c.claim_id, at: c.repair_date + "T09:10:00Z", from_state: "In audit", to_state: "In audit", actor: "system", actor_type: "system", note: "Review reason updated from Fast-track to Standard review after a failing rule check." });
  }
  if (c.state === "Returned") {
    events.push({ claim_id: c.claim_id, at: c.returned_at as string, from_state: "In audit", to_state: "Returned", actor: "J. Mills", actor_type: "human", note: "Returned to shop." });
  }
  if (c.state === "Denied") {
    events.push({ claim_id: c.claim_id, at: c.submission_deadline + "T16:00:00Z", from_state: "In audit", to_state: "Denied", actor: "J. Mills", actor_type: "human", note: "Denied." });
    if (c.appeal_status === "open") {
      events.push({ claim_id: c.claim_id, at: c.appeal_opened_at as string, from_state: "Denied", to_state: "Denied", actor: c.shop, actor_type: "human", note: "Appeal opened." });
    }
  }
  if (c.claim_id === "CLM-1012") {
    events.push({ claim_id: c.claim_id, at: "2026-09-20T09:00:00Z", from_state: "In audit", to_state: "Returned", actor: "J. Mills", actor_type: "human", note: "Returned to shop, round 1." });
    events.push({ claim_id: c.claim_id, at: "2026-09-27T13:00:00Z", from_state: "Returned", to_state: "In audit", actor: "system", actor_type: "system", note: "Shop resubmitted; all return items addressed." });
  }
  return events;
});

/** Empty dataset — tests the empty state. */
export const emptyClaims: Claim[] = [];

/** Malformed dataset — deliberately doesn't match the schema; survive bad data. */
export const malformedClaims: unknown[] = [
  { claim_id: "CLM-9001", state: "In audit" },
  { claim_id: "CLM-9002", state: "In audit", amount: "not-a-number", review_reason: null, submission_deadline: "not-a-date" },
  { state: "In audit", shop: "No Claim Id Shop" },
];
