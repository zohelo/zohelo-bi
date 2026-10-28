import { describe, expect, it } from "vitest";
import { relatedKpis, type RelatedItem } from "./index";

const items: RelatedItem[] = [
  { kpi_key: "hicp", name_pl: "HICP", name_en: "HICP inflation", subgroup_key: "s1" },
  { kpi_key: "cpi", name_pl: "Inflacja CPI", name_en: "CPI inflation", subgroup_key: "s1" },
  { kpi_key: "cpi_core", name_pl: "Inflacja bazowa", name_en: "Core inflation", subgroup_key: "s1" },
  { kpi_key: "gdp", name_pl: "PKB", name_en: "GDP", subgroup_key: "s2" },
];

describe("relatedKpis", () => {
  it("lists the other KPIs of the subgroup by English name", () => {
    expect(relatedKpis(items, "cpi").map((k) => k.kpi_key)).toEqual(["cpi_core", "hicp"]);
  });

  it("is empty for an unknown key and honours the limit", () => {
    expect(relatedKpis(items, "nope")).toEqual([]);
    expect(relatedKpis(items, "cpi", 1).map((k) => k.kpi_key)).toEqual(["cpi_core"]);
  });
});
