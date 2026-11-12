// The live provider against zohelo-data's contract v2 fixtures (packages/semantic/fixtures/v2, copied; SOURCE.md
// there): the query API is replaced by a fetch that answers each /api/published/v2/… path with its fixture, as
// functions/api would. What the fixtures do not have yet (breakdowns, gaps) is added to a copy of a fixture in the
// test, in the contract's shape.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublishedCatalogV2, PublishedSeriesV2 } from "@zohelo/semantic";
import catalogV2 from "../../../../packages/semantic/fixtures/v2/catalog.json";
import latestV2 from "../../../../packages/semantic/fixtures/v2/latest.json";
import calendarV2 from "../../../../packages/semantic/fixtures/v2/calendar.json";
import eurpln from "../../../../packages/semantic/fixtures/v2/kpi/eurpln/series.json";
import gdpNominal from "../../../../packages/semantic/fixtures/v2/kpi/gdp_nominal/series.json";
import gdpReal from "../../../../packages/semantic/fixtures/v2/kpi/gdp_real_growth/series.json";
import hicp from "../../../../packages/semantic/fixtures/v2/kpi/hicp_annual_rate/series.json";
import population from "../../../../packages/semantic/fixtures/v2/kpi/population_total/series.json";
import unemployment from "../../../../packages/semantic/fixtures/v2/kpi/unemployment_lfs/series.json";
import { mapCatalog, selectSeries } from "./live";
import type { DataProvider } from "./types";

const FILES: Record<string, unknown> = {
  "/api/published/v2/catalog": catalogV2,
  "/api/published/v2/latest": latestV2,
  "/api/published/v2/calendar": calendarV2,
  "/api/published/v2/kpi/eurpln/series": eurpln,
  "/api/published/v2/kpi/gdp_nominal/series": gdpNominal,
  "/api/published/v2/kpi/gdp_real_growth/series": gdpReal,
  "/api/published/v2/kpi/hicp_annual_rate/series": hicp,
  "/api/published/v2/kpi/population_total/series": population,
  "/api/published/v2/kpi/unemployment_lfs/series": unemployment,
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
    expect(cat.kpis.map((k) => k.kpi_key)).toEqual(catalogV2.kpis.map((k) => k.kpi_key));
    const k = cat.kpis.find((x) => x.kpi_key === "unemployment_lfs")!;
    const src = catalogV2.kpis.find((x) => x.kpi_key === "unemployment_lfs")!;
    expect(k).toMatchObject({
      name_pl: src.name_pl,
      definition_pl: src.definition_pl,
      definition_en: src.definition_en,
      unit_key: "pct_labour_force",
      frequency: "Q",
      domain_key: src.domain_key,
      group_key: src.group_key,
      source_keys: ["eurostat", "gus_dbw"],
      geographies: ["PL", "EU27", "DE", "PL-14"],
      geo_levels: ["country", "voivodeship"],
      dimension_keys: [],
      first_period: "2024-Q1",
      last_period: "2025-Q2",
      aggregation: "rate",
      polarity: "down",
      next_release: null,
      status: "published",
    });
    expect(cat.kpis.find((x) => x.kpi_key === "hicp_annual_rate")!.geo_levels).toEqual(["country"]);
  });

  it("keeps each KPI's review status (owner decision O37): draft or published", async () => {
    const cat = await live.catalog();
    expect(Object.fromEntries(cat.kpis.map((k) => [k.kpi_key, k.status]))).toMatchObject({
      gdp_nominal: "draft",
      hicp_annual_rate: "published",
    });
  });

  it("labels a KPI with the unit of what it shows by default (Poland, preferred source), keeping the catalogue's", async () => {
    const gdp = (await live.catalog()).kpis.find((x) => x.kpi_key === "gdp_nominal")!;
    expect(gdp.unit_key).toBe("mln_eur");
    expect(gdp.catalog_unit_key).toBe("mln_ncu");
  });

  it("takes geographies with their contract keys (Greece EL); the EU aggregate is shown with the countries", async () => {
    const geos = (await live.catalog()).geographies;
    expect(geos.map((g) => g.key)).toEqual(["PL", "EU27", "CZ", "DE", "EL", "PL-02", "PL-12", "PL-14"]);
    expect(geos.find((g) => g.key === "EU27")).toMatchObject({ level: "country", eu: true });
    expect(geos.find((g) => g.key === "PL-14")).toMatchObject({ level: "voivodeship" });
  });

  it("keeps units with their decimals, and the domains, sources and licences as published", async () => {
    const cat = await live.catalog();
    expect(cat.units.find((u) => u.unit_key === "pln_per_unit")).toMatchObject({ decimals: 4 });
    expect(cat.domains.length).toBe(catalogV2.domains.length);
    expect(cat.sources.length).toBe(catalogV2.sources.length);
    expect(cat.licences.length).toBe(catalogV2.licences.length);
  });

  it("gives dimensions named members, the template's total first, then the contract's order; domains without sort get one", () => {
    const c = structuredClone(catalogV2) as unknown as PublishedCatalogV2;
    c.dimensions = [
      {
        dimension_key: "sex",
        name_pl: "Płeć",
        name_en: "Sex",
        members: [
          { key: "f", name_pl: "kobiety", name_en: "women", sort: 2, parent_key: null },
          { key: "m", name_pl: "mężczyźni", name_en: "men", sort: 1 },
        ],
      },
    ];
    for (const d of c.domains) {
      delete d.csa_code;
      delete d.sort;
    }
    const cat = mapCatalog(c);
    expect(cat.dimensions[0]!.members.map((m) => m.key)).toEqual(["total", "m", "f"]);
    expect(cat.domains[1]).toMatchObject({ sort: 2, csa_code: "" });
  });
});

