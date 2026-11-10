// Chart library v2, space and flow: proportional symbol map (kartodiagram) on the voivodeship outlines, and the
// two-stage Sankey diagram. Same rules as the rest of the library: real pixel size, text ≥ 11px, tokens only.

import { fitText, fmtNum, fmtVal, textWidth } from "./format";
import { classOf } from "./scale";
import { COL, catLabel, r, rampColors, type Ctx, type Scene, type Stop } from "./scene";
import { breaksFor, classLabels } from "./drawOther";
import { POLAND_BOX, VOIVODESHIP_CENTROIDS, VOIVODESHIP_PATHS } from "./polandMap";
import { VOIVODESHIP_TILES, tileValues } from "./tiles";
import type { ZChartProps, ZSeries } from "./types";

// ---------- symbol map

/** Circle radius with the area proportional to |value| (the largest value gets `rMax`). */
export function symbolRadius(v: number, vMax: number, rMax: number): number {
  return vMax > 0 ? rMax * Math.sqrt(Math.abs(v) / vMax) : 0;
}

/** The sized series (first whose id is not "rate") and the optional rate series that colours the regions. */
export function symbolSeries(p: ZChartProps): { size: ZSeries | undefined; rate: ZSeries | undefined } {
  return { size: p.series.find((s) => s.id !== "rate"), rate: p.series.find((s) => s.id === "rate") };
}

/** Largest 1, 2 or 5 × 10ⁿ not above x. */
function niceBelow(x: number): number {
  const e = Math.pow(10, Math.floor(Math.log10(x)));
  const m = x / e;
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * e;
}

/** 2–3 rounded legend values: the largest round value under the maximum, then about a third and a tenth of it. */
export function symbolLegendValues(vMax: number): number[] {
  if (!(vMax > 0)) return [];
  const top = niceBelow(vMax);
  const out = [top, niceBelow(top / 2.5), niceBelow(top / 8)];
  return out.filter((v, i) => out.indexOf(v) === i);
}

/** Compact value for circle labels: "5,5 mln", "830 tys." / "5.5m". */
function compact(v: number, unit: ZChartProps["unit"], lang: "pl" | "en"): string {
  const a = Math.abs(v);
  if (a >= 1e6) return `${fmtNum(v / 1e6, lang, Number.isInteger(v / 1e6) ? 0 : 1)} ${lang === "pl" ? "mln" : "m"}`;
  if (a >= 1e4) return `${fmtNum(v / 1e3, lang, 0)} ${lang === "pl" ? "tys." : "k"}`;
  return fmtNum(v, lang, unit.decimals);
}

