import { describe, expect, it } from "vitest";
import { judge, polarityOf, rememberPolarity } from "./polarity";

describe("polarity", () => {
  it("uses the template's own list while the catalogue has none (sample data)", () => {
    expect(polarityOf("unemployment_lfs")).toBe("down");
    expect(judge("unemployment_lfs", -0.3)).toBe("good");
    expect(polarityOf("hicp_annual_rate")).toBeUndefined();
  });

  it("lets the published catalogue decide: up, down, and neutral overriding the template's list", () => {
    rememberPolarity([
      { kpi_key: "new_published_kpi", polarity: "up" },
      { kpi_key: "avg_wage", polarity: "neutral" },
      { kpi_key: "sample_only_kpi" },
    ]);
    expect(polarityOf("new_published_kpi")).toBe("up");
    expect(judge("new_published_kpi", 1)).toBe("good");
    expect(polarityOf("avg_wage")).toBeUndefined();
    expect(judge("avg_wage", 1)).toBe("neutral");
    expect(polarityOf("unemployment_lfs")).toBe("down");
  });
});
