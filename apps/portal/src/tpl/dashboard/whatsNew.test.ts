import { describe, expect, it } from "vitest";
import type { Kpi, Latest } from "../../data";
import { latestReleases, releaseCalendar, topMoves, unusualMove } from "./whatsNew";

const pts = (vals: number[]) => vals.map((value, i) => ({ period: String(2010 + i), value }));

describe("what's new on the dashboards landing", () => {
  it("measures the latest change against the series' own history and names the last as large one", () => {
    const m = unusualMove(pts([10, 11, 12, 13, 18, 19, 20, 21, 22, 23, 24, 29]))!;
    expect(m.change).toBe(5);
    expect(m.since).toBe("2014"); // the rise of 5 in 2014 was as large
    expect(m.z).toBeGreaterThan(2);
    expect(m.span).toBe(7);
    const record = unusualMove(pts([10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 24, 12]))!;
    expect(record.since).toBeNull(); // the largest fall in the window
    expect(record.from).toBe("2010");
  });
  it("gives nothing for short, flat or unchanged series", () => {
    expect(unusualMove(pts([1, 2, 3]))).toBeNull();
    expect(unusualMove(pts([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]))).toBeNull();
    expect(unusualMove(pts([1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 2]))).toBeNull();
  });
  it("keeps only clearly unusual moves, strongest first", () => {
    const a = { id: "a", move: unusualMove(pts([10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 24, 12])) };
    const b = { id: "b", move: unusualMove(pts([1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2])) };
    expect(topMoves([b, a]).map((x) => x.id)).toEqual(["a"]);
    // A large move that was matched two periods ago is not news.
    const c = { id: "c", move: unusualMove(pts([10, 11, 12, 13, 14, 15, 16, 17, 18, 25, 26, 33])) };
    expect(c.move!.span).toBe(2);
    expect(topMoves([c])).toEqual([]);
  });
  it("groups the newest periods per frequency and lists the coming releases", () => {
    const k = (kpi_key: string, frequency: Kpi["frequency"]) => ({ kpi_key, frequency }) as Kpi;
    const l = (kpi_key: string, period: string, next_release: string | null) =>
      [kpi_key, { kpi_key, period, next_release } as Latest] as const;
    const kpis = [k("a", "M"), k("b", "M"), k("c", "Q"), k("d", "A")];
    const latest = new Map([
      l("a", "2026-09", "2026-11-17"),
      l("b", "2026-08", "2026-11-17"),
      l("c", "2026-Q2", "2026-11-28"),
      l("d", "2025", null),
    ]);
    const rel = latestReleases(kpis, latest);
    expect(rel.map((g) => [g.period, g.kpis.map((x) => x.kpi_key)])).toEqual([
      ["2026-09", ["a"]],
      ["2026-Q2", ["c"]],
      ["2025", ["d"]],
    ]);
    expect(releaseCalendar(kpis, latest, "2026-11-09").map((e) => [e.date, e.kpis.length])).toEqual([
      ["2026-11-17", 2],
      ["2026-11-28", 1],
    ]);
    expect(releaseCalendar(kpis, latest, "2026-11-20")).toHaveLength(1);
  });
});
