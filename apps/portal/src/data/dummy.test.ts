import { describe, expect, it } from "vitest";
import { dummy, periods } from "./dummy";

describe("dummy data provider", () => {
  it("lists every domain group with KPIs", async () => {
    const c = await dummy.catalog();
    const groups = c.domains.filter((d) => d.level === "group").map((d) => d.domain_key);
    for (const g of groups)
      expect(
        c.kpis.some((k) => k.group_key === g),
        g,
      ).toBe(true);
    expect(c.domains.filter((d) => d.level === "domain")).toHaveLength(12);
  });
  it("is deterministic", async () => {
    const a = await dummy.series("hicp_annual_rate", { geographies: ["PL", "DE"] });
    const b = await dummy.series("hicp_annual_rate", { geographies: ["PL", "DE"] });
    expect(a).toEqual(b);
    expect(a).toHaveLength(2);
  });
  it("splits by a dimension and respects period bounds", async () => {
    const s = await dummy.series("unemployment_lfs", { split: "sex", from: "2020", to: "2021" });
    expect(s.map((x) => x.members.sex)).toEqual(["m", "f"]);
    expect(s[0]!.points.every((p) => p.period >= "2020" && p.period.slice(0, 4) <= "2021")).toBe(true);
  });
  it("gives a latest value with previous period", async () => {
    const l = await dummy.latest("avg_wage");
    expect(l.period).toBe("2026-09");
    expect(l.previous_period).toBe("2026-08");
    expect(typeof l.value).toBe("number");
  });
  it("generates periods per frequency", () => {
    expect(periods("A").at(-1)).toBe("2025");
    expect(periods("Q").at(-1)).toBe("2026-Q2");
    expect(periods("M", "2026-07")).toEqual(["2026-07", "2026-08", "2026-09"]);
  });
});
