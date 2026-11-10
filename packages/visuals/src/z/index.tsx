// zohelo chart library: <ZChart type=… /> draws every chart type of the design template (Chart library);
// toTable gives the table view, legendItems/ZLegend the legend, the samples (one documented example per type and variant)
// are in ../samples.ts, imported as "@zohelo/visuals/samples" so that only the guide loads them.
export * from "./types";
export { ZChart, buildScene, DEFAULT_WIDTH, PHONE_WIDTH } from "./ZChart";
export { toTable, legendItems, ZLegend } from "./table";
export { PALETTE, seriesColor } from "./scene";
export { VOIVODESHIP_TILES, tileMapSeries, geoKeyOf, type VoivodeshipTile } from "./tiles";
export { fmtNum, fmtVal, fmtDiff, fmtSigned, fmtTick, periodLabel } from "./format";
export { POLAND_BOX, VOIVODESHIP_PATHS, VOIVODESHIP_CENTROIDS } from "./polandMap";
export { CHART_FAMILY, FAMILY_INFO } from "./families";
export { squarify, boxStats } from "./drawMore";
export * from "./library";
export type { ExtraType } from "./samplesExtra";
