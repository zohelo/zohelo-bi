import { describe, expect, it } from "vitest";
import { LANG_KEY, resolveLang, saveLang } from "./lang";

const fake = (entries: Record<string, string> = {}) => {
  const m = new Map(Object.entries(entries));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};
const throwing = {
  getItem: (): string | null => {
    throw new Error("blocked");
  },
  setItem: (): void => {
    throw new Error("blocked");
  },
};

describe("resolveLang", () => {
  it("lets ?lang= win over storage and the browser", () => {
    expect(resolveLang(new URLSearchParams("lang=en"), fake({ [LANG_KEY]: "pl" }), "pl-PL")).toBe("en");
  });

  it("uses the stored choice without ?lang", () => {
    expect(resolveLang(new URLSearchParams(), fake({ [LANG_KEY]: "pl" }), "en-GB")).toBe("pl");
  });

  it("falls through a throwing storage to the browser language", () => {
    expect(resolveLang(new URLSearchParams(), throwing, "pl-PL")).toBe("pl");
  });

  it("maps the browser language: pl* to pl, anything else to en", () => {
    expect(resolveLang(new URLSearchParams(), null, "pl-PL")).toBe("pl");
    expect(resolveLang(new URLSearchParams(), null, "de-DE")).toBe("en");
    expect(resolveLang(new URLSearchParams(), null, undefined)).toBe("en");
  });
});

describe("saveLang", () => {
  it("stores the choice", () => {
    const store = fake();
    saveLang(store, "pl");
    expect(store.m.get(LANG_KEY)).toBe("pl");
  });

  it("ignores a throwing storage", () => {
    expect(() => saveLang(throwing, "en")).not.toThrow();
  });
});
