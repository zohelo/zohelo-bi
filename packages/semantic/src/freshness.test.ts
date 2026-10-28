import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STALE_AFTER_DAYS, freshness } from "./index";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date("2026-03-01T00:00:00Z");
const daysBefore = (days: number): string => new Date(now.getTime() - days * DAY_MS).toISOString();

describe("freshness", () => {
  it("treats a monthly KPI loaded 39 days ago as fresh and 41 days ago as stale", () => {
    expect(freshness({ frequency_default: "M", loaded_at: daysBefore(39) }, now).status).toBe("fresh");
    expect(freshness({ frequency_default: "M", loaded_at: daysBefore(41) }, now).status).toBe("stale");
  });

  it("reports age and load date for an annual KPI", () => {
    const result = freshness({ frequency_default: "A", last_period: "2025", loaded_at: "2026-01-01" }, now);
    expect(result).toEqual({ status: "fresh", lastPeriod: "2025", loadedDate: "2026-01-01", ageDays: 59 });
  });

  it("is unknown without loaded_at or with an unknown frequency", () => {
    expect(freshness({ frequency_default: "M" }, now)).toEqual({
      status: "unknown",
      lastPeriod: null,
      loadedDate: null,
      ageDays: null,
    });
    expect(freshness({ frequency_default: "M", loaded_at: "not a date" }, now).status).toBe("unknown");
    expect(freshness({ frequency_default: "X", loaded_at: daysBefore(1) }, now).status).toBe("unknown");
    expect(freshness({ frequency_default: null, loaded_at: daysBefore(1) }, now).status).toBe("unknown");
  });

  it("covers every frequency with a stale limit", () => {
    expect(Object.keys(STALE_AFTER_DAYS).sort()).toEqual(["A", "D", "M", "Q", "S", "W"]);
  });

  it("reads the fixture's population KPI", () => {
    const catalog = JSON.parse(readFileSync(new URL("../fixtures/v1/catalog/catalog.json", import.meta.url), "utf8")) as {
      kpis: { kpi_key: string; frequency_default?: string; last_period?: string; loaded_at?: string }[];
    };
    const population = catalog.kpis.find((kpi) => kpi.kpi_key === "population");
    expect(population).toBeDefined();
    const result = freshness(population ?? {}, now);
    expect(result.loadedDate).not.toBeNull();
    expect(result.lastPeriod).toBe(population?.last_period);
  });
});
