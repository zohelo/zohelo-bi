import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { defaultState, exploreLink, normaliseState, parseExplore, serialiseExplore } from "./exploreState";

const cat = await dummy.catalog();
const hicp = cat.kpis.find((k) => k.kpi_key === "hicp_annual_rate")!;
const voivKpi = cat.kpis.find((k) => k.geo_levels.includes("voivodeship"))!;
const dimKpi = cat.kpis.find((k) => k.dimension_keys.length > 0)!;

describe("explorer URL state", () => {
  it("defaults to HICP for Poland and the EU-27 over the last ten years", () => {
    const s = parseExplore("", cat)!;
    expect(s).toMatchObject({
      kpi: "hicp_annual_rate",
      level: "country",
      areas: ["PL", "EU27"],
      sources: ["eurostat"],
      split: null,
      view: "line",
    });
    expect(s.to - s.from).toBe(10);
  });
  it("round-trips a full view", () => {
    const s = { ...defaultState(dimKpi, cat), split: dimKpi.dimension_keys[0]!, from: 2012, to: 2020, view: "bars" as const };
    const qs = serialiseExplore(s);
    expect(qs).toContain(`split=${dimKpi.dimension_keys[0]}`);
    expect(qs).toContain("geo=PL");
    expect(parseExplore(qs, cat)).toEqual(s);
  });
  it("reads voivodeships and the map", () => {
    const s = parseExplore(`?kpi=${voivKpi.kpi_key}&lvl=woj&geo=PL14,PL02,XX&view=map`, cat)!;
    expect(s.level).toBe("voivodeship");
    expect(s.areas).toEqual(["PL14", "PL02"]);
    expect(s.view).toBe("map");
  });
  it("repairs invalid parts", () => {
    const s = parseExplore("?kpi=nope&lvl=woj&src=xx&split=sex&from=1900&to=2999&view=map", cat)!;
    expect(s.kpi).toBe("hicp_annual_rate");
    expect(s.level).toBe("country"); // HICP has no voivodeship data
    expect(s.view).toBe("line"); // the map needs voivodeships
    expect(s.sources).toEqual([hicp.source_keys[0]]);
    expect(s.split).toBeNull();
    expect(s.from).toBe(Number(hicp.first_period.slice(0, 4)));
    expect(s.to).toBe(Number(hicp.last_period.slice(0, 4)));
  });
  it("swaps a reversed period and removes duplicate areas", () => {
    const s = normaliseState({ ...defaultState(hicp, cat), from: 2020, to: 2015, areas: ["PL", "PL", "DE"] }, hicp, cat);
    expect([s.from, s.to]).toEqual([2015, 2020]);
    expect(s.areas).toEqual(["PL", "DE"]);
  });
  it("builds an explorer link for an indicator", () => {
    expect(exploreLink(hicp, cat)).toMatch(
      /^\/explore\?kpi=hicp_annual_rate&lvl=kraj&geo=PL,EU27&src=eurostat&from=\d{4}&to=\d{4}&view=line$/,
    );
  });
});
