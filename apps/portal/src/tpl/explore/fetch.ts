// Series in a period window. The full history is requested and the window cut here, because the sample
// provider's noise depends on the requested range (the same period gets another value when `from` moves);
// cutting client-side keeps every number identical across the explorer, the indicator page and the catalogue.
// Remove once the provider generates each period independently of the query (see the hand-off report).

import { data, type Series, type SeriesQuery } from "../../data";

export function inWindow(period: string, from?: string, to?: string): boolean {
  return (!from || period.slice(0, from.length) >= from) && (!to || period.slice(0, to.length) <= to);
}

export function sliceSeries(series: Series[], from?: string, to?: string): Series[] {
  return series.map((s) => ({ ...s, points: s.points.filter((p) => inWindow(p.period, from, to)) }));
}

export async function seriesWindow(kpiKey: string, q: SeriesQuery = {}): Promise<Series[]> {
  const { from, to, ...rest } = q;
  return sliceSeries(await data.series(kpiKey, rest), from, to);
}
