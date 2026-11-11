// The live provider against the contract v2 fixtures (packages/semantic/fixtures/v2, SOURCE.md there): the query
// API is replaced by a fetch that answers each /api/published/v2/… path with its fixture, as functions/api would.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import catalogV2 from "../../../../packages/semantic/fixtures/v2/catalog.json";
import latestV2 from "../../../../packages/semantic/fixtures/v2/latest.json";
import calendarV2 from "../../../../packages/semantic/fixtures/v2/calendar.json";
import hicp from "../../../../packages/semantic/fixtures/v2/kpi/hicp_annual_rate/series.json";
import unemployment from "../../../../packages/semantic/fixtures/v2/kpi/unemployment_lfs/series.json";
import population from "../../../../packages/semantic/fixtures/v2/kpi/population_total/series.json";
import type { DataProvider } from "./types";

const FILES: Record<string, unknown> = {
  "/api/published/v2/catalog": catalogV2,
  "/api/published/v2/latest": latestV2,
  "/api/published/v2/calendar": calendarV2,
  "/api/published/v2/kpi/hicp_annual_rate/series": hicp,
  "/api/published/v2/kpi/unemployment_lfs/series": unemployment,
  "/api/published/v2/kpi/population_total/series": population,
};

let live: DataProvider;
let fetch: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  // The API client memoises per URL: every case starts from a fresh module.
  vi.resetModules();
  fetch = vi.fn(async (url: string) =>
    url in FILES ? Response.json(FILES[url]) : Response.json({ error: `not published: ${url}` }, { status: 404 }),
  );
  vi.stubGlobal("fetch", fetch);
  live = (await import("./live")).live;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("live provider on contract v2: catalog", () => {
  it("maps every KPI field the contract gives", async () => {
    const cat = await live.catalog();
    expect(cat.sample).toBe(false);
    expect(cat.generated_at).toBe("2026-01-01T00:00:00Z");
    const k = cat.kpis.find((x) => x.kpi_key === "unemployment_lfs")!;
    expect(k).toMatchObject({
      name_pl: "Stopa bezrobocia (BAEL)",
      definition_en: "Unemployed as a share of the labour force aged 15–74, from the Labour Force Survey.",
      unit_key: "pct",
      frequency: "Q",
      domain_key: "labour",
      group_key: "labour.employment",
      source_keys: ["eurostat", "gus_bdl"],
      geographies: ["PL", "PL-14", "PL-24", "EU27"],
      geo_levels: ["country", "voivodeship"],
      dimension_keys: ["sex"],
      first_period: "2024-Q1",
      last_period: "2026-Q2",
      aggregation: "rate",
      polarity: "down",
      next_release: "2026-02-27",
    });
    expect(cat.kpis.find((x) => x.kpi_key === "hicp_annual_rate")!.geo_levels).toEqual(["country"]);
  });

  it("gives dimensions their named members, the template's total first, then the contract's order", async () => {
    const sex = (await live.catalog()).dimensions.find((d) => d.dimension_key === "sex")!;
    expect(sex.members.map((m) => m.key)).toEqual(["total", "m", "f"]);
    expect(sex.members[2]).toEqual({ key: "f", name_pl: "kobiety", name_en: "women" });
  });

  it("takes geographies with their contract keys; the EU aggregate is shown with the countries", async () => {
    const geos = (await live.catalog()).geographies;
    expect(geos.find((g) => g.key === "PL-14")).toEqual({
      key: "PL-14",
      name_pl: "mazowieckie",
      name_en: "Masovia",
      level: "voivodeship",
      eu: false,
    });
    expect(geos.find((g) => g.key === "EU27")).toMatchObject({ level: "country", eu: true });
  });

  it("keeps units with their decimals, and the domains, sources and licences as published", async () => {
    const cat = await live.catalog();
    expect(cat.units.find((u) => u.unit_key === "persons")).toMatchObject({ decimals: 0 });
    expect(cat.domains).toHaveLength(6);
    expect(cat.sources.map((s) => s.source_key)).toEqual(["eurostat", "gus_bdl"]);
    expect(cat.licences[0]?.licence_key).toBe("cc_by_4");
  });
});

