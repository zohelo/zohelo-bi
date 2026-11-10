import { describe, expect, it } from "vitest";
import { dummy } from "../data/dummy";
import { legacyRedirect, OLD_DASHBOARDS, SAMPLE_KPI } from "./legacy";
import { tplPageFor } from "./routes";

const at = (href: string, sample = true) => legacyRedirect(new URL(href, "https://bi.zohelo.com"), sample);

describe("legacyRedirect", () => {
  it("sends the old dashboards to their template equivalents, keeping lang", () => {
    expect(at("/d/poland-overview")).toBe("/d/poland");
    expect(at("/d/overview?lang=en")).toBe("/d/poland?lang=en");
    expect(at("/d/labour-market/")).toBe("/d/labour");
    expect(at("/d/prices-money?period=5y")).toBe("/d/economy/prices");
    expect(at("/d/regional-comparison")).toBe("/d");
  });

  it("leaves template addresses alone", () => {
    for (const href of [
      "/",
      "/d",
      "/d/population",
      "/d/economy/prices",
      "/explore?i=avg_wage",
      "/catalogue?q=pkb",
      "/kpi/avg_wage",
      "/przewodnik",
    ])
      expect(at(href), href).toBeNull();
    expect(at("/kpi/inflation", false)).toBeNull();
  });

  it("maps old published KPI keys to sample ones only on sample data", () => {
    expect(at("/kpi/inflation?lang=pl")).toBe("/kpi/hicp_annual_rate?lang=pl");
    expect(at("/kpi/population")).toBe("/kpi/population_total");
    expect(at("/kpi/life_expectancy")).toBeNull();
  });

  it("turns an old explorer link into the template's indicator parameter", () => {
    expect(at("/explore?metric=population&geography_name=Polska&rows=date_key&cols=source_system&t=yoy&lang=en")).toBe(
      "/explore?i=population_total&lang=en",
    );
    expect(at("/explore?metric=inflation&view=chart", false)).toBe("/explore?i=inflation");
    expect(at("/explore?metric=%3Cscript%3E")).toBe("/explore");
  });

  it("sends the removed embed page to the indicator page", () => {
    expect(at("/embed?metric=fx_rate&breakdown_json=x")).toBe("/kpi/eurpln");
    expect(at("/embed?metric=fx_rate", false)).toBe("/kpi/fx_rate");
    expect(at("/embed")).toBe("/");
  });

  it("keeps the catalogue search and maps old filters on live data only", () => {
    expect(at("/catalogue?view=datasets&q=ludno%C5%9B%C4%87")).toBe("/catalogue?q=ludno%C5%9B%C4%87");
    expect(at("/catalogue?domain=economy&q=pkb")).toBe("/catalogue?q=pkb");
    expect(at("/catalogue?domain=economy&q=pkb", false)).toBe("/catalogue?q=pkb&d=economy");
    expect(at("/catalogue?source=gus", false)).toBe("/catalogue?s=gus");
  });

  it("points only at template routes and sample indicators that exist", async () => {
    for (const to of Object.values(OLD_DASHBOARDS)) expect(tplPageFor(to).kind, to).not.toBe("not-found");
    const keys = new Set((await dummy.catalog()).kpis.map((k) => k.kpi_key));
    for (const key of Object.values(SAMPLE_KPI)) expect(keys.has(key), key).toBe(true);
  });
});
