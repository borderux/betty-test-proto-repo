import { http, HttpResponse } from "msw";
import {
  worklist,
  emptyWorklist,
  malformedWorklist,
  type Issue,
  type IssueStatus,
} from "../../data/worklist";
import { DEFAULT_DELAY_MS, mockDelay } from "../delay";

/**
 * What this mock API is for — shown by the API registry
 * (`src/api/index.ts`) so agents/designers can tell what an API is without
 * opening it.
 */
export const description =
  "Serves the Worklist prototype's issues and records a triage decision on one, including scenarios where the list is empty, the load fails, the payload is malformed, or the decision fails to save.";

/**
 * In-memory copy of the dataset, mutated by `PATCH /api/worklist/:id` so a
 * triage decision shows up on the next `GET /api/worklist` — mimicking a
 * real backend. Resets whenever the page reloads.
 */
const store: Issue[] = worklist.map((issue) => ({ ...issue }));

function getWorklist(delayMs: number) {
  return http.get("/api/worklist", async () => {
    await mockDelay(delayMs);
    return HttpResponse.json<Issue[]>(store);
  });
}

function getWorklistEmpty(delayMs: number) {
  return http.get("/api/worklist", async () => {
    await mockDelay(delayMs);
    return HttpResponse.json<Issue[]>(emptyWorklist);
  });
}

function getWorklistError(delayMs: number) {
  return http.get("/api/worklist", async () => {
    await mockDelay(delayMs);
    return HttpResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  });
}

/** Returns a schema-violating 200, so the screen has to survive bad rows. */
function getWorklistMalformed(delayMs: number) {
  return http.get("/api/worklist", async () => {
    await mockDelay(delayMs);
    return HttpResponse.json(malformedWorklist);
  });
}

function updateIssue(delayMs: number) {
  return http.patch("/api/worklist/:id", async ({ params, request }) => {
    await mockDelay(delayMs);
    const updates = (await request.json()) as { status?: IssueStatus };
    const index = store.findIndex((issue) => issue.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    store[index] = { ...store[index], ...updates, id: store[index].id };
    return HttpResponse.json<Issue>(store[index]);
  });
}

function updateIssueError(delayMs: number) {
  return http.patch("/api/worklist/:id", async () => {
    await mockDelay(delayMs);
    return HttpResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  });
}

/**
 * Builds this API's scenarios with a shared artificial latency — defaults
 * to `DEFAULT_DELAY_MS` (1000ms). Pass a different value to make the delay
 * configurable per mode without touching the resolvers themselves.
 */
export function createHandlers(delayMs: number = DEFAULT_DELAY_MS) {
  return {
    /** Default scenario: the list loads and a triage decision saves. */
    handlers: [getWorklist(delayMs), updateIssue(delayMs)],
    /** The fetch works and finds nothing — distinct from a failure. */
    emptyHandlers: [getWorklistEmpty(delayMs), updateIssue(delayMs)],
    /** `GET /api/worklist` returns a 500, so the screen shows an error. */
    loadErrorHandlers: [getWorklistError(delayMs), updateIssue(delayMs)],
    /** `GET /api/worklist` returns rows that violate the schema. */
    malformedHandlers: [getWorklistMalformed(delayMs), updateIssue(delayMs)],
    /** The list loads, but saving a triage decision returns a 500. */
    submitErrorHandlers: [getWorklist(delayMs), updateIssueError(delayMs)],
  };
}

const defaultScenarios = createHandlers();

/** Registered in the mock worker by default — see `src/api/index.ts`. */
export const handlers = defaultScenarios.handlers;
export const emptyHandlers = defaultScenarios.emptyHandlers;
export const loadErrorHandlers = defaultScenarios.loadErrorHandlers;
export const malformedHandlers = defaultScenarios.malformedHandlers;
export const submitErrorHandlers = defaultScenarios.submitErrorHandlers;
