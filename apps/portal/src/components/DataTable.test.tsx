import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SeriesRow } from "@zohelo/semantic";
import { DataTable, toCsv } from "./DataTable";

const row = (i: number): SeriesRow => ({
  series_key: "s1",
  source_system: "gl-001",
  geography_name: "Polska",
  geography_level: "country",
  frequency: "A",
  date_key: String(1970 + i),
  value: i,
  unit: "persons",
  breakdown_json: null,
});
const rows = Array.from({ length: 51 }, (_, i) => row(i));

describe("DataTable", () => {
  it("renders English headers and the hint without lang", () => {
    const html = renderToStaticMarkup(<DataTable rows={rows} limit={50} />);
    expect(html).toContain("Period");
    expect(html).toContain("Showing the latest 50 of 51 rows.");
  });

  it("renders Polish headers and the hint with lang pl", () => {
    const html = renderToStaticMarkup(<DataTable rows={rows} limit={50} lang="pl" />);
    expect(html).toContain("Okres");
    expect(html).toContain("Pokazano najnowsze 50 z 51 wierszy.");
  });

  it("keeps the CSV header", () => {
    expect(toCsv([row(0)]).startsWith("date_key,geography_name,source_system,frequency,value,unit,breakdown_json,series_key")).toBe(true);
  });

  it("gives each series one precision in the page language (4,0 next to 3,9; integers stay whole)", () => {
    const r = (series_key: string, date_key: string, value: number): SeriesRow => ({ ...row(0), series_key, date_key, value });
    const html = renderToStaticMarkup(
      <DataTable rows={[r("A", "2025-01-01", 4), r("A", "2024-01-01", 3.9), r("B", "2025-01-01", 5), r("B", "2024-01-01", 6)]} lang="pl" />,
    );
    expect(html).toContain('<td class="num">4,0</td>');
    expect(html).toContain('<td class="num">3,9</td>');
    expect(html).toContain('<td class="num">5</td>');
    expect(html).not.toContain(">5,0<");
  });
});
