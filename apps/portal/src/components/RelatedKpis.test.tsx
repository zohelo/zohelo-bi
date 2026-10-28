import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RelatedItem } from "@zohelo/semantic";
import { RelatedKpis } from "./RelatedKpis";

const items: RelatedItem[] = [
  { kpi_key: "cpi_core", name_pl: "Inflacja bazowa", name_en: "Core inflation", subgroup_key: "s1" },
  { kpi_key: "hicp", name_pl: "HICP", name_en: "HICP inflation", subgroup_key: "s1" },
];

describe("RelatedKpis", () => {
  it("lists the items with links to their KPI pages", () => {
    const html = renderToStaticMarkup(<RelatedKpis items={items} />);
    expect(html.split("<li>").length - 1).toBe(2);
    expect(html).toContain('href="/kpi/cpi_core"');
    expect(html).toContain("Related KPIs");
  });

  it("renders nothing without items", () => {
    expect(renderToStaticMarkup(<RelatedKpis items={[]} />)).toBe("");
  });
});
