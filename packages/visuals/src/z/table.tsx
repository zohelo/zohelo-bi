// Table view and legend of every chart type. The table carries every number the chart shows (the tooltip is never
// the only way to a value); the legend lists what is drawn, including band and reference.

import { fmtDiff, fmtNum, fmtSigned, periodLabel } from "./format";
import { contributions, heroIndex } from "./drawTime";
import { bandText, groupColors } from "./drawBars";
import { breaksFor, classLabels, heatGrid, scatterPoints, sparkRow } from "./drawOther";
import { classOf } from "./scale";
import { COL, catLabel, rampColors, seriesColor, valueAt, xKeys, type Ctx } from "./scene";
import { VOIVODESHIP_TILES, tileValues } from "./tiles";
import { boxStats, rankAt } from "./drawMore";
import type { ZChartProps, ZLegendItem, ZTable } from "./types";

function ctxOf(p: ZChartProps): Ctx {
  return { p, W: 640, H: 240, phone: false, lang: p.lang, unit: p.unit, d: undefined as never };
}

const isTimeType = (t: string) =>
  ["line-band", "line-highlight", "columns", "small-multiples", "area-share", "area", "stacked-area", "combo", "bump"].includes(t);

/** AC/FC, PY, optional PL, ΔPY and ΔPY% per x (variance charts). */
function varianceTable(p: ZChartProps, keys: string[], first: string): ZTable {
  const pl = p.lang === "pl";
  const by = (id: string) => p.series.find((s) => s.id.toUpperCase() === id);
  const ac = by("AC");
  const py = by("PY");
  const plan = by("PL");
  const fc = by("FC");
  const n = (v: number | null) => fmtNum(v, p.lang, p.unit.decimals);
  const columns = [first, "AC", ...(fc ? ["FC"] : []), "PY", ...(plan ? ["PL"] : []), "ΔPY", "ΔPY%"];
  const rows = keys.map((k) => {
    const a = valueAt(ac, k);
    const f = valueAt(fc, k);
    const b = valueAt(py, k);
    const v = a ?? f;
    const d = v !== null && b !== null ? v - b : null;
    const pc = d !== null && b ? (d / Math.abs(b)) * 100 : null;
    return [
      p.categories?.find((c) => c.key === k)?.label ?? p.formatPeriod?.(k) ?? periodLabel(k, p.lang),
      n(a),
      ...(fc ? [n(f)] : []),
      n(b),
      ...(plan ? [n(valueAt(plan, k))] : []),
      d === null ? "–" : fmtSigned(d, p.lang, p.unit.decimals),
      pc === null ? "–" : `${fmtSigned(pc, p.lang, 1)}%`,
    ];
  });
  return { caption: p.ariaLabel, columns: pl ? columns : columns, rows, numeric: columns.map((_, i) => i > 0) };
}

