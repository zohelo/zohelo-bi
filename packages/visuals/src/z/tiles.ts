// The 16-voivodeship tile grid of the tile map (design template kit: Kartogram kafelkowy). Keys follow the data
// layer's geography keys (PL02…PL32); col/row place each tile on a 4 × 5 grid that keeps neighbours together.

import type { ZSeries } from "./types";

export type VoivodeshipTile = { key: string; abbr: string; name_pl: string; name_en: string; col: number; row: number };

export const VOIVODESHIP_TILES: VoivodeshipTile[] = [
  { key: "PL22", abbr: "PM", name_pl: "pomorskie", name_en: "Pomerania", col: 1, row: 0 },
  { key: "PL28", abbr: "WM", name_pl: "warmińsko-mazurskie", name_en: "Warmia-Masuria", col: 2, row: 0 },
  { key: "PL20", abbr: "PD", name_pl: "podlaskie", name_en: "Podlaskie", col: 3, row: 0 },
  { key: "PL32", abbr: "ZP", name_pl: "zachodniopomorskie", name_en: "West Pomerania", col: 0, row: 1 },
  { key: "PL04", abbr: "KP", name_pl: "kujawsko-pomorskie", name_en: "Kuyavia-Pomerania", col: 1, row: 1 },
  { key: "PL14", abbr: "MZ", name_pl: "mazowieckie", name_en: "Masovia", col: 2, row: 1 },
  { key: "PL08", abbr: "LB", name_pl: "lubuskie", name_en: "Lubusz", col: 0, row: 2 },
  { key: "PL30", abbr: "WP", name_pl: "wielkopolskie", name_en: "Greater Poland", col: 1, row: 2 },
  { key: "PL10", abbr: "ŁD", name_pl: "łódzkie", name_en: "Łódź", col: 2, row: 2 },
  { key: "PL06", abbr: "LU", name_pl: "lubelskie", name_en: "Lublin", col: 3, row: 2 },
  { key: "PL02", abbr: "DS", name_pl: "dolnośląskie", name_en: "Lower Silesia", col: 0, row: 3 },
  { key: "PL16", abbr: "OP", name_pl: "opolskie", name_en: "Opole", col: 1, row: 3 },
  { key: "PL26", abbr: "ŚK", name_pl: "świętokrzyskie", name_en: "Holy Cross", col: 2, row: 3 },
  { key: "PL24", abbr: "ŚL", name_pl: "śląskie", name_en: "Silesia", col: 1, row: 4 },
  { key: "PL12", abbr: "MP", name_pl: "małopolskie", name_en: "Lesser Poland", col: 2, row: 4 },
  { key: "PL18", abbr: "PK", name_pl: "podkarpackie", name_en: "Subcarpathia", col: 3, row: 4 },
];

/** Geography key of a point/series key: "PL14" and "PL14|gus|total" both give "PL14". */
export function geoKeyOf(x: string): string {
  return x.split("|")[0]!;
}

/** Values by geography key for a tile map: `tileMapSeries({ PL14: 3.6, … }, "Stopa bezrobocia")`. */
export function tileMapSeries(values: Record<string, number | null | undefined>, label: string, id = "value"): ZSeries {
  return {
    id,
    label,
    points: VOIVODESHIP_TILES.map((t) => ({ x: t.key, y: values[t.key] ?? null })),
  };
}

export function tileValues(series: ZSeries | undefined): Map<string, number | null> {
  const m = new Map<string, number | null>();
  for (const p of series?.points ?? []) m.set(geoKeyOf(p.x), p.y);
  return m;
}