describe("live provider on contract v2: series", () => {
  it("returns Poland's totals from the preferred source by default, with its unit", async () => {
    const s = await live.series("gdp_nominal");
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ kpi_key: "gdp_nominal", geography: "PL", source_key: "eurostat", unit_key: "mln_eur", members: {} });
    expect(s[0]!.points).toEqual([
      { period: "2022", value: 655000 },
      { period: "2023", value: 735000 },
      { period: "2024", value: 815000 },
    ]);
  });

  it("defaults, per geography, to the first source that has it (the voivodeship only in gus_dbw)", async () => {
    const s = await live.series("unemployment_lfs", { geographies: ["PL", "PL-14", "EU27"] });
    expect(s.map((x) => `${x.geography}|${x.source_key}`)).toEqual(["PL|eurostat", "PL-14|gus_dbw", "EU27|eurostat"]);
  });

  it("lets a component pick a source (one series per source, owner decision O31), each with its own unit", async () => {
    const s = await live.series("gdp_nominal", { sources: ["gus_dbw"] });
    expect(s.map((x) => [x.source_key, x.unit_key])).toEqual([["gus_dbw", "mln_pln"]]);
  });

  it("returns every source with data when asked for all of them", async () => {
    const s = await live.series("gdp_nominal", { allSources: true });
    expect(s.map((x) => [x.source_key, x.unit_key])).toEqual([
      ["eurostat", "mln_eur"],
      ["world_bank_wdi", "usd"],
      ["gus_dbw", "mln_pln"],
    ]);
  });

  it("cuts the period window", async () => {
    const s = await live.series("hicp_annual_rate", { geographies: ["EL"], from: "2025", to: "2025-03" });
    expect(s[0]!.points.map((p) => p.period)).toEqual(["2025-01", "2025-02", "2025-03"]);
  });

  it("returns nothing for a geography without data", async () => {
    expect(await live.series("eurpln", { geographies: ["DE"] })).toEqual([]);
  });

  it("reads a series at another frequency on periods_by_frequency (World Bank annual rates of a quarterly KPI)", async () => {
    const s = await live.series("gdp_real_growth", { sources: ["world_bank_wdi"] });
    expect(s).toEqual([
      {
        kpi_key: "gdp_real_growth",
        geography: "PL",
        source_key: "world_bank_wdi",
        unit_key: "pct",
        frequency: "A",
        members: {},
        points: [
          { period: "2022", value: 5.3 },
          { period: "2023", value: 4.1 },
          { period: "2024", value: 2.9 },
        ],
      },
    ]);
    // Never by default: the voivodeship's annual Eurostat series loses to gus_dbw's quarterly one.
    expect((await live.series("unemployment_lfs", { geographies: ["PL-14"] })).map((x) => [x.source_key, x.frequency])).toEqual([
      ["gus_dbw", undefined],
    ]);
  });

  it("gives no data, never a stand-in, for a KPI that is not in catalog.json or whose series.json is not published", async () => {
    expect(await live.series("cpi_annual_rate")).toEqual([]);
    delete FILES["/api/published/v2/kpi/population_total/series"];
    try {
      expect(await live.series("population_total")).toEqual([]);
    } finally {
      FILES["/api/published/v2/kpi/population_total/series"] = population;
    }
  });

  it("passes on a failure to read a file other than 404 (the page shows its error state, never sample data)", async () => {
    fetch.mockImplementation(async (url: string) =>
      url.endsWith("/series") ? Response.json({ error: "R2 down" }, { status: 502 }) : Response.json(FILES[url]),
    );
    await expect(live.series("gdp_nominal")).rejects.toThrow("R2 down");
  });
});