export function drawSymbolMap(c: Ctx): Scene {
  const { d } = c;
  const pl = c.lang === "pl";
  const { size, rate } = symbolSeries(c.p);
  const values = tileValues(size);
  const rates = tileValues(rate);
  const ramp = !!c.p.opts?.ramp && !!rate;
  const rateNums = [...rates.values()].filter((v): v is number => v !== null);
  const breaks = ramp ? breaksFor(c.p, rateNums, 4) : [];
  const colors = rampColors(4);
  const cls = ramp ? classLabels(breaks, rate?.unit ?? c.unit, c.lang) : [];
  const maxH = c.p.height ?? (c.phone ? 320 : 400);
  const k = Math.min(c.W / POLAND_BOX.width, maxH / POLAND_BOX.height);
  const w = POLAND_BOX.width * k;
  const h = POLAND_BOX.height * k;
  const ox = (c.W - w) / 2;
  const oy = 2;
  const hl = c.p.highlight;
  const regions = Object.entries(VOIVODESHIP_PATHS);
  d.add((key) => (
    <g key={key} transform={`translate(${ox.toFixed(1)} ${oy}) scale(${k.toFixed(4)})`}>
      {regions.map(([g, path]) => {
        const v = rates.get(g) ?? null;
        const ci = ramp && v !== null ? classOf(v, breaks) : -1;
        return (
          <path
            key={g}
            d={path}
            fill={ci < 0 ? COL.muted : colors[ci]}
            stroke={g === hl ? COL.ink : ramp ? COL.surface : COL.lineStrong}
            strokeWidth={g === hl ? 2.5 : 1}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        );
      })}
    </g>
  ));
  const nums = [...values.values()].filter((v): v is number => v !== null);
  const vMax = Math.max(0, ...nums.map(Math.abs));
  const rMax = Math.max(12, Math.min(w, h) * 0.085);
  const fill = ramp ? COL.reference : COL.series(1);
  const tiles = new Map(VOIVODESHIP_TILES.map((t) => [t.key, t]));
  const items = regions
    .map(([g]) => {
      const [cx0, cy0] = VOIVODESHIP_CENTROIDS[g] ?? [0, 0];
      const v = values.get(g) ?? null;
      return { g, x: ox + cx0 * k, y: oy + cy0 * k, v, rad: v === null ? 0 : symbolRadius(v, vMax, rMax) };
    })
    .sort((a, b) => b.rad - a.rad); // small circles on top
  for (const it of items) {
    if (it.rad <= 0) continue;
    d.add((key) => (
      <circle
        key={key}
        cx={r(it.x)}
        cy={r(it.y)}
        r={r(it.rad)}
        fill={fill}
        fillOpacity={0.72}
        stroke={it.g === hl ? COL.ink : COL.surface}
        strokeWidth={it.g === hl ? 2 : 1}
      />
    ));
  }
  for (const it of items) {
    if (it.v === null) continue;
    const t = compact(it.v, c.unit, c.lang);
    if (textWidth(t, 11, 600) <= it.rad * 2 - 4) d.text(it.x, it.y + 4, t, { anchor: "middle", tone: "inverse", weight: 600 });
  }
  // legend: nested reference circles under the map
  const lv = symbolLegendValues(vMax);
  let height = oy + h + 6;
  if (lv.length) {
    const rl = symbolRadius(lv[0]!, vMax, rMax);
    const base = height + 2 * rl + 4;
    const cx = 4 + rl;
    lv.forEach((v) => {
      const rad = symbolRadius(v, vMax, rMax);
      d.add((key) => <circle key={key} cx={r(cx)} cy={r(base - rad)} r={r(rad)} fill="none" stroke={COL.reference} strokeWidth={1} />);
      const ty = base - 2 * rad;
      d.line(cx, ty, cx + rl + 10, ty, COL.referenceLight, 1);
      const label = `${compact(v, c.unit, c.lang)}${c.unit.symbol && c.unit.symbol !== "%" ? ` ${c.unit.symbol}` : ""}`;
      d.text(cx + rl + 14, ty + 4, label, { tone: "ink-2" });
    });
    height = base + 6;
  }
  const stops: Stop[] = [];
  for (const it of items.slice().sort((a, b) => a.g.localeCompare(b.g))) {
    const t = tiles.get(it.g);
    const rv = rates.get(it.g) ?? null;
    const ci = ramp && rv !== null ? classOf(rv, breaks) : -1;
    const box = Math.max(it.rad, 12);
    stops.push({
      x: it.x,
      y: it.y,
      title: c.p.categories?.find((q) => q.key === it.g)?.label ?? (pl ? t?.name_pl : t?.name_en) ?? it.g,
      rows: [
        { label: size?.label ?? "", value: fmtVal(it.v, c.unit, c.lang), color: fill },
        ...(rate
          ? [
              {
                label: rate.label,
                value: `${fmtVal(rv, rate.unit ?? c.unit, c.lang)}${ci >= 0 ? ` (${cls[ci]})` : ""}`,
                color: ci >= 0 ? colors[ci] : undefined,
              },
            ]
          : []),
      ],
      outline: [it.x - box, it.y - box, box * 2, box * 2],
    });
  }
  return { height, els: d.els, stops, pick: "xy", nav: { kind: "spatial" } };
}

// ---------- Sankey (two stages)

export type SankeyNode = { key: string; side: "from" | "to"; label: string; total: number; y: number; h: number };
export type SankeyLink = { from: string; to: string; value: number; y0: number; y1: number; h: number };

