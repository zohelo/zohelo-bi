import { describe, expect, it } from "vitest";
import { buildCsv, csvCell, csvFileName } from "./csv";

describe("csv", () => {
  it("quotes cells that need it and keeps numbers machine-readable", () => {
    expect(csvCell("Polska")).toBe("Polska");
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell(2.9)).toBe("2.9");
    expect(csvCell(-1.5)).toBe("-1.5");
    expect(csvCell(null)).toBe("");
    expect(csvCell(Number.NaN)).toBe("");
  });
  it("defuses spreadsheet formulas in text", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-2+3")).toBe("'-2+3");
  });
  it("writes the metadata header before the table", () => {
    const text = buildCsv(
      [
        { label: "Źródło", value: "Eurostat (prc_hicp_manr)" },
        { label: "Uwaga", value: "Dane przykładowe\nnie cytuj" },
      ],
      {
        columns: ["okres", "Polska"],
        rows: [
          ["2026-09", 2.9],
          ["2026-08", null],
        ],
      },
    );
    expect(text.split("\r\n")).toEqual([
      "# Źródło: Eurostat (prc_hicp_manr)",
      "# Uwaga: Dane przykładowe nie cytuj",
      "okres,Polska",
      "2026-09,2.9",
      "2026-08,",
      "",
    ]);
  });
  it("names files safely", () => {
    expect(csvFileName("hicp_annual_rate", new Date("2026-11-03T10:00:00Z"))).toBe("zohelo-hicp_annual_rate-2026-11-03.csv");
    expect(csvFileName("Łódź / test", new Date("2026-11-03T10:00:00Z"))).toBe("zohelo-d-test-2026-11-03.csv");
  });
});