describe("selectSeries: what the fixtures do not have yet", () => {
  const catalog = mapCatalog(catalogV2 as never);
  const kpi = (key: string) => catalog.kpis.find((k) => k.kpi_key === key)!;
  const file = (base: unknown, extra: object[]): PublishedSeriesV2 => {
    const f = structuredClone(base) as PublishedSeriesV2;
    f.series.push(...(extra as PublishedSeriesV2["series"]));
    return f;
  };

  it("splits by a dimension in the catalogue's member order, or fixes a member", () => {
    const u = file(unemployment, [
      { geography: "PL", source_key: "eurostat", unit_key: "pct_labour_force", members: { sex: "f" }, values: [3, 3, 3, 3, 3, 3.1] },
      { geography: "PL", source_key: "eurostat", unit_key: "pct_labour_force", members: { sex: "m" }, values: [2, 2, 2, 2, 2, 2.1] },
    ]);
    const k = { ...kpi("unemployment_lfs"), dimension_keys: ["sex"] };
    const dims = [
      {
        dimension_key: "sex",
        name_pl: "",
        name_en: "",
        members: [
          { key: "total", name_pl: "", name_en: "" },
          { key: "m", name_pl: "", name_en: "" },
          { key: "f", name_pl: "", name_en: "" },
        ],
      },
    ];
    expect(selectSeries(u, k, { dimensions: dims }, { split: "sex" }).map((s) => s.members)).toEqual([{ sex: "m" }, { sex: "f" }]);
    const women = selectSeries(u, k, { dimensions: dims }, { members: { sex: "f" } });
    expect(women.map((s) => s.points.at(-1)!.value)).toEqual([3.1]);
    expect(selectSeries(u, k, { dimensions: dims })[0]!.members).toEqual({ sex: "total" });
  });

  it("drops the empty ends of a series and keeps gaps inside it", () => {
    const h = structuredClone(hicp) as PublishedSeriesV2;
    const el = h.series.find((s) => s.geography === "EL")!;
    el.values[0] = el.values[1] = el.values[12] = el.values[5] = null;
    const pts = selectSeries(h, kpi("hicp_annual_rate"), catalog, { geographies: ["EL"] })[0]!.points;
    expect(pts[0]!.period).toBe("2024-11");
    expect(pts.at(-1)!.period).toBe("2025-08");
    expect(pts.find((p) => p.period === "2025-02")!.value).toBeNull();
  });

  it("does not mix units across geographies by default when a source in the first geography's unit has the data", () => {
    const g = file(gdpReal, [
      { geography: "PL-14", source_key: "gus_dbw", unit_key: "index_py_100", members: {}, values: [103, 103, 103, 103, 103, 104] },
      { geography: "PL-14", source_key: "gus_bdl", unit_key: "pct", members: {}, values: [3, 3, 3, 3, 3, 4] },
      { geography: "PL-12", source_key: "gus_dbw", unit_key: "index_py_100", members: {}, values: [102, 102, 102, 102, 102, 103] },
    ]);
    const k = { ...kpi("gdp_real_growth"), source_keys: ["eurostat", "gus_dbw", "gus_bdl"] };
    // PL-14: gus_bdl (in %, like Poland) over the better-ranked gus_dbw index; PL-12 has only the index: returned, with its unit.
    const s = selectSeries(g, k, catalog, { geographies: ["PL", "PL-14", "PL-12"] });
    expect(s.map((x) => `${x.geography}|${x.source_key}|${x.unit_key}`)).toEqual([
      "PL|eurostat|pct",
      "PL-14|gus_bdl|pct",
      "PL-12|gus_dbw|index_py_100",
    ]);
  });

  it("a series at another frequency: never by default, only when its source is asked for, marked, on its own periods", () => {
    const u = structuredClone(unemployment) as PublishedSeriesV2;
    u.periods_by_frequency = { A: ["2023", "2024"] };
    u.series = u.series.filter((s) => !s.frequency);
    u.series.push(
      { geography: "PL", source_key: "world_bank_wdi", unit_key: "pct_labour_force", members: {}, frequency: "A", values: [2.8, 2.9] },
      { geography: "PL-02", source_key: "world_bank_wdi", unit_key: "pct_labour_force", members: {}, frequency: "A", values: [null, 3.1] },
    );
    const k = { ...kpi("unemployment_lfs"), source_keys: ["eurostat", "gus_dbw", "world_bank_wdi"] };
    expect(selectSeries(u, k, catalog).map((s) => s.source_key)).toEqual(["eurostat"]);
    // A geography with data only at another frequency gets nothing by default either.
    expect(selectSeries(u, k, catalog, { geographies: ["PL-02"] })).toEqual([]);
    const wb = selectSeries(u, k, catalog, { sources: ["world_bank_wdi"] });
    expect(wb).toEqual([
      {
        kpi_key: "unemployment_lfs",
        geography: "PL",
        source_key: "world_bank_wdi",
        unit_key: "pct_labour_force",
        frequency: "A",
        members: {},
        points: [
          { period: "2023", value: 2.8 },
          { period: "2024", value: 2.9 },
        ],
      },
    ]);
    expect(selectSeries(u, k, catalog, { geographies: ["PL-02"], sources: ["world_bank_wdi"] })[0]!.points).toEqual([
      { period: "2024", value: 3.1 },
    ]);
    expect(selectSeries(u, k, catalog, { allSources: true }).map((s) => `${s.source_key}|${s.frequency ?? "Q"}`)).toEqual([
      "eurostat|Q",
      "gus_dbw|Q",
      "world_bank_wdi|A",
    ]);
  });
});

