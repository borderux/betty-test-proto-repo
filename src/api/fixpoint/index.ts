/**
 * Mock API handlers for the Fixpoint auditor workflow.
 * Includes success case, error scenario, and empty scenario.
 */

import { http, HttpResponse } from "msw";
import { mockDelay, DEFAULT_DELAY_MS } from "../delay";
import {
  claims,
  emptyClaims,
  codes,
  ruleChecks,
  returnItems,
  claimEvents,
} from "../../data/fixpoint";

export const description =
  "API endpoints for the Fixpoint auditor workflow: list claims plus their codes, rule checks, return items and events.";

/**
 * Success case handlers — returns 200 with the seeded claims and supporting rows.
 */
export const handlers = [
  http.get("/api/fixpoint/claims", async () => {
    await mockDelay(DEFAULT_DELAY_MS);
    return HttpResponse.json({ claims, codes, ruleChecks, returnItems, claimEvents });
  }),
];

/**
 * Error scenario — API returns 500.
 */
export const errorHandlers = [
  http.get("/api/fixpoint/claims", async () => {
    await mockDelay(DEFAULT_DELAY_MS);
    return HttpResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }),
];

/**
 * Empty scenario — API returns 200 with no claims.
 */
export const emptyHandlers = [
  http.get("/api/fixpoint/claims", async () => {
    await mockDelay(DEFAULT_DELAY_MS);
    return HttpResponse.json({ claims: emptyClaims, codes, ruleChecks: [], returnItems: [], claimEvents: [] });
  }),
];
