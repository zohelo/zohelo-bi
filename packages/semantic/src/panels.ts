// Small multiples cap at 16 panels: the explorer cuts the rows to the first 16 panel values (Polish
// collation) before calling smallMultiplesSpec, and tells the user how many were hidden.

import { NULL_KEY } from "./pivot";

export const MAX_PANELS = 16;
export type PanelCut<T> = { rows: T[]; panels: string[]; hidden: number };

export function cutPanels<T extends Record<string, unknown>>(rows: T[], panel: string, max = MAX_PANELS): PanelCut<T> {
  const key = (row: T) => (row[panel] == null ? NULL_KEY : String(row[panel]));
  const distinct = [...new Set(rows.map(key))].sort(new Intl.Collator("pl").compare);
  const panels = distinct.slice(0, max);
  const kept = new Set(panels);
  return { rows: rows.filter((r) => kept.has(key(r))), panels, hidden: distinct.length - panels.length };
}

export function panelsMessage(cut: { panels: string[]; hidden: number }): string | null {
  if (cut.hidden === 0) return null;
  return `Showing ${cut.panels.length} of ${cut.panels.length + cut.hidden} panels. Narrow a filter to see the rest.`;
}
