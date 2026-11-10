// The areas both providers know: Poland, its 16 voivodeships (TERYT codes), the EU countries and EU-27. The live
// provider maps the query API's geography names to these keys; the sample provider generates data for them.

import type { Geography } from "./types";

export const GEOGRAPHIES: Geography[] = [
  { key: "PL", name_pl: "Polska", name_en: "Poland", level: "country", eu: true },
  ...(
    [
      ["PL02", "dolnośląskie", "Lower Silesia"],
      ["PL04", "kujawsko-pomorskie", "Kuyavia-Pomerania"],
      ["PL06", "lubelskie", "Lublin"],
      ["PL08", "lubuskie", "Lubusz"],
      ["PL10", "łódzkie", "Łódź"],
      ["PL12", "małopolskie", "Lesser Poland"],
      ["PL14", "mazowieckie", "Masovia"],
      ["PL16", "opolskie", "Opole"],
      ["PL18", "podkarpackie", "Subcarpathia"],
      ["PL20", "podlaskie", "Podlaskie"],
      ["PL22", "pomorskie", "Pomerania"],
      ["PL24", "śląskie", "Silesia"],
      ["PL26", "świętokrzyskie", "Holy Cross"],
      ["PL28", "warmińsko-mazurskie", "Warmia-Masuria"],
      ["PL30", "wielkopolskie", "Greater Poland"],
      ["PL32", "zachodniopomorskie", "West Pomerania"],
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
