import { describe, expect, it } from "vitest";
import { kpiChartQuery } from "./kpiChart";

describe("kpiChartQuery", () => {
  it("gives population's default filters, unit and explorer link", () => {
    const q = kpiChartQuery("population")!;
    expect(q.filters).toEqual({ geography_level: ["country"], geography_name: ["Polska"] });
    expect(q.unit).toBe("persons");
    expect(q.exploreHref).toBe("/explore?metric=population&geography_level=country&geography_name=Polska");
  });

  it("gives fx_rate's default currency", () => {
    expect(kpiChartQuery("fx_rate")!.filters).toEqual({ breakdown_json: ['{"currency":"EUR"}'] });
  });

  it("is null for an unknown KPI", () => {
    expect(kpiChartQuery("nope")).toBeNull();
  });
});
