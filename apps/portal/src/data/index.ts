// The one data entry point. Live data (the published contract v2 through the query API) unless the build sets
// VITE_DATA_MODE=dummy, which only local development, the UI suite and a hand-run preview may do: production
// (bi.zohelo.com) shows only published data, a missing KPI or file is "no data", never sample numbers (owner
// direction of 12 Nov 2026, decision O37). A production build refuses the sample mode (vite.config.ts) and
// ops/check-live-build.sh fails when the sample chunk is in the output. Sample builds say so on every page
// (footer "Dane przykładowe", catalog.sample).
// Pages import `data` and never call the API directly.
// The sample catalogue and its generator (dummy.ts, dummyCatalog.ts: about 160 kB) are a separate chunk, emitted
// only in sample mode (the mode is a build-time constant, so a live build drops the import).
// Topics follow the review switch (`?tematy=przeglad`, topicsReview.ts) in both modes.

import { live } from "./live";
import { reviewTopics, topicsReview } from "./topicsReview";
import type { DataProvider } from "./types";

let pending: Promise<DataProvider> | undefined;
const sample = () => (pending ??= import("./dummy").then((m) => m.dummy));

const lazySample: DataProvider = {
  mode: "dummy",
  catalog: async () => (await sample()).catalog(),
  series: async (kpiKey, query) => (await sample()).series(kpiKey, query),
  latest: async (kpiKey, geography) => (await sample()).latest(kpiKey, geography),
  calendar: async () => (await sample()).calendar(),
  topics: async () => (await sample()).topics(),
};

const base: DataProvider = import.meta.env.VITE_DATA_MODE === "dummy" ? lazySample : live;

export const data: DataProvider = { ...base, topics: () => (topicsReview() ? reviewTopics() : base.topics()) };
export * from "./types";
export { GEOGRAPHIES } from "./geographies";
export { topicsReview } from "./topicsReview";
