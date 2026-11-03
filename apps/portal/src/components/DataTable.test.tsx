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

  it("writes unit and frequency in Polish with lang pl, and the source name in both languages", () => {
    const one = [{ ...row(1), source_system: "eurostat" }];
    const pl = renderToStaticMarkup(<DataTable rows={one} lang="pl" />);
    expect(pl).toContain("<td>osoby</td>");
    expect(pl).toContain("<td>Roczna</td>");
    expect(pl).toContain("<td>Eurostat</td>");
    const en = renderToStaticMarkup(<DataTable rows={one} />);
    expect(en).toContain("<td>persons</td>");
    expect(en).toContain("<td>Annual</td>");
  });

  it("keeps the CSV header", () => {
    expect(toCsv([row(0)]).startsWith("date_key,geography_name,source_system,frequency,value,unit,breakdown_json,series_key")).toBe(true);
  });
});
