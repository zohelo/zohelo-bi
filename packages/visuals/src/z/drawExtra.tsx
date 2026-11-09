// Chart library v2 types (docs/chart-library-proposal.md): pie/donut, waffle, strip/beeswarm, fan, symbol map,
// Sankey, KPI card, sparkline, table. Each draws into the shared scene like the other draw* modules.

import type { Ctx, Scene } from "./scene";

/** Placeholder until the type is drawn: an empty scene of the default height. */
const todo = (c: Ctx): Scene => ({ height: c.H, els: [], stops: [], pick: "x" });

export const drawPie = todo;
export const drawWaffle = todo;
export const drawStrip = todo;
export const drawFan = todo;
export const drawSymbolMap = todo;
export const drawSankey = todo;
export const drawKpiCard = todo;
export const drawSparkline = todo;
export const drawTable = todo;
