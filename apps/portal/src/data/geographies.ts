// The areas both providers know, with the keys of the published contract v2 (zohelo-data docs/published.md):
// Poland, its 16 voivodeships as ISO 3166-2 codes (PL-02 dolnośląskie … PL-32 zachodniopomorskie, the TERC code
// after the hyphen), EU countries as ISO 3166-1 alpha-2 and the EU-27 aggregate EU27. Live data and sample data
// share this one key set. Before the contract the template wrote voivodeships without the hyphen (PL14): `geoKey`
// maps those old keys (bookmarks, saved views) to the contract's.

import type { Geography } from "./types";

export const GEOGRAPHIES: Geography[] = [
  { key: "PL", name_pl: "Polska", name_en: "Poland", level: "country", eu: true },
  ...(
    [
      ["PL-02", "dolnośląskie", "Lower Silesia"],
      ["PL-04", "kujawsko-pomorskie", "Kuyavia-Pomerania"],
      ["PL-06", "lubelskie", "Lublin"],
      ["PL-08", "lubuskie", "Lubusz"],
      ["PL-10", "łódzkie", "Łódź"],
      ["PL-12", "małopolskie", "Lesser Poland"],
      ["PL-14", "mazowieckie", "Masovia"],
      ["PL-16", "opolskie", "Opole"],
      ["PL-18", "podkarpackie", "Subcarpathia"],
      ["PL-20", "podlaskie", "Podlaskie"],
      ["PL-22", "pomorskie", "Pomerania"],
      ["PL-24", "śląskie", "Silesia"],
      ["PL-26", "świętokrzyskie", "Holy Cross"],
      ["PL-28", "warmińsko-mazurskie", "Warmia-Masuria"],
      ["PL-30", "wielkopolskie", "Greater Poland"],
      ["PL-32", "zachodniopomorskie", "West Pomerania"],
    ] as const
  ).map(([key, pl, en]) => ({ key, name_pl: pl, name_en: en, level: "voivodeship" as const, eu: false })),
  ...(
    [
      ["DE", "Niemcy", "Germany"],
      ["CZ", "Czechy", "Czechia"],
      ["SK", "Słowacja", "Slovakia"],
      ["HU", "Węgry", "Hungary"],
      ["LT", "Litwa", "Lithuania"],
      ["RO", "Rumunia", "Romania"],
      ["FR", "Francja", "France"],
      ["ES", "Hiszpania", "Spain"],
      ["IT", "Włochy", "Italy"],
      ["EU27", "UE-27", "EU-27"],
    ] as const
  ).map(([key, pl, en]) => ({ key, name_pl: pl, name_en: en, level: "country" as const, eu: true })),
];

/** Pre-contract voivodeship key (PL02 … PL32, even codes only: odd ones are NUTS codes) → contract key (PL-02 …). */
const OLD_VOIVODESHIP = /^PL(0[2468]|[12][02468]|3[02])$/;

/** The contract key for `key`: an old voivodeship key gains its hyphen, every other key is returned as is. */
export function geoKey(key: string): string {
  const m = OLD_VOIVODESHIP.exec(key);
  return m ? `PL-${m[1]}` : key;
}
