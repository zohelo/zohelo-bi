import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { KpiLatest, PublishedCatalog } from "@zohelo/semantic";
import { KpiPageBody } from "./KpiPage";
import catalogFixture from "../../../../packages/semantic/fixtures/v1/catalog/catalog.json";
import latestFixture from "../../../../packages/semantic/fixtures/v1/kpi/unemployment_rate/latest.json";

const catalog = catalogFixture as unknown as PublishedCatalog;
const latest = latestFixture as unknown as KpiLatest;
const accessed = new Date("2026-11-02T10:00:00Z");

function page(kpiKey: string, value: KpiLatest | null) {
  return renderToStaticMarkup(
    <KpiPageBody catalog={catalog} kpiKey={kpiKey} latest={value} path={`/kpi/${kpiKey}`} accessed={accessed} lang="en" />,
  );
}

describe("KpiPageBody", () => {
  it("renders the KPI, how to cite and the explorer link", () => {
    const html = page("unemployment_rate", latest);
    expect(html).toContain("Unemployment rate (LFS)");
    expect(html).toContain("How to cite");
    expect(html).toContain('href="/explore?metric=unemployment_rate"');
  });

  it("says no published value without latest.json", () => {
    expect(page("unemployment_rate", null)).toContain("No published value yet.");
  });

  it("is not found for a KPI outside the catalogue", () => {
    expect(page("nope", null)).toContain("Page not found");
  });
});