/** Flows of series[0]: x = "from>to", y = flow (positive only). */
export function sankeyFlows(p: ZChartProps): { from: string; to: string; value: number }[] {
  const out: { from: string; to: string; value: number }[] = [];
  for (const pt of p.series[0]?.points ?? []) {
    const [from, to] = pt.x.split(">");
    if (!from || !to || pt.y === null || !(pt.y > 0)) continue;
    out.push({ from: from.trim(), to: to.trim(), value: pt.y });
  }
  return out;
}

/**
 * Two-column layout: origin nodes on the left, destination nodes on the right, each sized by its total; nodes keep
 * the categories order (else largest first) and links stack at each node in the order of the other side's nodes.
 */
export function sankeyLayout(p: ZChartProps, top: number, bottom: number): { nodes: SankeyNode[]; links: SankeyLink[] } {
  const flows = sankeyFlows(p);
  const order = new Map((p.categories ?? []).map((k, i) => [k.key, i]));
  const side = (s: "from" | "to") => {
    const tot = new Map<string, number>();
    for (const f of flows) tot.set(f[s], (tot.get(f[s]) ?? 0) + f.value);
    return [...tot.entries()]
      .sort((a, b) => (order.size ? (order.get(a[0]) ?? 1e9) - (order.get(b[0]) ?? 1e9) : 0) || b[1] - a[1])
      .map(([key, total]) => ({ key, total }));
  };
  const L = side("from");
  const R = side("to");
  const sum = flows.reduce((a, b) => a + b.value, 0) || 1;
  const gap = 8;
  const n = Math.max(L.length, R.length);
  const k = Math.max(0, bottom - top - gap * (n - 1)) / sum;
  const nodes: SankeyNode[] = [];
  const stack = (list: { key: string; total: number }[], s: "from" | "to") => {
    const used = list.reduce((a, b) => a + b.total * k, 0) + gap * (list.length - 1);
    let y = top + (bottom - top - used) / 2;
    for (const it of list) {
      nodes.push({ key: it.key, side: s, label: catLabel(p, it.key), total: it.total, y, h: it.total * k });
      y += it.total * k + gap;
    }
  };
  stack(L, "from");
  stack(R, "to");
  const node = (key: string, s: "from" | "to") => nodes.find((q) => q.key === key && q.side === s)!;
  const li = new Map(L.map((x, i) => [x.key, i]));
  const ri = new Map(R.map((x, i) => [x.key, i]));
  const outY = new Map(L.map((x) => [x.key, node(x.key, "from").y]));
  const inY = new Map(R.map((x) => [x.key, node(x.key, "to").y]));
  const links: SankeyLink[] = [];
  const byFrom = flows.slice().sort((a, b) => li.get(a.from)! - li.get(b.from)! || ri.get(a.to)! - ri.get(b.to)!);
  const y0s = new Map<(typeof flows)[number], number>();
  for (const f of byFrom) {
    y0s.set(f, outY.get(f.from)!);
    outY.set(f.from, outY.get(f.from)! + f.value * k);
  }
  const byTo = flows.slice().sort((a, b) => ri.get(a.to)! - ri.get(b.to)! || li.get(a.from)! - li.get(b.from)!);
  for (const f of byTo) {
    links.push({ from: f.from, to: f.to, value: f.value, y0: y0s.get(f)!, y1: inY.get(f.to)!, h: f.value * k });
    inY.set(f.to, inY.get(f.to)! + f.value * k);
  }
  links.sort((a, b) => li.get(a.from)! - li.get(b.from)! || ri.get(a.to)! - ri.get(b.to)!);
  return { nodes, links };
}

