import { describe, expect, it } from "vitest";
import { needsSelection, tileQuery, tileTitle } from "./dashboardV2";

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
  title_unselected_pl: "Ludność województwa",
  title_unselected_en: "Voivodeship population",
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
  it("replaces '$selected' with the area's name", () => {
    expect(tileTitle(SELECTED, "pl", "MAZOWIECKIE")).toBe("Mazowieckie: ludność");
    expect(tileTitle(SELECTED, "en", "MAZOWIECKIE")).toBe("Mazowieckie: population");
  });

  it("uses the unselected title before a selection, in each language", () => {
    expect(tileTitle(SELECTED, "pl", null)).toBe("Ludność województwa");
    expect(tileTitle(SELECTED, "en", null)).toBe("Voivodeship population");
  });

  it("falls back to '…' for a '$selected' title without an unselected title", () => {
    const bare = { title_pl: SELECTED.title_pl, title_en: SELECTED.title_en };
    expect(tileTitle(bare, "en", null)).toBe("…: population");
  });

  it("keeps a title without '$selected' as it is", () => {
    expect(tileTitle(UNEMPLOYMENT, "en", null)).toBe(UNEMPLOYMENT.title_en);
    expect(tileTitle(UNEMPLOYMENT, "pl", "MAZOWIECKIE")).toBe(UNEMPLOYMENT.title_pl);
  });
});

describe("needsSelection", () => {
  it("is true only for a view that uses '$selected'", () => {
    expect(needsSelection(SELECTED)).toBe(true);
    expect(needsSelection(UNEMPLOYMENT)).toBe(false);
    expect(needsSelection(FX)).toBe(false);
  });
});
