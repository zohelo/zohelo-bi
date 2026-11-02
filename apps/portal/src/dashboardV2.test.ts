import { describe, expect, it } from "vitest";
import { tileQuery, tileTitle } from "./dashboardV2";

// Tiles copied from dashboards/poland-overview.yaml.
const UNEMPLOYMENT = {
  title_pl: "Stopa bezrobocia (BAEL), Polska i sąsiedzi",
  title_en: "Unemployment rate (LFS), Poland and neighbours",
  kpi_key: "unemployment_rate",
  view: "rows=geography_name&cols=date_key&geography_level=country&source_system=eurostat&frequency=A&geography_name=Polska|Germany|Czechia|Slovak Republic|Lithuania",
};
const SELECTED = {
  title_pl: "$selected: ludność",
  title_en: "$selected: population",
  kpi_key: "population",
  view: "rows=source_system&cols=date_key&geography_level=wojewodztwo&geography_name=$selected",
};
const FX = {
  title_pl: "Kursy NBP (tabela A): EUR, USD",
  title_en: "NBP rates (table A): EUR, USD",
  kpi_key: "fx_rate",
  view: 'rows=breakdown_json&cols=date_key&breakdown_json={"currency":"EUR"}|{"currency":"USD"}',
};

describe("tileQuery", () => {
  it("turns the unemployment tile's view into filters, without rows and cols", () => {
    const q = tileQuery(UNEMPLOYMENT, {}, null)!;
    expect(q.metric.id).toBe("unemployment_rate");
    expect(q.filters).toEqual({
      source_system: ["eurostat"],
      geography_level: ["country"],
      frequency: ["A"],
      geography_name: ["Polska", "Germany", "Czechia", "Slovak Republic", "Lithuania"],
    });
    expect(q.from).toBeUndefined();
    expect(q.to).toBeUndefined();
  });

  it("needs a selection for a '$selected' tile", () => {
    expect(tileQuery(SELECTED, {}, null)).toBeNull();
    expect(tileQuery(SELECTED, {}, "MAZOWIECKIE")!.filters.geography_name).toEqual(["MAZOWIECKIE"]);
  });

  it("takes the period slicer's values", () => {
    const q = tileQuery(UNEMPLOYMENT, { from: "2015" }, null)!;
    expect(q.from).toBe("2015");
    expect(q.to).toBeUndefined();
  });

  it("keeps both currencies of the fx_rate tile and no source filter", () => {
    const q = tileQuery(FX, {}, null)!;
    expect(q.filters.breakdown_json).toEqual(['{"currency":"EUR"}', '{"currency":"USD"}']);
    expect(q.filters.source_system).toBeUndefined();
  });

  it("returns null for an unknown kpi_key", () => {
    expect(tileQuery({ kpi_key: "wages", view: "" }, {}, null)).toBeNull();
  });
});

describe("tileTitle", () => {
  it("replaces '$selected' with the area's name, or '…' without one", () => {
    expect(tileTitle(SELECTED, "pl", "MAZOWIECKIE")).toBe("Mazowieckie: ludność");
    expect(tileTitle(SELECTED, "en", null)).toBe("…: population");
    expect(tileTitle(UNEMPLOYMENT, "en", null)).toBe(UNEMPLOYMENT.title_en);
  });
});
