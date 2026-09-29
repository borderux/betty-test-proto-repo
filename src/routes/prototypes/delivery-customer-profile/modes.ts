import type { Mode } from "../../modes";

export const modes: Mode[] = [
  {
    id: 1,
    name: "Default",
    description: "Customer profile loads normally with sample data.",
  },
  {
    id: 2,
    name: "Not found",
    description: "Customer ID does not exist \u2014 shows 404 not found.",
  },
  {
    id: 3,
    name: "API error",
    description: "The API call fails with a 500 server error.",
  },
]
