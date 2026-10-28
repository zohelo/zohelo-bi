import { describe, expect, it } from "vitest";
import { inPeriod, parsePeriod } from "./period";

describe("inPeriod", () => {
  it("compares inclusive prefixes", () => {
    expect(inPeriod("2014", "2015")).toBe(false);
    expect(inPeriod("2015-06", "2015")).toBe(true);
    expect(inPeriod("2016-01-01", undefined, "2015-12")).toBe(false);
    expect(inPeriod("2015-12-31", undefined, "2015-12")).toBe(true);
    expect(inPeriod("2020")).toBe(true);
  });
});

describe("parsePeriod", () => {
  it("keeps only valid date_key prefixes", () => {
    expect(parsePeriod(new URLSearchParams("from=2015&to=abc"))).toEqual({ from: "2015" });
    expect(parsePeriod(new URLSearchParams("from=2015-01&to=2020-12-31"))).toEqual({ from: "2015-01", to: "2020-12-31" });
    expect(parsePeriod(new URLSearchParams(""))).toEqual({});
  });
});
