import type { Mode } from "../../modes";

/**
 * This prototype's modes — each swaps in a different set of handlers for
 * `/api/worklist` (see `index.tsx` and `src/api/worklist/`).
 */
export const modes: Mode[] = [
  {
    id: 1,
    name: "Default",
    description:
      "Eighteen issues load, and a triage decision on one saves successfully.",
  },
  {
    id: 2,
    name: "Nothing found",
    description:
      "GET /api/worklist returns an empty list — the screen says it found nothing, which is different from failing.",
  },
  {
    id: 3,
    name: "Load fails",
    description:
      "GET /api/worklist returns a 500 — the screen shows an error, worded differently from the empty case.",
  },
  {
    id: 4,
    name: "Bad data",
    description:
      "GET /api/worklist returns rows that break the schema — missing titles, an unknown status, a cost sent as a string, an unparseable date.",
  },
  {
    id: 5,
    name: "Saving fails",
    description:
      "The list loads normally, but saving a triage decision (PATCH /api/worklist/:id) returns a 500.",
  },
];
