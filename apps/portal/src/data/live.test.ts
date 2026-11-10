import { afterEach, describe, expect, it, vi } from "vitest";
import { live } from "./live";

afterEach(() => {
  vi.unstubAllGlobals();
});

const period = { window: { from: "2026-11-10", to: "2026-11-10" }, topics: [] };
const topics = {
  version: 2,
  generated_at: "2026-11-10T05:30:00Z",
  periods: { day: period, week: period, month: period, quarter: period, year: period },
};

describe("live provider: topics", () => {
  // The API client memoises per URL, so each case answers from a fresh module.
  it("returns null while topics.json is not published (404), so the UI hides the section", async () => {
    vi.resetModules();
    const fetch = vi.fn(async () => Response.json({ error: "not published: topics.json" }, { status: 404 }));
    vi.stubGlobal("fetch", fetch);
    const { live: fresh } = await import("./live");
    expect(await fresh.topics()).toBeNull();
    expect(fetch).toHaveBeenCalledWith("/api/published/topics");
  });

  it("returns the published file", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(topics)),
    );
    const { live: fresh } = await import("./live");
    expect(await fresh.topics()).toEqual(topics);
  });

  it("passes other failures on", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "topics.json: $.periods.week: required property missing" }, { status: 500 })),
    );
    const { live: fresh } = await import("./live");
    await expect(fresh.topics()).rejects.toThrow("required property missing");
  });

  it("is part of the live data interface", () => {
    expect(typeof live.topics).toBe("function");
  });
});