describe("live provider on contract v2: series", () => {
  it("returns Poland's totals from the preferred source by default", async () => {
    const s = await live.series("unemployment_lfs");
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ kpi_key: "unemployment_lfs", geography: "PL", source_key: "eurostat", members: { sex: "total" } });
    expect(s[0]!.points).toHaveLength(10);
    expect(s[0]!.points[0]).toEqual({ period: "2024-Q1", value: unemployment.series[0]!.values[0] });
  });

  it("defaults, per geography, to the first source that has it (voivodeships only in gus_bdl)", async () => {
    const s = await live.series("unemployment_lfs", { geographies: ["PL", "PL-14"] });
    expect(s.map((x) => `${x.geography}|${x.source_key}`)).toEqual(["PL|eurostat", "PL-14|gus_bdl"]);
  });

  it("lets a component pick a source (one series per source, owner decision O31)", async () => {
    const s = await live.series("unemployment_lfs", { sources: ["gus_bdl"] });
    expect(s.map((x) => x.source_key)).toEqual(["gus_bdl"]);
    expect(s[0]!.points[9]!.value).toBe(unemployment.series[4]!.values[9]);
  });

  it("returns every source with data when asked for all of them", async () => {
    const s = await live.series("unemployment_lfs", { allSources: true });
    expect(s.map((x) => x.source_key)).toEqual(["eurostat", "gus_bdl"]);
  });

  it("splits by a dimension in the contract's member order, or fixes a member", async () => {
    const split = await live.series("unemployment_lfs", { split: "sex" });
    expect(split.map((x) => x.members)).toEqual([{ sex: "m" }, { sex: "f" }]);
    const women = await live.series("unemployment_lfs", { members: { sex: "f" } });
    expect(women).toHaveLength(1);
    expect(women[0]!.points[0]!.value).toBe(unemployment.series[2]!.values[0]);
  });

  it("cuts the period window and drops the empty ends of a series", async () => {
    const window = await live.series("hicp_annual_rate", { from: "2026", to: "2026-03" });
    expect(window[0]!.points.map((p) => p.period)).toEqual(["2026-01", "2026-02", "2026-03"]);
    const cz = await live.series("hicp_annual_rate", { geographies: ["CZ"] });
    expect(cz[0]!.points[0]!.period).toBe("2025-03");
    const eurostat = await live.series("population_total", { sources: ["eurostat"] });
    expect(eurostat[0]!.points.map((p) => p.period)).toEqual(["2021", "2022", "2023", "2024"]);
  });

  it("returns nothing for a geography without data", async () => {
    expect(await live.series("population_total", { geographies: ["DE"] })).toEqual([]);
  });

  it("reads the KPI's own file only", async () => {
    await live.series("population_total");
    expect(fetch.mock.calls.map((c) => c[0])).toContain("/api/published/v2/kpi/population_total/series");
  });
});

describe("live provider on contract v2: latest and calendar", () => {
  it("reads the one latest.json, with year-ago value and the catalogue's next release", async () => {
    const l = await live.latest("unemployment_lfs", "PL-14");
    expect(l).toEqual({
      kpi_key: "unemployment_lfs",
      geography: "PL-14",
      source_key: "gus_bdl",
      period: "2026-Q2",
      value: 2.0,
      previous_period: "2026-Q1",
      previous_value: 2.1,
      year_ago_value: 2.2,
      flags: [],
      loaded_at: "2025-12-30T06:00:00Z",
      next_release: "2026-02-27",
    });
    expect(fetch.mock.calls.filter((c) => c[0] === "/api/published/v2/latest")).toHaveLength(1);
  });

  it("defaults to Poland and keeps nulls the contract allows", async () => {
    const l = await live.latest("population_total");
    expect(l).toMatchObject({ geography: "PL", year_ago_value: null, next_release: null });
    expect((await live.latest("hicp_annual_rate")).flags).toEqual(["p"]);
  });

  it("fails for a KPI or geography without a latest value", async () => {
    await expect(live.latest("population_total", "DE")).rejects.toThrow("Brak danych: population_total, DE");
  });

  it("lists the release calendar", async () => {
    const c = await live.calendar();
    expect(c.map((r) => r.date)).toEqual(["2026-01-07", "2026-02-27"]);
    expect(c[1]).toMatchObject({ source_key: "gus_bdl", kpi_keys: ["unemployment_lfs"] });
  });
});
