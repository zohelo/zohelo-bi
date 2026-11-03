import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { activeFilterCount, applyCatalogue, EMPTY_FILTERS, effectiveSort, parseCatalogue, serialiseCatalogue } from "./catalogueState";
import { periodEnd, scopesOf, seriesYears } from "./kpiInfo";

const cat = await dummy.catalog();

describe("catalogue URL state", () => {
  it("round-trips every filter", () => {
    const f = {
      q: "kurs euro",
      domain: "finance",
      group: "finance.fx",
      freq: "M" as const,
      source: "nbp",
      scope: "pl" as const,
      sort: "name" as const,
    };
    const qs = serialiseCatalogue(f);
    expect(qs).toBe("?q=kurs+euro&d=finance&g=finance.fx&f=M&s=nbp&z=pl&sort=name");
    expect(parseCatalogue(qs)).toEqual(f);
  });
  it("is empty without filters and drops invalid values", () => {
    expect(serialiseCatalogue(EMPTY_FILTERS)).toBe("");
    expect(parseCatalogue("?f=X&z=mars&sort=random&d=<script>")).toEqual(EMPTY_FILTERS);
    expect(parseCatalogue("?q=%C5%81%C3%B3d%C5%BA").q).toBe("Łódź");
  });
  it("counts active filters and picks the default sort", () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, q: "x", freq: "A" })).toBe(2);
    expect(effectiveSort(EMPTY_FILTERS)).toBe("newest");
    expect(effectiveSort({ ...EMPTY_FILTERS, q: "pkb" })).toBe("relevance");
    expect(effectiveSort({ ...EMPTY_FILTERS, sort: "relevance" })).toBe("newest");
  });
});

describe("applyCatalogue", () => {
  it("lists all 183 indicators without filters", () => {
    expect(applyCatalogue(cat, EMPTY_FILTERS)).toHaveLength(183);
  });
  it("filters by frequency, source, domain and scope", () => {
    expect(applyCatalogue(cat, { ...EMPTY_FILTERS, freq: "A" }).every((k) => k.frequency === "A")).toBe(true);
    expect(applyCatalogue(cat, { ...EMPTY_FILTERS, source: "nbp" }).every((k) => k.source_keys.includes("nbp"))).toBe(true);
    expect(applyCatalogue(cat, { ...EMPTY_FILTERS, domain: "economy" }).every((k) => k.domain_key === "economy")).toBe(true);
    const voiv = applyCatalogue(cat, { ...EMPTY_FILTERS, scope: "voiv" });
    expect(voiv.length).toBeGreaterThan(0);
    expect(voiv.every((k) => scopesOf(k, cat).includes("voiv"))).toBe(true);
    const plOnly = applyCatalogue(cat, { ...EMPTY_FILTERS, scope: "pl" });
    expect(plOnly.every((k) => k.geographies.length === 1)).toBe(true);
  });
  it("combines search with filters", () => {
    const r = applyCatalogue(cat, { ...EMPTY_FILTERS, q: "inflacja", source: "eurostat" });
    expect(r.map((k) => k.kpi_key)).toContain("hicp_annual_rate");
    expect(r.every((k) => k.source_keys.includes("eurostat"))).toBe(true);
  });
  it("sorts by newest data, name and series length", () => {
    const newest = applyCatalogue(cat, { ...EMPTY_FILTERS, sort: "newest" });
    for (let i = 1; i < newest.length; i++) expect(periodEnd(newest[i - 1]!.last_period) >= periodEnd(newest[i]!.last_period)).toBe(true);
    const byName = applyCatalogue(cat, { ...EMPTY_FILTERS, sort: "name" }).map((k) => k.name_pl);
    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b, "pl")));
    const longest = applyCatalogue(cat, { ...EMPTY_FILTERS, sort: "longest" });
    expect(seriesYears(longest[0]!)).toBeGreaterThanOrEqual(seriesYears(longest[longest.length - 1]!));
  });
});
