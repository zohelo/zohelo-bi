// The one data entry point. VITE_DATA_MODE=dummy uses sample data; anything else uses the live query API.
// Pages import `data` and never call the API directly.
// The sample catalogue and its generator (dummy.ts, dummyCatalog.ts: about 160 kB) are a separate chunk,
// fetched on the first call in sample mode and never in live mode.

import { live } from "./live";
import type { DataProvider } from "./types";

let pending: Promise<DataProvider> | undefined;
const sample = () => (pending ??= import("./dummy").then((m) => m.dummy));

const lazySample: DataProvider = {
  mode: "dummy",
  catalog: async () => (await sample()).catalog(),
  series: async (kpiKey, query) => (await sample()).series(kpiKey, query),
  latest: async (kpiKey, geography) => (await sample()).latest(kpiKey, geography),
  topics: async () => (await sample()).topics(),
};

export const data: DataProvider = import.meta.env.VITE_DATA_MODE === "dummy" ? lazySample : live;
export * from "./types";
export { GEOGRAPHIES } from "./geographies";
