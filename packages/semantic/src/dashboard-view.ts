// Dashboard slicers → tile views and explorer links. A slicer overrides the same parameter in every
// tile's view (docs/dashboards.md): geography sets geography_name, period sets from and to
// (inclusive date_key prefixes such as 2015 or 2015-01). Pure functions.

export const SLICER_PARAMS = { geography: ["geography_name"], period: ["from", "to"] } as const;
export type Slicer = keyof typeof SLICER_PARAMS;
export type SlicerValues = Record<string, string>;

/** The slicers' parameters present (non-empty after trim) in the URL, trimmed, in slicer order. */
export function slicerValues(params: URLSearchParams, slicers: Slicer[]): SlicerValues {
  const values: SlicerValues = {};
  for (const slicer of slicers) {
    for (const name of SLICER_PARAMS[slicer]) {
      const v = params.get(name)?.trim();
      if (v) values[name] = v;
    }
  }
  return values;
}

/** The non-empty values as URL parameters, in insertion order. */
export function slicerParams(values: SlicerValues): URLSearchParams {
  return new URLSearchParams(Object.entries(values).filter(([, v]) => v !== ""));
}

/** A tile's view with every non-empty slicer value set (replacing the tile's own). */
export function mergeView(view: string, values: SlicerValues): string {
  const p = new URLSearchParams(view);
  for (const [k, v] of Object.entries(values)) if (v !== "") p.set(k, v);
  return p.toString();
}

/** The explorer link for a tile, with the slicer values merged into its view. */
export function tileExploreHref(tile: { kpi_key: string; view: string }, values: SlicerValues): string {
  return `/explore?${new URLSearchParams([["metric", tile.kpi_key], ...new URLSearchParams(mergeView(tile.view, values))]).toString()}`;
}
