import { describe, expect, it } from "vitest";
import { GEOGRAPHIES, geoKey } from "./geographies";

describe("geography keys (published contract v2)", () => {
  it("names the voivodeships with ISO 3166-2 codes, PL-02 … PL-32", () => {
    const voiv = GEOGRAPHIES.filter((g) => g.level === "voivodeship").map((g) => g.key);
    expect(voiv).toHaveLength(16);
    expect(voiv[0]).toBe("PL-02");
    expect(voiv[15]).toBe("PL-32");
    for (const k of voiv) expect(k).toMatch(/^PL-(0[2-9]|[12][02468]|3[02])$/);
  });

  it("keeps Poland, EU countries and the EU-27 aggregate as the contract writes them", () => {
    const keys = GEOGRAPHIES.map((g) => g.key);
    expect(keys[0]).toBe("PL");
    expect(keys).toContain("EU27");
    expect(keys).toContain("DE");
  });

  it("maps a pre-contract key (PL14) to its contract key and leaves every other key alone", () => {
    expect(geoKey("PL14")).toBe("PL-14");
    expect(geoKey("PL02")).toBe("PL-02");
    expect(geoKey("PL-14")).toBe("PL-14");
    expect(geoKey("PL")).toBe("PL");
    expect(geoKey("EU27")).toBe("EU27");
    // Odd numbers are NUTS codes, never voivodeships: not rewritten.
    expect(geoKey("PL21")).toBe("PL21");
  });
});
