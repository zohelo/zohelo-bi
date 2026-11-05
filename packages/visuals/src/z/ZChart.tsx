// <ZChart>: every chart type of the design template, drawn as SVG at the real pixel width of its container with
// fixed font sizes (never a scaled viewBox), with hover and keyboard read-out.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { drawAreaShare, drawColumns, drawContributions, drawLineBand, drawLineHighlight, drawSmallMultiples } from "./drawTime";
import { drawBullet, drawDiverging, drawDumbbell, drawGroupedBars, drawRankedBars, drawSlope, drawWaterfall } from "./drawBars";
import {
  drawHeatmap,
  drawHistogram,
  drawPyramid,
  drawScatter,
  drawSegmented,
  drawSparklineTable,
  drawStacked,
  drawTileMap,
} from "./drawOther";
import {
  drawArea,
  drawBoxplot,
  drawBump,
  drawChoropleth,
  drawCombo,
  drawDotPlot,
  drawLollipop,
  drawRankingTable,
  drawStackedArea,
  drawStackedColumns,
  drawTreemap,
} from "./drawMore";
import { drawBridge, drawIbcsBars, drawIbcsColumns, drawVarianceBars, drawVarianceColumns } from "./drawVariance";
import { textWidth } from "./format";
import { COL, Draw, r, type Ctx, type Scene, type Stop } from "./scene";
import type { ChartType, ZChartProps } from "./types";
import "./zchart.css";

/** Width used before the container is measured (SSR, tests). */
export const DEFAULT_WIDTH = 640;
/** Below this chart width the phone layout is used (fewer ticks, shortened labels). */
export const PHONE_WIDTH = 480;

const DRAW: Record<ChartType, (c: Ctx) => Scene> = {
  "line-band": drawLineBand,
  "line-highlight": drawLineHighlight,
  columns: drawColumns,
  contributions: drawContributions,
  "small-multiples": drawSmallMultiples,
  "area-share": drawAreaShare,
  "ranked-bars": drawRankedBars,
  "grouped-bars": drawGroupedBars,
  dumbbell: drawDumbbell,
  slope: drawSlope,
  "diverging-bars": drawDiverging,
  bullet: drawBullet,
  waterfall: drawWaterfall,
  "stacked-bars": drawStacked,
  "segmented-bar": drawSegmented,
  pyramid: drawPyramid,
  histogram: drawHistogram,
  scatter: drawScatter,
  "tile-map": drawTileMap,
  heatmap: drawHeatmap,
  "sparkline-table": drawSparklineTable,
  area: drawArea,
  "stacked-area": drawStackedArea,
  "stacked-columns": drawStackedColumns,
  combo: drawCombo,
  bump: drawBump,
  lollipop: drawLollipop,
  "dot-plot": drawDotPlot,
  "ranking-table": drawRankingTable,
  treemap: drawTreemap,
  boxplot: drawBoxplot,
  choropleth: drawChoropleth,
  "ibcs-columns": drawIbcsColumns,
  "ibcs-bars": drawIbcsBars,
  "variance-columns": drawVarianceColumns,
  "variance-bars": drawVarianceBars,
  bridge: drawBridge,
};

const HEIGHT: Partial<Record<ChartType, [number, number]>> = {
  slope: [260, 250],
  pyramid: [260, 240],
  scatter: [280, 260],
  "segmented-bar": [220, 220],
  "line-highlight": [250, 230],
  contributions: [260, 240],
  bump: [280, 260],
  boxplot: [280, 250],
  bridge: [280, 250],
  combo: [260, 240],
};

/** Lays out one chart at a pixel width. Exported for tests and server rendering. */
export function buildScene(p: ZChartProps, width: number): Scene {
  const W = Math.max(200, Math.round(width));
  const phone = W < PHONE_WIDTH;
  const [hd, hp] = HEIGHT[p.type] ?? [240, 220];
  const H = p.height ? (phone ? Math.min(p.height, hp + 20) : p.height) : phone ? hp : hd;
  const draw = DRAW[p.type];
  const c: Ctx = { p, W, H, phone, lang: p.lang, unit: p.unit, d: new Draw() };
  return draw ? draw(c) : { height: H, els: [], stops: [], pick: "x" };
}

