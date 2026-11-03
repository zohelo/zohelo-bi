import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { inWindow, sliceSeries } from "./fetch";
import { findingTitle, peakPoint, ranking } from "./findings";
import { bandFor, citationText, fmtDate, relatedKpis } from "./indicatorInfo";
import { geoCoverage, groupPath, periodEnd, scopesOf, seriesLength } from "./kpiInfo";
import { exportMeta, seriesMatrix } from "./sources";

const cat = await dummy.catalog();
const hicp = cat.kpis.find((k) => k.kpi_key === "hicp_annual_rate")!;
const fmt = { value: (v: number) => `${String(v).replace(".", ",")}%`, period: (p: string) => p };

describe("kpiInfo", () => {
  it("measures series and periods", () => {
    expect(periodEnd("2025")).toBe("2025-12");
    expect(periodEnd("2026-Q2")).toBe("2026-06");
    expect(periodEnd("2026-09")).toBe("2026-09");
    expect(seriesLength({ ...hicp, frequency: "M", first_period: "2010-01", last_period: "2026-09" })).toBe(201);
    expect(seriesLength({ ...hicp, frequency: "Q", first_period: "2010-Q1", last_period: "2026-Q2" })).toBe(66);
    expect(seriesLength({ ...hicp, frequency: "A", first_period: "2010", last_period: "2025" })).toBe(16);
  });
  it("describes coverage and paths", () => {
    expect(geoCoverage(hicp, cat, "pl")).toBe("Polska i kraje UE");
    expect(scopesOf(hicp, cat)).toEqual(["eu"]);
    expect(groupPath("economy.prices")).toBe("/d/economy/prices");
  });
});

describe("findings", () => {
  const s = (id: string, ys: (number | null)[]) => ({ id, label: id, points: ys.map((y, i) => ({ x: `20${10 + i}`, y })) });
  it("states the change of one series", () => {
    expect(findingTitle([s("PL", [3.1, 18, 2.9])], fmt, "pl")).toBe("Spadek z 3,1% do 2,9% (2010–2012)");
    expect(findingTitle([s("PL", [1, null])], fmt, "pl")).toBe("1% (2010)");
  });
  it("states the highest and lowest of several", () => {
    expect(findingTitle([s("Polska", [1, 2]), s("Niemcy", [3, 4]), s("Francja", [0, 1])], fmt, "pl")).toBe(
      "Najwyżej Niemcy (4%), najniżej Francja (1%), 2011",
    );
    expect(ranking([s("a", [1, null]), s("b", [2])]).map((r) => [r.id, r.x])).toEqual([
      ["b", "2010"],
      ["a", "2010"],
    ]);
  });
  it("finds the peak", () => {
    expect(peakPoint(s("PL", [1, 5, null, 3]).points)).toEqual({ x: "2011", y: 5 });
  });
});

describe("sources", () => {
  it("builds the period × series matrix newest first", () => {
    const m = seriesMatrix([
      {
        id: "a",
        label: "A",
        points: [
          { x: "2010", y: 1 },
          { x: "2011", y: 2 },
        ],
      },
      { id: "b", label: "B", points: [{ x: "2011", y: 3 }] },
    ]);
    expect(m).toEqual({
      periods: ["2011", "2010"],
      labels: ["A", "B"],
      values: [
        [2, 3],
        [1, null],
      ],
    });
  });
  it("puts source, licence and the sample notice in the export header", () => {
    const meta = exportMeta(cat, hicp, ["eurostat"], "pl", { now: new Date("2026-11-03") });
    const text = meta.map((m) => `${m.label}: ${m.value}`).join("\n");
    expect(text).toContain("Źródło: Eurostat (eurostat)");
    expect(text).toContain("Licencja: CC BY 4.0 https://creativecommons.org/licenses/by/4.0/");
    expect(text).toContain("Dane przykładowe");
    expect(text).toContain("Pobrano: 2026-11-03");
  });
});

describe("fetch window", () => {
  it("cuts periods by year or exact bounds", () => {
    expect(inWindow("2015-03", "2015", "2016")).toBe(true);
    expect(inWindow("2014-12", "2015", "2016")).toBe(false);
    expect(inWindow("2016-12", "2015", "2016")).toBe(true);
    expect(inWindow("2026-Q2", "2026-Q2", "2026-Q2")).toBe(true);
  });
  it("keeps values identical to the full history", async () => {
    const full = await dummy.series("hicp_annual_rate");
    const cut = sliceSeries(full, "2020", "2021")[0]!.points;
    expect(cut).toHaveLength(24);
    expect(cut[0]).toEqual(full[0]!.points.find((p) => p.period === "2020-01"));
  });
});

describe("indicator helpers", () => {
  it("formats dates, bands, citations and related indicators", () => {
    expect(fmtDate("2026-10-24T06:00:00Z", "pl")).toBe("24 paź 2026");
    expect(fmtDate("2026-11-17", "en")).toBe("17 Nov 2026");
    expect(bandFor(hicp)).toEqual([1.5, 3.5]);
    expect(bandFor(cat.kpis.find((k) => k.kpi_key === "population_total") ?? hicp)).toEqual(
      cat.kpis.some((k) => k.kpi_key === "population_total") ? undefined : [1.5, 3.5],
    );
    expect(citationText(cat, hicp, "pl", new Date("2026-11-03T12:00:00Z"))).toBe(
      "Inflacja HICP, r/r, Eurostat (eurostat), via zohelo bi, dostęp 3 lis 2026, bi.zohelo.com/kpi/hicp_annual_rate [dane przykładowe]",
    );
    const rel = relatedKpis(cat, hicp);
    expect(rel.length).toBeGreaterThan(0);
    expect(rel.length).toBeLessThanOrEqual(4);
    expect(rel.some((k) => k.kpi_key === "hicp_annual_rate")).toBe(false);
    expect(rel[0]!.group_key).toBe(hicp.group_key);
  });
});
