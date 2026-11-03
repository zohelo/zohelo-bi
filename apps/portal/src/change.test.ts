import { describe, expect, it } from "vitest";
import {
  changeText,
  comparisonText,
  formatValue,
  inPoints,
  isYearOnYear,
  nationalValue,
  periodWords,
  withUnit,
  cardValue,
  cardChange,
} from "./change";

const NB = " ";

describe("periodWords", () => {
  it("writes years, months, quarters and days in words per language", () => {
    expect(periodWords("2025", "pl")).toBe("2025");
    expect(periodWords("2026-09", "pl")).toBe("wrzesień 2026");
    expect(periodWords("2026-09", "en")).toBe("September 2026");
    expect(periodWords("2026-Q2", "pl")).toBe("II kw. 2026");
    expect(periodWords("2026-Q2", "en")).toBe("Q2 2026");
    expect(periodWords("2026-10-27", "pl")).toBe("27 października 2026");
    expect(periodWords("2026-10-27", "en")).toBe("27 October 2026");
    expect(periodWords("2025-H1", "pl")).toBe("I półr. 2025");
    expect(periodWords("2025-H2", "en")).toBe("H2 2025");
  });

  it("uses the Polish genitive on request and keeps unknown forms", () => {
    expect(periodWords("2026-08", "pl", true)).toBe("sierpnia 2026");
    expect(periodWords("2026-08", "en", true)).toBe("August 2026");
    expect(periodWords("2026-W45", "pl")).toBe("2026-W45");
  });
});

describe("isYearOnYear and comparisonText", () => {
  it("names the same month or quarter a year earlier y/y", () => {
    expect(isYearOnYear("2026-09", "2025-09")).toBe(true);
    expect(isYearOnYear("2026-Q2", "2025-Q2")).toBe(true);
    expect(comparisonText("2026-09", "2025-09", "pl")).toBe("r/r");
    expect(comparisonText("2026-09", "2025-09", "en")).toBe("y/y");
  });

  it("names adjacent periods by the previous period in words", () => {
    expect(isYearOnYear("2025", "2024")).toBe(false);
    expect(isYearOnYear("2026-09", "2026-08")).toBe(false);
    expect(comparisonText("2025", "2024", "en")).toBe("vs 2024");
    expect(comparisonText("2025", "2024", "pl")).toBe("wobec 2024");
    expect(comparisonText("2026-09", "2026-08", "pl")).toBe("wobec sierpnia 2026");
    expect(comparisonText("2026-Q2", "2026-Q1", "en")).toBe("vs Q1 2026");
    expect(comparisonText("2026-Q1", "2025-Q4", "pl")).toBe("wobec IV kw. 2025");
    expect(comparisonText("2025-H2", "2025-H1", "pl")).toBe("wobec I półr. 2025");
    expect(comparisonText("2025-H2", "2024-H2", "en")).toBe("y/y");
  });
});

describe("formatValue", () => {
  it("uses the locale's decimal mark and a true minus", () => {
    expect(formatValue(3.2, "pl")).toBe("3,2");
    expect(formatValue(3.2, "en")).toBe("3.2");
    expect(formatValue(-0.25, "en")).toBe("−0.25");
    expect(formatValue(38_000_000, "en")).toBe("38,000,000");
    expect(formatValue(-0.001, "pl")).toBe("0");
    expect(formatValue(-0, "en")).toBe("0");
  });
});