export function toTable(p: ZChartProps): ZTable {
  const pl = p.lang === "pl";
  const n = (v: number | null | undefined, dec = p.unit.decimals) => fmtNum(v, p.lang, dec);
  const rowLabel = (x: string) => {
    const c = p.categories?.find((k) => k.key === x);
    if (c) return c.label;
    if (p.formatPeriod) return p.formatPeriod(x);
    return periodLabel(x, p.lang);
  };
  const caption = p.ariaLabel;
  switch (p.type) {
    case "ibcs-columns":
    case "variance-columns":
      return varianceTable(p, xKeys(p), pl ? "Okres" : "Period");
    case "ibcs-bars":
    case "variance-bars": {
      const ac = p.series.find((s) => s.id.toUpperCase() === "AC");
      const keys = xKeys(p).sort((a, b) => (valueAt(ac, b) ?? -Infinity) - (valueAt(ac, a) ?? -Infinity));
      return varianceTable(p, keys, pl ? "Kategoria" : "Category");
    }
    case "bridge": {
      const s = p.series[0];
      const keys = xKeys(p, s ? [s] : []);
      let acc = p.reference?.value ?? 0;
      const rows = [[p.reference?.label ?? "PY", "–", n(acc)]];
      for (const k of keys) {
        const v = valueAt(s, k) ?? 0;
        acc += v;
        rows.push([rowLabel(k), fmtSigned(v, p.lang, p.unit.decimals), n(acc)]);
      }
      rows.push([p.totalLabel ?? "AC", "–", n(acc)]);
      return {
        caption,
        columns: [pl ? "Pozycja" : "Item", pl ? "Wkład do zmiany" : "Contribution", pl ? "Poziom" : "Level"],
        rows,
        numeric: [false, true, true],
      };
    }
    case "ranking-table": {
      const [cur, prev] = p.series;
      const keys = xKeys(p, cur ? [cur] : []).sort((a, b) => (valueAt(cur, b) ?? -Infinity) - (valueAt(cur, a) ?? -Infinity));
      const prevRank = prev
        ? rankAt(
            keys.map((k) => ({ id: k, label: k, points: [{ x: "p", y: valueAt(prev, k) }] })),
            "p",
          )
        : null;
      return {
        caption,
        columns: [
          pl ? "Miejsce" : "Rank",
          pl ? "Nazwa" : "Name",
          cur?.label ?? "",
          ...(prev ? [prev.label, pl ? "Zmiana" : "Change", pl ? "Poprzednie miejsce" : "Previous rank"] : []),
        ],
        rows: keys.map((k, i) => {
          const a = valueAt(prev, k);
          const b = valueAt(cur, k);
          return [
            String(i + 1),
            rowLabel(k),
            n(b),
            ...(prev ? [n(a), a === null || b === null ? "–" : fmtDiff(b - a, p.unit, p.lang), String(prevRank?.get(k) ?? "–")] : []),
          ];
        }),
        numeric: [true, false, true, ...(prev ? [true, true, true] : [])],
      };
    }
    case "boxplot": {
      const hl = p.highlight;
      const hlLabel = hl ? (p.categories?.find((c) => c.key === hl)?.label ?? hl) : null;
      return {
        caption,
        columns: [
          pl ? "Grupa" : "Group",
          "Min",
          pl ? "Kwartyl dolny" : "Lower quartile",
          pl ? "Mediana" : "Median",
          pl ? "Kwartyl górny" : "Upper quartile",
          "Max",
          ...(hlLabel ? [hlLabel] : []),
        ],
        rows: p.series.map((g) => {
          const st = boxStats(g.points.map((q) => q.y));
          return [
            p.formatPeriod?.(g.label) ?? g.label,
            n(st?.min),
            n(st?.q1),
            n(st?.med),
            n(st?.q3),
            n(st?.max),
            ...(hl ? [n(valueAt(g, hl))] : []),
          ];
        }),
        numeric: [false, true, true, true, true, true, ...(hl ? [true] : [])],
      };
    }
    case "treemap": {
      const s = p.series[0];
      const keys = xKeys(p, s ? [s] : []).sort((a, b) => (valueAt(s, b) ?? 0) - (valueAt(s, a) ?? 0));
      const tot = keys.reduce((a, k) => a + Math.max(0, valueAt(s, k) ?? 0), 0) || 1;
      return {
        caption,
        columns: [pl ? "Część" : "Part", s?.label ?? "", pl ? "Udział, %" : "Share, %"],
        rows: keys.map((k) => [rowLabel(k), n(valueAt(s, k)), fmtNum(((valueAt(s, k) ?? 0) / tot) * 100, p.lang, 1)]),
        numeric: [false, true, true],
      };
    }
    case "bump": {
      const xs = xKeys(p);
      return {
        caption,
        columns: [pl ? "Okres" : "Period", ...p.series.map((s) => `${s.label} (${pl ? "miejsce" : "rank"})`)],
        rows: xs.map((x) => {
          const r = rankAt(p.series, x);
          return [rowLabel(x), ...p.series.map((s) => (r.get(s.id) ? `${r.get(s.id)}. · ${n(valueAt(s, x))}` : "–"))];
        }),
        numeric: [false, ...p.series.map(() => true)],
      };
    }
    case "lollipop":
    case "ranked-bars":
    case "diverging-bars": {
      const s = p.series[0];
      const keys = xKeys(p, s ? [s] : []).sort((a, b) => (valueAt(s, b) ?? -Infinity) - (valueAt(s, a) ?? -Infinity));
      const rows = keys.map((k) => [
        rowLabel(k),
        p.type === "diverging-bars" ? fmtSigned(valueAt(s, k) ?? 0, p.lang, p.unit.decimals) : n(valueAt(s, k)),
      ]);
      if (p.reference) rows.push([p.reference.label, n(p.reference.value)]);
      return { caption, columns: [pl ? "Kategoria" : "Category", s?.label ?? ""], rows, numeric: [false, true] };
    }
    case "bullet": {
      const s = p.series[0];
      const keys = xKeys(p, s ? [s] : []);
      const columns = [pl ? "Miara" : "Measure", s?.label ?? (pl ? "Wartość" : "Value")];
      if (p.reference) columns.push(p.reference.label);
      if (p.band) columns.push(p.bandLabel ?? (pl ? "Pasmo celu" : "Target range"));
      const c = ctxOf(p);
      return {
        caption,
        columns,
        rows: keys.map((k) => [
          rowLabel(k),
          n(valueAt(s, k)),
          ...(p.reference ? [n(p.reference.value)] : []),
          ...(p.band ? [bandText(c, p.band)] : []),
        ]),
        numeric: columns.map((_, i) => i > 0),
      };
    }
    case "dumbbell":
    case "slope": {
      const [a, b] = p.series;
      const keys = xKeys(p, p.series.slice(0, 2));
      if (p.type === "slope") keys.sort((x, y) => (valueAt(b, y) ?? 0) - (valueAt(b, x) ?? 0));
      return {
        caption,
        columns: [pl ? "Kategoria" : "Category", a?.label ?? "", b?.label ?? "", pl ? "Zmiana" : "Change"],
        rows: keys.map((k) => {
          const va = valueAt(a, k);
          const vb = valueAt(b, k);
          return [rowLabel(k), n(va), n(vb), va === null || vb === null ? "–" : fmtDiff(vb - va, p.unit, p.lang)];
        }),
        numeric: [false, true, true, true],
      };
    }
    case "contributions": {
      // every component (also those folded into "Pozostałe" in the chart) and the total, signed, in pp
      const { xs, total } = contributions(p);
      const sign = (v: number | null) => (v === null ? "–" : fmtSigned(v, p.lang, p.unit.decimals || 1));
      return {
        caption,
        columns: [pl ? "Okres" : "Period", ...p.series.map((s) => `${s.label}, pp`), `${total.label}, pp`],
        rows: xs.map((x) => [rowLabel(x), ...p.series.map((s) => sign(valueAt(s, x))), sign(total.at(x))]),
        numeric: [false, ...p.series.map(() => true), true],
      };
    }
    case "waterfall": {
      const s = p.series[0];
      const keys = xKeys(p, s ? [s] : []);
      let acc = 0;
      const rows = keys.map((k) => {
        const v = valueAt(s, k) ?? 0;
        acc += v;
        return [rowLabel(k), fmtSigned(v, p.lang, p.unit.decimals), n(acc)];
      });
      rows.push([p.totalLabel ?? (pl ? "Suma" : "Total"), n(acc), n(acc)]);
      return {
        caption,
        columns: [pl ? "Składnik" : "Component", pl ? "Wkład" : "Contribution", pl ? "Narastająco" : "Running total"],
        rows,
        numeric: [false, true, true],
      };
    }
    case "stacked-bars":
    case "segmented-bar": {
      if (p.type === "segmented-bar") {
        const s = p.series[0];
        const keys = xKeys(p, s ? [s] : []);
        const tot = keys.reduce((a, k) => a + Math.max(0, valueAt(s, k) ?? 0), 0) || 1;
        return {
          caption,
          columns: [pl ? "Część" : "Part", s?.label ?? "", pl ? "Udział, %" : "Share, %"],
          rows: keys.map((k) => [rowLabel(k), n(valueAt(s, k)), fmtNum(((valueAt(s, k) ?? 0) / tot) * 100, p.lang, 1)]),
          numeric: [false, true, true],
        };
      }
      const keys = xKeys(p);
      return {
        caption,
        columns: [pl ? "Kategoria" : "Category", ...p.series.map((s) => `${s.label}, %`)],
        rows: keys.map((k) => {
          const tot = p.series.reduce((a, s) => a + Math.max(0, valueAt(s, k) ?? 0), 0) || 1;
          return [rowLabel(k), ...p.series.map((s) => fmtNum(((valueAt(s, k) ?? 0) / tot) * 100, p.lang, 1))];
        }),
        numeric: [false, ...p.series.map(() => true)],
      };
    }
    case "pyramid": {
      const keys = xKeys(p, p.series.slice(0, 2));
      return {
        caption,
        columns: [pl ? "Wiek" : "Age", ...p.series.slice(0, 2).map((s) => s.label)],
        rows: keys
          .slice()
          .reverse()
          .map((k) => [rowLabel(k), ...p.series.slice(0, 2).map((s) => n(valueAt(s, k)))]),
        numeric: [false, true, true],
      };
    }
    case "histogram": {
      const s = p.series[0];
      const keys = xKeys(p, s ? [s] : []);
      const rows = keys.map((k) => [rowLabel(k), n(valueAt(s, k))]);
      if (p.reference) rows.push([p.reference.label, "–"]);
      return { caption, columns: [pl ? "Przedział" : "Bin", s?.label ?? ""], rows, numeric: [false, true] };
    }
    case "scatter": {
      const { xs, ys, ss, pts } = scatterPoints(p);
      return {
        caption,
        columns: [pl ? "Jednostka" : "Unit", xs?.label ?? "x", ys?.label ?? "y", ...(ss ? [ss.label] : [])],
        rows: pts.map((pt) => [
          rowLabel(pt.key),
          n(pt.x, xs?.unit?.decimals ?? p.unit.decimals),
          n(pt.y, ys?.unit?.decimals ?? p.unit.decimals),
          ...(ss ? [n(pt.s ?? null, ss.unit?.decimals ?? p.unit.decimals)] : []),
        ]),
        numeric: [false, true, true, ...(ss ? [true] : [])],
      };
    }
    case "choropleth":
    case "tile-map": {
      const s = p.series[0];
      const values = tileValues(s);
      const nums = [...values.values()].filter((v): v is number => v !== null);
      const breaks = breaksFor(p, nums, 4);
      const cls = classLabels(breaks, p.unit, p.lang);
      const rows = VOIVODESHIP_TILES.map((t) => {
        const v = values.get(t.key) ?? null;
        const name = p.categories?.find((c) => c.key === t.key)?.label ?? (pl ? t.name_pl : t.name_en);
        return { name, v, row: [name, n(v), v === null ? "–" : cls[classOf(v, breaks)]!] };
      }).sort((a, b) => a.name.localeCompare(b.name, p.lang));
      return {
        caption,
        columns: [pl ? "Województwo" : "Region", s?.label ?? (pl ? "Wartość" : "Value"), pl ? "Klasa" : "Class"],
        rows: rows.map((r) => r.row),
        numeric: [false, true, false],
      };
    }
    case "heatmap": {
      const g = heatGrid(p);
      return {
        caption,
        columns: [g.cols[0] === "01" ? (pl ? "Rok" : "Year") : "", ...g.colLabel],
        rows: g.rows.map((_, r) => [g.rowLabel[r]!, ...g.cols.map((__, c) => n(g.value(r, c)))]),
        numeric: [false, ...g.cols.map(() => true)],
      };
    }
    case "sparkline-table": {
      return {
        caption,
        columns: [pl ? "Wskaźnik" : "Indicator", pl ? "Okres" : "Period", pl ? "Wartość" : "Value", pl ? "Zmiana" : "Change"],
        rows: p.series.map((s) => {
          const r = sparkRow(s, p.unit, p.lang);
          const d = r.last && r.prev ? r.last.y! - r.prev.y! : null;
          return [s.label, r.last ? periodLabel(r.last.x, p.lang) : "–", r.value, d === null ? "–" : fmtDiff(d, r.unit, p.lang)];
        }),
        numeric: [false, false, true, true],
      };
    }
    default: {
      // time charts and grouped bars: one row per period/category, one column per series
      const xs = xKeys(p);
      const share = p.type === "area-share";
      const totals = new Map(xs.map((x) => [x, p.series.reduce((a, s) => a + Math.max(0, valueAt(s, x) ?? 0), 0) || 1]));
      return {
        caption,
        columns: [
          isTimeType(p.type) ? (pl ? "Okres" : "Period") : pl ? "Kategoria" : "Category",
          ...p.series.map((s) => (share ? `${s.label}, %` : s.label)),
        ],
        rows: xs.map((x) => [
          rowLabel(x),
          ...p.series.map((s) => {
            const v = valueAt(s, x);
            return share && v !== null ? fmtNum((v / totals.get(x)!) * 100, p.lang, 1) : n(v);
          }),
        ]),
        numeric: [false, ...p.series.map(() => true)],
      };
    }
  }
}