describe("live provider on contract v2: latest and calendar", () => {
  it("reads the one latest.json, with the value's unit, year-ago value and the catalogue's next release", async () => {
    const l = await live.latest("unemployment_lfs", "PL-14");
    const v = latestV2.values.find((x) => x.kpi_key === "unemployment_lfs" && x.geography === "PL-14")!;
    expect(l).toEqual({
      kpi_key: "unemployment_lfs",
      geography: "PL-14",
      source_key: "gus_dbw",
      unit_key: "pct_labour_force",
      period: "2025-Q2",
      value: v.value,
      previous_period: "2025-Q1",
      previous_value: v.previous_value,
      year_ago_value: v.year_ago_value,
      flags: [],
      loaded_at: v.checked_at,
      next_release: null,
    });
    expect(fetch.mock.calls.filter((c) => c[0] === "/api/published/v2/latest")).toHaveLength(1);
  });

  it("defaults to Poland and keeps nulls and flags as published", async () => {
    expect(await live.latest("gdp_nominal")).toMatchObject({ geography: "PL", unit_key: "mln_eur", year_ago_value: null, flags: ["p"] });
    expect(await live.latest("hicp_annual_rate")).toMatchObject({ flags: ["p"], next_release: "2026-01-07" });
  });

  it("gives no data (null) for a KPI or geography without a latest value, or without latest.json", async () => {
    expect(await live.latest("eurpln", "DE")).toBeNull();
    expect(await live.latest("cpi_annual_rate")).toBeNull();
  });

  it("gives no data (null) while latest.json is not published", async () => {
    delete FILES["/api/published/v2/latest"];
    try {
      expect(await live.latest("gdp_nominal")).toBeNull();
    } finally {
      FILES["/api/published/v2/latest"] = latestV2;
    }
  });

  it("lists the release calendar", async () => {
    const c = await live.calendar();
    expect(c.map((r) => r.date)).toEqual(calendarV2.releases.map((r) => r.date));
    expect(c[0]).toMatchObject({ source_key: "eurostat", kpi_keys: ["hicp_annual_rate"] });
  });
});
