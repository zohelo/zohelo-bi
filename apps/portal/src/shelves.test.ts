import { describe, expect, it } from "vitest";
import { DEFAULT_SHELVES, parseShelves, shelfColumns, shelvesToParams, swapShelves } from "./shelves";
import { metric } from "@zohelo/semantic";

const allowed = ["source_system", "geography_level", "frequency", "geography_name", "date_key"];
const parse = (q: string) => parseShelves(new URLSearchParams(q), allowed);

describe("parseShelves", () => {
  it("gives the default shelves without params", () => {
    expect(parse("")).toEqual(DEFAULT_SHELVES);
  });

  it("parses rows and cols", () => {
    expect(parse("rows=frequency&cols=date_key")).toEqual({ rows: ["frequency"], cols: ["date_key"] });
  });

  it("drops unknown and duplicate columns", () => {
    expect(parse("rows=nope,frequency,frequency&cols=date_key,evil")).toEqual({ rows: ["frequency"], cols: ["date_key"] });
  });

  it("keeps a column in both lists only in rows", () => {
    expect(parse("rows=frequency,date_key&cols=date_key,geography_name")).toEqual({
      rows: ["frequency", "date_key"],
      cols: ["geography_name"],
    });
  });

  it("cuts more than 2 to 2", () => {
    expect(parse("rows=frequency,geography_name,source_system&cols=date_key")).toEqual({
      rows: ["frequency", "geography_name"],
      cols: ["date_key"],
    });
  });

  it("falls back to the defaults when a list ends up empty", () => {
    expect(parse("rows=date_key&cols=date_key")).toEqual(DEFAULT_SHELVES);
  });
});

describe("shelves", () => {
  it("swap exchanges the lists", () => {
    expect(swapShelves(DEFAULT_SHELVES)).toEqual({ rows: ["date_key"], cols: ["geography_name", "source_system"] });
  });

  it("writes rows and cols to the params", () => {
    const p = new URLSearchParams({ metric: "population" });
    shelvesToParams({ rows: ["date_key"], cols: ["geography_name", "source_system"] }, p);
    expect(p.toString()).toBe("metric=population&rows=date_key&cols=geography_name%2Csource_system");
  });

  it("lists the metric's dimensions with Period last", () => {
    const cols = shelfColumns(metric("population")!);
    expect(cols.at(-1)).toEqual({ column: "date_key", label: "Period" });
    expect(cols.map((c) => c.column)).toContain("geography_name");
  });
});
