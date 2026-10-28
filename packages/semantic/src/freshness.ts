// How fresh a published KPI is, judged from catalog.json (frequency_default, last_period, loaded_at).

export type Freshness = {
  status: "fresh" | "stale" | "unknown";
  lastPeriod: string | null;
  /** The first 10 characters (yyyy-mm-dd) of loaded_at, or null when it does not parse. */
  loadedDate: string | null;
  /** Whole days between loaded_at and now, or null when loaded_at does not parse. */
  ageDays: number | null;
};

/** Days after the last load from which a KPI of each frequency counts as stale. */
export const STALE_AFTER_DAYS: Record<string, number> = { D: 3, W: 10, M: 40, Q: 100, S: 200, A: 400 };

const DAY_MS = 24 * 60 * 60 * 1000;

export function freshness(
  kpi: { frequency_default?: string | null; last_period?: string | null; loaded_at?: string | null },
  now: Date,
): Freshness {
  const loadedAt = kpi.loaded_at ?? null;
  const loadedMs = loadedAt === null ? Number.NaN : Date.parse(loadedAt);
  const parses = loadedAt !== null && !Number.isNaN(loadedMs);
  const loadedDate = parses ? loadedAt.slice(0, 10) : null;
  const ageDays = parses ? Math.floor((now.getTime() - loadedMs) / DAY_MS) : null;
  const frequency = kpi.frequency_default ?? "";
  const limit = Object.hasOwn(STALE_AFTER_DAYS, frequency) ? STALE_AFTER_DAYS[frequency] : undefined;
  let status: Freshness["status"];
  if (ageDays === null || limit === undefined) status = "unknown";
  else if (ageDays > limit) status = "stale";
  else status = "fresh";
  return { status, lastPeriod: kpi.last_period ?? null, loadedDate, ageDays };
}