export function drawSankey(c: Ctx): Scene {
  const { d } = c;
  const pl = c.lang === "pl";
  const s = c.p.series[0];
  const flows = sankeyFlows(c.p);
  const nodeCount = Math.max(new Set(flows.map((f) => f.from)).size, new Set(flows.map((f) => f.to)).size);
  const height = Math.max(c.H, nodeCount * 34 + 16);
  const top = 8;
  const bottom = height - 8;
  const { nodes, links } = sankeyLayout(c.p, top, bottom);
  const label = (n: SankeyNode) => (c.phone ? catLabel(c.p, n.key, true) : n.label);
  const val = (v: number) => fmtNum(v, c.lang, c.unit.decimals);
  const sideW = (sd: "from" | "to") =>
    Math.min(
      c.W * (c.phone ? 0.3 : 0.26),
      Math.max(30, ...nodes.filter((n) => n.side === sd).map((n) => Math.max(textWidth(label(n), 11, 600), textWidth(val(n.total), 11)))),
    );
  const nw = 10;
  const xl = sideW("from") + 10;
  const xr = c.W - sideW("to") - 10 - nw;
  const hl = c.p.highlight;
  const total = flows.reduce((a, b) => a + b.value, 0) || 1;
  const fromTotal = new Map(nodes.filter((n) => n.side === "from").map((n) => [n.key, n.total]));
  // links first (under the nodes)
  const xa = xl + nw;
  const xm = (xa + xr) / 2;
  for (const l of links) {
    const on = !!hl && (l.from === hl || l.to === hl);
    const dPath =
      `M${r(xa)} ${r(l.y0)}C${r(xm)} ${r(l.y0)} ${r(xm)} ${r(l.y1)} ${r(xr)} ${r(l.y1)}` +
      `L${r(xr)} ${r(l.y1 + l.h)}C${r(xm)} ${r(l.y1 + l.h)} ${r(xm)} ${r(l.y0 + l.h)} ${r(xa)} ${r(l.y0 + l.h)}Z`;
    d.path(dPath, "none", 0, { fill: on ? COL.series(1) : COL.context, opacity: on ? 0.55 : hl ? 0.2 : 0.35 });
  }
  for (const n of nodes) {
    const x = n.side === "from" ? xl : xr;
    d.rect(x, n.y, nw, Math.max(1, n.h), n.key === hl ? COL.series(1) : COL.reference, { rx: 1 });
    const tx = n.side === "from" ? xl - 6 : xr + nw + 6;
    const anchor = n.side === "from" ? "end" : "start";
    const room = n.side === "from" ? xl - 8 : c.W - tx;
    const cy = n.y + n.h / 2;
    const two = n.h >= 26;
    d.text(tx, two ? cy - 1 : cy + 4, fitText(label(n), 11, room, 600), { anchor, tone: "ink", weight: 600 });
    if (two) d.text(tx, cy + 13, val(n.total), { anchor, tone: "ink-2" });
  }
  const stops: Stop[] = [];
  const nodeStop = (n: SankeyNode): Stop => {
    const x = n.side === "from" ? xl : xr;
    return {
      x: x + nw / 2,
      y: n.y + n.h / 2,
      title: n.label,
      rows: [
        {
          label: n.side === "from" ? (pl ? "Razem (skąd)" : "Total out") : pl ? "Razem (dokąd)" : "Total in",
          value: fmtVal(n.total, c.unit, c.lang),
          color: COL.reference,
        },
        { label: pl ? "Udział w sumie" : "Share of all", value: `${fmtNum((n.total / total) * 100, c.lang, 1)}%` },
      ],
      outline: [x - 2, n.y - 2, nw + 4, Math.max(4, n.h + 4)],
    };
  };
  nodes.filter((n) => n.side === "from").forEach((n) => stops.push(nodeStop(n)));
  for (const l of links) {
    const ym = (l.y0 + l.y1 + l.h) / 2;
    stops.push({
      x: xm,
      y: ym,
      title: `${catLabel(c.p, l.from)} → ${catLabel(c.p, l.to)}`,
      rows: [
        { label: s?.label ?? "", value: fmtVal(l.value, c.unit, c.lang), color: COL.context },
        {
          label: pl ? "Udział w odpływie" : "Share of origin",
          value: `${fmtNum((l.value / (fromTotal.get(l.from) || 1)) * 100, c.lang, 1)}%`,
        },
      ],
      dots: [{ x: xm, y: ym, color: COL.reference }],
    });
  }
  nodes.filter((n) => n.side === "to").forEach((n) => stops.push(nodeStop(n)));
  return { height, els: d.els, stops, pick: "xy", nav: { kind: "spatial" } };
}
