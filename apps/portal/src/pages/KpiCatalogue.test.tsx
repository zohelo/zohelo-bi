import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CatalogueSelection, PublishedCatalog } from "@zohelo/semantic";
import type { TreeMode } from "../components/TreePanel";
import { KpiCatalogueBody } from "./KpiCatalogue";
import catalogFixture from "../../../../packages/semantic/fixtures/v1/catalog/catalog.json";

const catalog = catalogFixture as unknown as PublishedCatalog;
const noop = () => {};

function body(sel: CatalogueSelection, mode: TreeMode = "domain") {
  return renderToStaticMarkup(<KpiCatalogueBody catalog={catalog} sel={sel} mode={mode} onMode={noop} onSelect={noop} onSearch={noop} />);
}

const cards = (html: string) => html.match(/class="kpi-card"/g)?.length ?? 0;

describe("KpiCatalogueBody", () => {
  it("shows every KPI, the domain tree and the link to the data blocks", () => {
    const html = body({ q: "" });
    expect(cards(html)).toBe(5);
    expect(html).toContain("Exchange rate to PLN");
    expect(html).toContain("By domain");
    expect(html).toContain('href="/catalogue?view=datasets"');
  });

  it("narrows to a source", () => {
    expect(cards(body({ source: "nbp", q: "" }, "source"))).toBe(1);
  });

  it("narrows to a search", () => {
    const html = body({ q: "unemploy" });
    expect(cards(html)).toBe(1);
    expect(html).toContain("Unemployment rate (LFS)");
  });
});
