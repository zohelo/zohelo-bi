import { afterEach, describe, expect, it, vi } from "vitest";
import topicsFixture from "../../../../packages/semantic/fixtures/v2/topics.json";
import { REVIEW_KEY, topicsReview } from "./topicsReview";

/** A sessionStorage stand-in. */
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

const blocked = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("SecurityError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
} as unknown as Storage;

describe("topics review switch (?tematy=przeglad)", () => {
  it("is off without the switch: nothing changes", () => {
    expect(topicsReview("", memoryStorage())).toBe(false);
    expect(topicsReview("?okres=tydzien", memoryStorage())).toBe(false);
  });

  it("turns on with ?tematy=przeglad and stays on for the session", () => {
    const s = memoryStorage();
    expect(topicsReview("?tematy=przeglad", s)).toBe(true);
    expect(s.getItem(REVIEW_KEY)).toBe("przeglad");
    expect(topicsReview("", s)).toBe(true);
  });

  it("turns off with any other value of ?tematy=", () => {
    const s = memoryStorage();
    topicsReview("?tematy=przeglad", s);
    expect(topicsReview("?tematy=wyl", s)).toBe(false);
    expect(s.getItem(REVIEW_KEY)).toBeNull();
    expect(topicsReview("", s)).toBe(false);
  });

  it("works from the address alone when storage is blocked", () => {
    expect(topicsReview("?tematy=przeglad", blocked)).toBe(true);
    expect(topicsReview("", blocked)).toBe(false);
    expect(topicsReview("?tematy=przeglad", undefined)).toBe(true);
  });
});

describe("data.topics() with the review switch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  async function freshData(search: string, answer: (url: string) => Response) {
    vi.resetModules();
    vi.stubEnv("VITE_DATA_MODE", "dummy");
    vi.stubGlobal("location", { search });
    vi.stubGlobal("sessionStorage", memoryStorage());
    const fetch = vi.fn(async (url: string) => answer(url));
    vi.stubGlobal("fetch", fetch);
    const mod = await import("./index");
    return { data: mod.data, fetch, reviewOn: mod.topicsReview };
  }

  it("reads the internal review file even in sample mode", async () => {
    const { data, fetch, reviewOn } = await freshData("?tematy=przeglad", () => Response.json(topicsFixture));
    expect(data.mode).toBe("dummy");
    expect(reviewOn()).toBe(true);
    expect(await data.topics()).toEqual(topicsFixture);
    expect(fetch).toHaveBeenCalledWith("/api/published/v1/review/topics.json");
  });

  it("gives null (the section hides) when there is no review copy", async () => {
    const { data } = await freshData("?tematy=przeglad", () => Response.json({ error: "not published" }, { status: 404 }));
    expect(await data.topics()).toBeNull();
  });

  it("leaves sample topics alone without the switch, and never calls the API", async () => {
    const { data, fetch, reviewOn } = await freshData("", () => Response.json(topicsFixture));
    expect(reviewOn()).toBe(false);
    const t = await data.topics();
    expect(t?.periods.day.topics.length).toBeGreaterThan(0);
    expect(t).not.toEqual(topicsFixture);
    expect(fetch).not.toHaveBeenCalled();
  });
});
