import { describe, expect, it } from "vitest";
import { latestChange } from "./format";

describe("latestChange", () => {
  const kpi = { unit_key: "pct", frequency: "Q" as const };
  it("is undefined without a latest value or a period before (contract v2 allows a null previous value)", () => {
    expect(latestChange(undefined, kpi, undefined, "pl")).toBeUndefined();
    expect(latestChange({ value: 2.5, previous_value: null }, kpi, undefined, "pl")).toBeUndefined();
  });
  it("formats the change against the period before", () => {
    expect(latestChange({ value: 2.5, previous_value: 2.7 }, kpi, undefined, "en")?.delta).toBeCloseTo(-0.2);
  });
});
