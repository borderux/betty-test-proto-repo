import type { Mode } from "../../modes";

export const modes: Mode[] = [
  {
    id: 1,
    name: "Default",
    description: "Loads normally with the 15 seeded claims.",
  },
  {
    id: 2,
    name: "Empty",
    description: "No claims in audit — shows the empty state.",
  },
  {
    id: 3,
    name: "API error",
    description: "The API call fails with a 500.",
  },
];