function useMeasuredSize(ref: RefObject<HTMLDivElement | null>): { w: number | null; h: number | null } {
  const [size, setSize] = useState<{ w: number | null; h: number | null }>({ w: null, h: null });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const cw = Math.floor(entries[0]?.contentRect.width ?? 0);
      const ch = Math.floor(entries[0]?.contentRect.height ?? 0);
      if (cw > 0) setSize((prev) => (prev.w === cw && Math.abs((prev.h ?? 0) - ch) < 3 ? prev : { w: cw, h: ch }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function nearest(stops: Stop[], pick: Scene["pick"], x: number, y: number): number {
  let best = -1;
  let bd = Infinity;
  stops.forEach((s, i) => {
    const dist = pick === "x" ? Math.abs(s.x - x) : pick === "y" ? Math.abs(s.y - y) : Math.hypot(s.x - x, s.y - y);
    if (dist < bd) {
      bd = dist;
      best = i;
    }
  });
  return best;
}

function step(scene: Scene, from: number, key: string): number {
  const n = scene.stops.length;
  if (!n) return -1;
  if (key === "Home") return 0;
  if (key === "End") return n - 1;
  const nav = scene.nav ?? { kind: "linear" };
  const back = key === "ArrowLeft" || key === "ArrowUp";
  const vertical = key === "ArrowUp" || key === "ArrowDown";
  if (nav.kind === "grid" && vertical) {
    const to = from + (back ? -nav.cols : nav.cols);
    return to >= 0 && to < n ? to : from;
  }
  if (nav.kind === "spatial") {
    const cur = scene.stops[from]!;
    const dx = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;
    const dy = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0;
    let best = from;
    let bd = Infinity;
    scene.stops.forEach((s, i) => {
      if (i === from) return;
      const px = (s.x - cur.x) * dx + (s.y - cur.y) * dy;
      if (px <= 2) return;
      const off = Math.abs((s.x - cur.x) * dy) + Math.abs((s.y - cur.y) * dx);
      const score = px + off * 2;
      if (score < bd) {
        bd = score;
        best = i;
      }
    });
    return best;
  }
  return Math.max(0, Math.min(n - 1, from + (back ? -1 : 1)));
}

const KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]);

export function ZChart(props: ZChartProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const measured = useMeasuredSize(wrap);
  const W = props.width ?? measured.w ?? DEFAULT_WIDTH;
  const base = useMemo(() => buildScene(props, W), [props, W]);
  // fill: the wrapper stretches with its card (the svg is positioned inside it, so it never pushes the card
  // taller); when the card offers more height than the chart needs, redraw at that height.
  const fill = !!props.fill && W >= PHONE_WIDTH;
  const offered = fill && measured.h ? measured.h : 0;
  const scene = useMemo(() => {
    if (!offered || offered <= base.height + 8) return base;
    const grown = buildScene({ ...props, height: offered }, W);
    return grown.height <= offered + 1 ? grown : base;
  }, [base, offered, props, W]);
  const [active, setActive] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const n = scene.stops.length;
  const idx = active === null || !n ? null : Math.min(active, n - 1);
  const stop = idx === null ? undefined : scene.stops[idx];
  const Wpx = Math.max(200, Math.round(W));

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const k = box.width ? Wpx / box.width : 1;
    const i = nearest(scene.stops, scene.pick, (e.clientX - box.left) * k, (e.clientY - box.top) * k);
    if (i >= 0) {
      setActive(i);
      setKeyboard(false);
    }
  };
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "Escape") {
      setActive(null);
      return;
    }
    if (!KEYS.has(e.key) || !n) return;
    e.preventDefault();
    const from = idx ?? (scene.initial === "last" ? n - 1 : 0);
    setActive(idx === null ? from : step(scene, from, e.key));
    setKeyboard(true);
  };

  let tip: { left: number; top: number } | null = null;
  if (stop) {
    const tw = Math.max(textWidth(stop.title, 12), ...stop.rows.map((row) => textWidth(`${row.label} ${row.value}`, 13, 600) + 34)) + 22;
    const th = 24 + stop.rows.length * 19;
    let left = stop.x + 14;
    if (left + tw > Wpx) left = stop.x - 14 - tw;
    left = Math.max(0, Math.min(left, Wpx - tw));
    const top = Math.max(0, Math.min(stop.y - th / 2, scene.height - th));
    tip = { left, top };
  }
  const spoken = stop ? `${stop.title}: ${stop.rows.map((row) => `${row.label} ${row.value}`).join(", ")}` : "";

  return (
    <div className={fill ? "zc zc--fill" : "zc"} ref={wrap} data-type={props.type} style={fill ? { minHeight: base.height } : undefined}>
      <svg
        className="zc-plot"
        role="img"
        aria-label={props.ariaLabel}
        tabIndex={0}
        width={Wpx}
        height={scene.height}
        viewBox={`0 0 ${Wpx} ${scene.height}`}
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          if (!keyboard) setActive(null);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (active === null && n) {
            setActive(scene.initial === "last" ? n - 1 : 0);
            setKeyboard(true);
          }
        }}
        onBlur={() => {
          setActive(null);
          setKeyboard(false);
        }}
      >
        <g aria-hidden="true">
          {stop?.band ? (
            <rect x={r(stop.band[0])} y={r(stop.band[1])} width={r(stop.band[2])} height={r(stop.band[3])} fill={COL.muted} rx={3} />
          ) : null}
          {scene.els}
          {stop?.guide ? (
            <path
              d={`M${r(stop.guide[0])} ${r(stop.guide[1])}L${r(stop.guide[2])} ${r(stop.guide[3])}`}
              stroke={COL.referenceLight}
              strokeWidth={1}
            />
          ) : null}
          {stop?.outline ? (
            <rect
              x={r(stop.outline[0])}
              y={r(stop.outline[1])}
              width={r(stop.outline[2])}
              height={r(stop.outline[3])}
              fill="none"
              stroke={COL.ink}
              strokeWidth={2}
              rx={3}
            />
          ) : null}
          {stop?.dots?.map((d, i) => (
            <circle key={i} cx={r(d.x)} cy={r(d.y)} r={4.5} fill={d.color} stroke={COL.surface} strokeWidth={1.5} />
          ))}
        </g>
      </svg>
      {stop && tip ? (
        <div className="zt-tooltip zc-tip" style={{ left: tip.left, top: tip.top }} aria-hidden="true">
          <span className="zc-tip__title">{stop.title}</span>
          {stop.rows.map((row, i) => (
            <span className="zc-tip__row" key={i}>
              {row.color ? <i style={{ background: row.color }} /> : <i className="zc-tip__none" />}
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </span>
          ))}
        </div>
      ) : null}
      <span className="zt-sr" aria-live="polite">
        {keyboard ? spoken : ""}
      </span>
    </div>
  );
}
