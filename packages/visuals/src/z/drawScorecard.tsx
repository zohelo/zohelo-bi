// Scorecard (national dashboard research 2026-11-09, docs/national-dashboard-research.md): indicators judged
// against an official yardstick (Maastricht criteria, MIP thresholds, EU 2030 targets). One row per indicator:
// name and how it is measured, a 5-year trend, Poland's value, the yardstick, the EU-27 value and the verdict in
// words with a mark (colour is never the only carrier). The verdict comes from the data layer (`scorecard` rows);
// the chart only draws it, so the rule stays in one place (packages/semantic yardsticks).

import { fitText, fmtVal, periodLabel, textWidth } from "./format";
import { COL, linePath, type Ctx, type Scene, type Stop } from "./scene";
import { extent } from "./scale";
import type { ZChartProps, ZScoreRow } from "./types";

export function verdictWord(v: ZScoreRow["verdict"], lang: "pl" | "en"): string {
  const pl = lang === "pl";
  return v === "meets" ? (pl ? "spełnia" : "meets") : v === "misses" ? (pl ? "nie spełnia" : "misses") : pl ? "brak progu" : "no threshold";
}

/** Rows in series order with their unit and formatted texts (shared by the chart and its table). */
export function scoreRows(p: ZChartProps) {
  const rows = p.scorecard ?? [];
  return p.series.map((s) => {
    const r = rows.find((x) => x.id === s.id);
    const u = s.unit ?? p.unit;
    return {
      s,
      measure: r?.measure ?? "",
      value: r?.value === null || r?.value === undefined ? "–" : fmtVal(r.value, r.valueUnit ?? u, p.lang),
      period: r?.period ? periodLabel(r.period, p.lang) : "",
      yardstick: r?.yardstick ?? "–",
      eu: r?.eu === null || r?.eu === undefined ? "–" : fmtVal(r.eu, r.valueUnit ?? u, p.lang),
      verdict: r?.verdict ?? "none",
      word: verdictWord(r?.verdict ?? "none", p.lang),
      note: r?.note ?? "",
    };
  });
}

export function drawScorecard(c: Ctx): Scene {
  const { d } = c;
  const pl = c.lang === "pl";
  const rows = scoreRows(c.p);
  const head = { size: 11, weight: 500 } as const;
  const verW = Math.max(textWidth(pl ? "Ocena" : "Verdict", 11, 500), ...rows.map((r) => textWidth(r.word, 12, 600) + 18));
  const euW = c.phone ? 0 : Math.max(textWidth(pl ? "UE-27" : "EU-27", 11, 500), ...rows.map((r) => textWidth(r.eu, 12)));
  const ydW = c.phone
    ? 0
    : Math.min(200, Math.max(textWidth(pl ? "Próg" : "Yardstick", 11, 500), ...rows.map((r) => textWidth(r.yardstick, 12))));
  const here = pl ? "Polska" : "Poland";
  const valW = Math.max(textWidth(here, 11, 500), ...rows.map((r) => textWidth(r.value, 13, 600)));
  const sparkW = c.phone ? 0 : Math.min(110, c.W * 0.14);
  const gap = c.phone ? 12 : 18;
  const xVer = c.W - verW;
  const xEu1 = xVer - gap;
  const xYd0 = xEu1 - euW - (c.phone ? 0 : gap) - ydW;
  const xVal1 = c.phone ? xVer - gap : xYd0 - gap;
  const xSpark1 = xVal1 - valW - gap;
  const xSpark0 = xSpark1 - sparkW;
  const nameW = (c.phone ? xSpark1 : xSpark0) - 12;
  const pitch = 44;
  const top = 26;
  d.text(0, 16, pl ? "Wskaźnik" : "Indicator", head);
  if (!c.phone) d.text(xSpark0, 16, pl ? "Trend" : "Trend", head);
  d.text(xVal1, 16, here, { ...head, anchor: "end" });
  if (!c.phone) {
    d.text(xYd0, 16, pl ? "Próg" : "Yardstick", head);
    d.text(xEu1, 16, pl ? "UE-27" : "EU-27", { ...head, anchor: "end" });
  }
  d.text(xVer, 16, pl ? "Ocena" : "Verdict", head);
  const stops: Stop[] = [];
  rows.forEach((r, i) => {
    const y = top + i * pitch;
    d.line(0, y, c.W, y, COL.line, 1);
    d.text(0, y + 19, fitText(r.s.label, 12, nameW, 500), { tone: "ink", size: 12, weight: 500 });
    if (r.measure) d.text(0, y + 35, fitText(r.measure, 11, nameW), { tone: "ink-3", size: 11 });
    if (!c.phone) {
      const ys = r.s.points.map((p) => p.y);
      const [lo, hi] = extent(ys);
      const n = Math.max(1, r.s.points.length - 1);
      const pts = r.s.points.map((p, k) =>
        p.y === null ? null : { x: xSpark0 + (k / n) * sparkW, y: y + 34 - ((p.y - lo) / (hi - lo || 1)) * 22 },
      );
      d.path(linePath(pts), COL.series(1), 1.5);
      const lastPt = [...pts].reverse().find(Boolean);
      if (lastPt) d.circle(lastPt.x, lastPt.y, 2.5, COL.series(1), false);
    }
    d.text(xVal1, y + 20, r.value, { anchor: "end", tone: "ink", weight: 600, size: 13 });
    if (r.period) d.text(xVal1, y + 35, r.period, { anchor: "end", tone: "ink-3", size: 11 });
    if (!c.phone) {
      d.text(xYd0, y + 20, fitText(r.yardstick, 12, ydW), { tone: "ink-2", size: 12 });
      d.text(xEu1, y + 20, r.eu, { anchor: "end", tone: "ink-2", size: 12 });
    }
    // Verdict: a mark in the change colour (✓ meets, ✕ misses, – none) and the word in ink.
    const cy = y + 16;
    if (r.verdict === "meets") {
      d.circle(xVer + 6, cy, 6, COL.good, false);
      d.path(`M${xVer + 3},${cy} l2.2,2.2 l4,-4.4`, COL.surface, 1.6, { cap: "round" });
    } else if (r.verdict === "misses") {
      d.circle(xVer + 6, cy, 6, COL.bad, false);
      d.path(`M${xVer + 3.6},${cy - 2.4} l4.8,4.8 M${xVer + 8.4},${cy - 2.4} l-4.8,4.8`, COL.surface, 1.6, { cap: "round" });
    } else d.line(xVer + 2, cy, xVer + 10, cy, COL.lineStrong, 2);
    d.text(xVer + 18, y + 20, r.word, { tone: r.verdict === "none" ? "ink-3" : "ink", weight: r.verdict === "none" ? 400 : 600, size: 12 });
    stops.push({
      x: xVal1,
      y: y + 8,
      title: r.s.label,
      rows: [
        { label: r.measure || (pl ? "Polska" : "Poland"), value: `${r.value}${r.period ? ` (${r.period})` : ""}`, color: COL.series(1) },
        { label: pl ? "Próg" : "Yardstick", value: r.yardstick },
        { label: "UE-27", value: r.eu },
        { label: pl ? "Ocena" : "Verdict", value: r.note ? `${r.word}: ${r.note}` : r.word },
      ],
      band: [0, y, c.W, pitch],
    });
  });
  const end = top + rows.length * pitch;
  d.line(0, end, c.W, end, COL.line, 1);
  return { height: end + 2, els: d.els, stops, pick: "y" };
}