describe("changeText", () => {
  it("shows a rate change in percentage points", () => {
    expect(changeText(4.9, 5, true, "%", "pl")).toBe(`−0,1${NB}p.p.`);
    expect(changeText(4.9, 5, true, "%", "en")).toBe(`−0.1${NB}pp`);
    expect(changeText(3.2, 2.9, true, "%", "en")).toBe(`+0.3${NB}pp`);
  });

  it("shows a level change in its unit and in per cent", () => {
    expect(changeText(843, 748, false, "mld EUR", "pl")).toBe(`+95${NB}mld EUR (+12,7%)`);
    expect(changeText(37_489_000, 37_636_000, false, "os.", "pl")).toBe(`−147${NB}000${NB}os. (−0,4%)`);
    expect(changeText(843, 748, false, "bn EUR", "en")).toBe(`+95${NB}bn EUR (+12.7%)`);
    expect(changeText(37_500_000, 37_600_000, false, "os.", "en")).toBe(`−100,000${NB}os. (−0.3%)`);
  });

  it("leaves out the sign of a zero change and the per cent of a change from 0", () => {
    expect(changeText(5, 5, true, "%", "en")).toBe(`0${NB}pp`);
    expect(changeText(10, 0, false, "os.", "en")).toBe(`+10${NB}os.`);
  });
});

describe("withUnit", () => {
  it("writes per cent without a space and every other unit after a no-break space, PL and EN alike", () => {
    expect(withUnit("2,9", "%")).toBe("2,9%");
    expect(withUnit("2.9", "%")).toBe("2.9%");
    expect(withUnit("4,25", "zł")).toBe(`4,25${NB}zł`);
    expect(withUnit("843", "mld EUR")).toBe(`843${NB}mld EUR`);
    expect(withUnit("3,2", "")).toBe("3,2");
  });
});

describe("inPoints", () => {
  it("is true only for per-cent rates", () => {
    expect(inPoints({ symbol: "%", is_rate: true })).toBe(true);
    expect(inPoints({ symbol: "zł", is_rate: true })).toBe(false);
    expect(inPoints({ symbol: "os.", is_rate: false })).toBe(false);
    expect(inPoints({ symbol: "%" })).toBe(false);
    expect(inPoints(undefined)).toBe(false);
  });
});

describe("nationalValue", () => {
  const row = (source_key: string, geography_level: string, geography_key = "PL") => ({
    source_key,
    geography_level,
    geography_key,
    period: "2025",
    value: 1,
  });
  it("takes the PL row of the first source that has one", () => {
    const rows = [row("wdi", "country"), row("eurostat", "voivodeship", "TERC:12"), row("eurostat", "country")];
    expect(nationalValue(rows, ["eurostat", "wdi"])!.source_key).toBe("eurostat");
    expect(nationalValue(rows, ["gus", "wdi"])!.source_key).toBe("wdi");
    // A PL row of a source outside source_keys still counts, as on the KPI page.
    expect(nationalValue(rows, ["gus"])!.source_key).toBe("wdi");
    expect(nationalValue([row("eurostat", "voivodeship", "TERC:12")], ["eurostat"])).toBeNull();
    expect(nationalValue([row("eurostat", "country", "DE")], ["eurostat"])).toBeNull();
  });
});

describe("cardValue and cardChange", () => {
  it("keeps small values as on the KPI page and compacts from a million", () => {
    expect(cardValue(3.2, "%", "pct", "pl")).toBe("3,2%");
    expect(cardValue(4.25, "zł", "pln_per_unit", "pl")).toBe(`4,25${NB}zł`);
    expect(cardValue(845_000, "mln", "mln_ncu", "pl")).toBe(`845${NB}mld`);
    expect(cardValue(845_000, "mln", "mln_ncu", "en")).toBe(`845${NB}bn`);
    expect(cardValue(914_700_000_000, "USD", "usd", "en")).toBe(`USD${NB}915${NB}bn`);
  });

  it("writes p.p. for rates and a compact change below a thousand as it is", () => {
    const r = { value: 3.2, previous_value: 2.9, period: "2025", previous_period: "2024" };
    expect(cardChange(r, { unit_key: "pct", symbol: "%", is_rate: true }, "unemployment_rate", "pl")).toBe(`+0,3${NB}p.p. wobec 2024`);
    const small = { value: 37_500, previous_value: 37_000, period: "2025", previous_period: "2024" };
    expect(cardChange(small, { unit_key: "persons", symbol: "os." }, "population", "pl")).toBe(`+500${NB}os. (+1,4%) wobec 2024`);
  });
});
