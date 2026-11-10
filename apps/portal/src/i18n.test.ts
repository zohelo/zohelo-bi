import { describe, expect, it } from "vitest";
import { parseLang } from "./i18n";

describe("parseLang", () => {
  it("accepts pl and en, trimmed and case-insensitive", () => {
    expect(parseLang(" PL ")).toBe("pl");
    expect(parseLang("en")).toBe("en");
    expect(parseLang("de")).toBeNull();
    expect(parseLang(null)).toBeNull();
  });
});
