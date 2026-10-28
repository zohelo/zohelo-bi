import { describe, expect, it } from "vitest";
import { STRINGS, parseLang, pickName, t } from "./i18n";

describe("STRINGS", () => {
  it("has every key in both languages with a text", () => {
    const en = Object.keys(STRINGS.en) as (keyof typeof STRINGS.en)[];
    const pl = Object.keys(STRINGS.pl) as (keyof typeof STRINGS.pl)[];
    for (const k of en) expect(STRINGS.pl[k]).toBeTruthy();
    for (const k of pl) expect(STRINGS.en[k]).toBeTruthy();
  });
});

describe("t", () => {
  it("looks up the text of the language", () => {
    expect(t("pl", "nav.catalogue")).toBe("Katalog");
    expect(t("en", "nav.catalogue")).toBe("Catalogue");
  });
});

describe("pickName", () => {
  it("falls back to the other language, then to ''", () => {
    expect(pickName("pl", { name_pl: "", name_en: "Population" })).toBe("Population");
    expect(pickName("pl", { name_pl: "Ludność", name_en: "Population" })).toBe("Ludność");
    expect(pickName("en", {})).toBe("");
  });
});

describe("parseLang", () => {
  it("accepts pl and en, trimmed and case-insensitive", () => {
    expect(parseLang(" PL ")).toBe("pl");
    expect(parseLang("en")).toBe("en");
    expect(parseLang("de")).toBeNull();
    expect(parseLang(null)).toBeNull();
  });
});