export function legendItems(p: ZChartProps): ZLegendItem[] {
  const pl = p.lang === "pl";
  const c = ctxOf(p);
  const extras: ZLegendItem[] = [];
  const withBand = () => {
    if (p.band)
      extras.push({ label: p.bandLabel ?? `${pl ? "pasmo celu" : "target range"} ${bandText(c, p.band)}`, color: COL.band, shape: "band" });
  };
  const withRef = (shape: ZLegendItem["shape"] = "line") => {
    if (p.reference) extras.push({ label: p.reference.label, color: COL.reference, shape });
  };
  const growth = (vals: (number | null)[]): ZLegendItem[] =>
    vals.some((v) => v !== null && v < 0)
      ? [
          { label: pl ? "wzrost" : "increase", color: COL.positive, shape: "square" },
          { label: pl ? "spadek" : "decrease", color: COL.negative, shape: "square" },
        ]
      : [{ label: p.series[0]?.label ?? "", color: COL.positive, shape: "square" }];
  const variance = (): ZLegendItem[] =>
    p.polarity
      ? [
          { label: pl ? "odchylenie korzystne" : "favourable variance", color: COL.good, shape: "square" },
          { label: pl ? "odchylenie niekorzystne" : "unfavourable variance", color: COL.bad, shape: "square" },
        ]
      : [
          { label: pl ? "wzrost wobec PY" : "up on PY", color: COL.positive, shape: "square" },
          { label: pl ? "spadek wobec PY" : "down on PY", color: COL.negative, shape: "square" },
        ];
  const scen = (id: string) => p.series.some((s) => s.id.toUpperCase() === id);
  switch (p.type) {
    case "ibcs-columns":
    case "ibcs-bars":
      return [
        { label: pl ? "AC — wykonanie" : "AC — actual", color: COL.ac, shape: "square" },
        { label: pl ? "PY — rok poprzedni" : "PY — previous year", color: COL.py, shape: "square" },
        ...(scen("FC")
          ? [{ label: pl ? "FC — prognoza (kreskowane)" : "FC — forecast (hatched)", color: COL.ac, shape: "band" as const }]
          : []),
        ...(scen("PL") ? [{ label: pl ? "PL — plan (obrys)" : "PL — plan (outline)", color: COL.ink, shape: "tick" as const }] : []),
        ...variance(),
      ];
    case "variance-columns":
    case "variance-bars":
      return [
        { label: pl ? "AC — wykonanie" : "AC — actual", color: COL.ac, shape: "square" },
        { label: pl ? "PY — poziom roku poprzedniego" : "PY — previous-year level", color: COL.ink, shape: "tick" },
        ...variance(),
      ];
    case "bridge":
      return [
        { label: p.reference?.label ?? "PY", color: COL.py, shape: "square" },
        ...variance().map((v) => ({ ...v, label: v.label.replace(pl ? "wobec PY" : "on PY", "").trim() })),
        { label: p.totalLabel ?? "AC", color: COL.ac, shape: "square" },
      ];
    case "area":
      return p.series.slice(0, 3).map((s, i) => ({ label: s.label, color: seriesColor(s.role, i), shape: "line" }));
    case "stacked-area":
    case "stacked-columns":
      return p.series.slice(0, 6).map((s, i) => ({ label: s.label, color: seriesColor(s.role, i), shape: "square" }));
    case "combo":
      return [
        { label: p.series[0]?.label ?? "", color: COL.series(1), shape: "square" },
        { label: p.series[1]?.label ?? "", color: COL.ink, shape: "line" },
      ];
    case "bump":
    case "ranking-table":
      return [];
    case "lollipop": {
      withRef();
      const hl = p.categories?.find((k) => k.key === p.highlight)?.label ?? p.highlight;
      return [...(hl ? [{ label: hl, color: COL.series(1), shape: "dot" as const }] : []), ...extras];
    }
    case "dot-plot": {
      const cols = groupColors(p.series.slice(0, 3));
      return p.series.slice(0, 3).map((s, i) => ({ label: s.label, color: cols[i]!, shape: "dot" }));
    }
    case "boxplot": {
      const hl = p.highlight ? (p.categories?.find((k) => k.key === p.highlight)?.label ?? p.highlight) : null;
      return [
        { label: pl ? "połowa jednostek (kwartyle)" : "middle half (quartiles)", color: COL.band, shape: "band" },
        { label: pl ? "mediana" : "median", color: COL.ink, shape: "line" },
        ...(hl ? [{ label: hl, color: COL.series(1), shape: "dot" as const }] : []),
      ];
    }
    case "treemap": {
      const s = p.series[0];
      const nums = (s?.points ?? []).map((q) => q.y).filter((v): v is number => v !== null && v > 0);
      const breaks = breaksFor(p, nums, 4);
      const ramp = rampColors(4);
      return classLabels(breaks, p.unit, p.lang).map((label, i) => ({ label, color: ramp[i]!, shape: "square" }));
    }
    case "line-band":
      withBand();
      withRef();
      return [
        ...p.series.slice(0, 5).map((s, i) => ({ label: s.label, color: seriesColor(s.role, i), shape: "line" as const })),
        ...extras,
      ];
    case "line-highlight": {
      const h = heroIndex(c);
      // Categorical series (role "series") are drawn in their own palette colour: one legend entry each.
      if (p.series.some((s, i) => i !== h && s.role === "series")) {
        withBand();
        withRef();
        return [
          ...p.series.map((s, i) => ({
            label: s.label,
            color: i === h ? COL.series(1) : s.role === "series" ? seriesColor(undefined, i) : COL.context,
            shape: "line" as const,
          })),
          ...extras,
        ];
      }
      const hero = p.series[h];
      const rest = p.series.filter((_, i) => i !== h);
      withBand();
      withRef();
      return [
        ...(hero ? [{ label: hero.label, color: COL.series(1), shape: "line" as const }] : []),
        ...(rest.length ? [{ label: rest.map((s) => s.label).join(", "), color: COL.context, shape: "line" as const }] : []),
        ...extras,
      ];
    }
    case "columns": {
      const s = p.series[0];
      withRef();
      return [...growth(xKeys(p, s ? [s] : []).map((x) => valueAt(s, x))), ...extras];
    }
    case "diverging-bars": {
      const s = p.series[0];
      return growth(xKeys(p, s ? [s] : []).map((x) => valueAt(s, x)));
    }
    case "small-multiples":
    case "segmented-bar":
    case "sparkline-table":
      return [];
    case "area-share":
    case "stacked-bars":
    case "pyramid":
      return p.series.slice(0, 5).map((s, i) => ({ label: s.label, color: seriesColor(s.role, i), shape: "square" }));
    case "ranked-bars": {
      withRef();
      const hl = p.categories?.find((k) => k.key === p.highlight)?.label ?? p.highlight;
      return [...(hl ? [{ label: hl, color: COL.series(1), shape: "square" as const }] : []), ...extras];
    }
    case "grouped-bars": {
      const cols = groupColors(p.series.slice(0, 3));
      return p.series.slice(0, 3).map((s, i) => ({ label: s.label, color: cols[i]!, shape: "square" }));
    }
    case "dumbbell":
      return p.series.slice(0, 2).map((s, i) => ({ label: s.label, color: i === 0 ? COL.context : COL.series(1), shape: "dot" }));
    case "slope": {
      const hl = p.highlight ? catLabel(p, p.highlight) : null;
      return hl
        ? [
            { label: hl, color: COL.series(1), shape: "line" },
            { label: pl ? "pozostałe" : "others", color: COL.context, shape: "line" },
          ]
        : [];
    }
    case "bullet":
      withBand();
      return [
        ...extras,
        { label: p.series[0]?.label ?? (pl ? "wartość" : "value"), color: COL.series(1), shape: "square" },
        ...(p.reference ? [{ label: p.reference.label, color: COL.ink, shape: "tick" as const }] : []),
      ];
    case "contributions": {
      const { parts, total } = contributions(p);
      return [
        ...parts.map((pt) => ({ label: pt.label, color: pt.color, shape: "square" as const })),
        { label: total.label, color: COL.ink, shape: "dot" },
      ];
    }
    case "waterfall":
      return [
        { label: pl ? "wkład dodatni" : "positive contribution", color: COL.positive, shape: "square" },
        { label: pl ? "wkład ujemny" : "negative contribution", color: COL.negative, shape: "square" },
        { label: p.totalLabel ?? (pl ? "suma" : "total"), color: COL.reference, shape: "square" },
      ];
    case "histogram":
      return p.reference ? [{ label: p.reference.label, color: COL.ink, shape: "line" }] : [];
    case "scatter": {
      const ss = p.series.find((s) => s.id === "size");
      return [
        ss
          ? { label: pl ? `wielkość kropki = ${ss.label}` : `dot size = ${ss.label}`, color: COL.series(1), shape: "dot" }
          : { label: pl ? "jedna kropka = jedna jednostka" : "one dot = one unit", color: COL.series(1), shape: "dot" },
        { label: pl ? "linia trendu" : "trend line", color: COL.referenceLight, shape: "line" },
      ];
    }
    case "choropleth":
    case "tile-map":
    case "heatmap": {
      const classes = p.type === "heatmap" ? 5 : 4;
      let nums: number[];
      if (p.type !== "heatmap") nums = [...tileValues(p.series[0]).values()].filter((v): v is number => v !== null);
      else {
        const g = heatGrid(p);
        nums = g.rows.flatMap((_, r) => g.cols.map((__, k) => g.value(r, k))).filter((v): v is number => v !== null);
      }
      const breaks = breaksFor(p, nums, classes);
      const ramp = rampColors(classes);
      return classLabels(breaks, p.unit, p.lang).map((label, i) => ({ label, color: ramp[i]!, shape: "square" }));
    }
    default:
      return p.series.map((s, i) => ({ label: s.label, color: seriesColor(s.role, i), shape: "line" }));
  }
}

/** Legend entries for ChartCard's `.zt-legend` container (keys are decorative). */
export function ZLegend({ items }: { items: ZLegendItem[] }) {
  return (
    <>
      {items.map((it, i) => (
        <span key={i}>
          <i
            aria-hidden="true"
            className={it.shape === "square" ? undefined : it.shape === "line" ? "line" : `zc-key--${it.shape}`}
            style={it.shape === "band" ? undefined : { background: it.color }}
          />
          {it.label}
        </span>
      ))}
    </>
  );
}
