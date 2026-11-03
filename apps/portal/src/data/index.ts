// The one data entry point. VITE_DATA_MODE=dummy (the design template deploy) uses sample data; anything
// else uses the live query API. Pages import `data` and never call the API directly.

import { dummy } from "./dummy";
import { live } from "./live";
import type { DataProvider } from "./types";

export const data: DataProvider = import.meta.env.VITE_DATA_MODE === "dummy" ? dummy : live;
export * from "./types";
export { GEOGRAPHIES, periods } from "./dummy";
