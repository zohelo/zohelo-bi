import { createRequire } from "node:module";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { CHART_SAMPLES, CHART_TYPES, VOIVODESHIP_TILES, ZChart, buildScene, legendItems, tileMapSeries, toTable } from "./index";
import { fmtDiff, fmtNum, fmtTick, fmtVal, periodLabel, textWidth } from "./format";
import { niceTicks, quantileBreaks, timeTicks } from "./scale";

// react-dom is a dependency of the portal app (not of this package): resolve it from there.
const req = createRequire(new URL("../../../../apps/portal/package.json", import.meta.url));
const { renderToString } = req("react-dom/server") as { renderToString: (el: ReactElement) => string };

const PCT = { symbol: "%", isRate: true, decimals: 1 };

function fontSizes(html: string): number[] {
  return [...html.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
}

describe("ZChart renders every chart type from its sample", () => {
  for (const type of CHART_TYPES) {
    it(type, () => {
      const sample = CHART_SAMPLES[type];
      expect(sample.type).toBe(type);
      for (const width of [1100, 640, 360]) {
        const html = renderToString(<ZChart {...sample} width={width} />);
        expect(html).toContain('role="img"');
        expect(html).toContain(`aria-label="${sample.ariaLabel.replace(/"/g, "&quot;")}"`);
        expect(html).toContain('tabindex="0"');
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain(`width="${width}"`);
        expect(html).not.toMatch(/NaN|undefined|Infinity/);
        const sizes = fontSizes(html);
        expect(sizes.length).toBeGreaterThan(0);
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11);
      }
      const scene = buildScene(sample, 640);
      expect(scene.stops.length).toBeGreaterThan(0);
      expect(scene.height).toBeGreaterThan(60);
      for (const s of scene.stops) {
        expect(s.title).toBeTruthy();
        expect(s.rows.length).toBeGreaterThan(0);
      }
    });
  }

  it("falls back to the default width without a measured container", () => {
    const html = renderToString(<ZChart {...CHART_SAMPLES["line-band"]} />);
    expect(html).toContain('width="640"');
  });

  it("uses the phone layout below 480px: fewer year ticks", () => {
    const years = (w: number) => (renderToString(<ZChart {...CHART_SAMPLES["line-band"]} width={w} />).match(/>20\d\d</g) ?? []).length;
    expect(years(360)).toBeLessThan(years(900));
    expect(years(360)).toBeLessThanOrEqual(3);
  });

  it("never colours text with a series colour", () => {
    for (const type of CHART_TYPES) {
      const html = renderToString(<ZChart {...CHART_SAMPLES[type]} width={640} />);
      for (const m of html.matchAll(/<text[^>]*fill="([^"]+)"/g)) expect(m[1]).toMatch(/^var\(--(ink|ink-2|ink-3|ink-muted|on-inverse)\)$/);
    }
  });

  it("uses tokens only (no hex colours)", () => {
    for (const type of CHART_TYPES)
      expect(renderToString(<ZChart {...CHART_SAMPLES[type]} width={640} />)).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});

describe("samples", () => {
  it("one documented sample per chart type", () => {
    expect(Object.keys(CHART_SAMPLES).sort()).toEqual([...CHART_TYPES].sort());
    for (const s of Object.values(CHART_SAMPLES)) {
      for (const k of [
        "kind_pl",
        "kind_en",
        "group_pl",
        "group_en",
        "title",
        "sub",
        "use_pl",
        "avoid_pl",
        "use_en",
        "avoid_en",
        "ariaLabel",
      ] as const)
        expect(s[k].length, `${s.type}.${k}`).toBeGreaterThan(2);
    }
  });
});

describe("toTable", () => {
  for (const type of CHART_TYPES) {
    it(`${type}: rectangular table with numeric flags`, () => {
      const t = toTable(CHART_SAMPLES[type]);
      expect(t.caption).toBe(CHART_SAMPLES[type].ariaLabel);
      expect(t.rows.length).toBeGreaterThan(0);
      expect(t.numeric.length).toBe(t.columns.length);
      for (const r of t.rows) expect(r.length).toBe(t.columns.length);
    });
  }

  it("scatter: unit, x, y", () => {
    const t = toTable(CHART_SAMPLES.scatter);
    expect(t.columns).toEqual(["Jednostka", "PKB na mieszkańca, Polska = 100", "Stopa bezrobocia, %"]);
    expect(t.rows).toHaveLength(16);
    expect(t.rows.find((r) => r[0] === "Mazowieckie")).toEqual(["Mazowieckie", "160", "3,6"]);
  });

  it("waterfall: steps with running total and the total row", () => {
    const t = toTable(CHART_SAMPLES.waterfall);
    expect(t.rows).toHaveLength(6);
    expect(t.rows[0]).toEqual(["Konsumpcja", "+2,0", "2,0"]);
    expect(t.rows[4]).toEqual(["Eksport netto", "−0,6", "2,9"]);
    expect(t.rows[5]).toEqual(["PKB", "2,9", "2,9"]);
  });

  it("tile-map: region, value, class", () => {
    const t = toTable(CHART_SAMPLES["tile-map"]);
    expect(t.columns).toEqual(["Województwo", "Stopa bezrobocia", "Klasa"]);
    expect(t.rows).toHaveLength(16);
    expect(t.rows.find((r) => r[0] === "świętokrzyskie")).toEqual(["świętokrzyskie", "8,9", "≥ 8%"]);
    expect(t.rows.find((r) => r[0] === "wielkopolskie")).toEqual(["wielkopolskie", "2,9", "< 4%"]);
  });

  it("dumbbell: change in percentage points", () => {
    const t = toTable(CHART_SAMPLES.dumbbell);
    expect(t.rows.find((r) => r[0] === "Słowacja")?.[3]).toBe("−6,1 pp");
  });

  it("heatmap: year × month", () => {
    const t = toTable(CHART_SAMPLES.heatmap);
    expect(t.columns[0]).toBe("Rok");
    expect(t.columns).toHaveLength(13);
    expect(t.rows[0]![0]).toBe("2019");
  });

  it("time charts: one row per period", () => {
    const t = toTable(CHART_SAMPLES["line-band"]);
    expect(t.columns).toEqual(["Okres", "Polska"]);
    expect(t.rows).toHaveLength(129);
    expect(t.rows[85]).toEqual(["lut 2023", "18,0"]);
  });
});

describe("legendItems", () => {
  it("line-band includes the series and the band", () => {
    expect(legendItems(CHART_SAMPLES["line-band"])).toEqual([
      { label: "Polska", color: "var(--series-1)", shape: "line" },
      { label: "cel NBP 1,5–3,5%", color: "var(--band)", shape: "band" },
    ]);
  });
  it("line-highlight: hero, then context", () => {
    const l = legendItems(CHART_SAMPLES["line-highlight"]);
    expect(l[0]).toEqual({ label: "Polska", color: "var(--series-1)", shape: "line" });
    expect(l[1]).toEqual({ label: "Węgry, Czechy, Niemcy", color: "var(--series-context)", shape: "line" });
  });
  it("ranked bars: highlight and reference", () => {
    expect(legendItems(CHART_SAMPLES["ranked-bars"]).map((i) => i.label)).toEqual(["Mazowieckie", "Polska = 100"]);
  });
  it("bullet: band, value, target tick", () => {
    expect(legendItems(CHART_SAMPLES.bullet).map((i) => i.shape)).toEqual(["band", "square", "tick"]);
  });
  it("columns with a negative value: growth and decline", () => {
    expect(legendItems(CHART_SAMPLES.columns).map((i) => i.color)).toEqual(["var(--div-positive)", "var(--div-negative)"]);
  });
  it("tile map: 4-class ramp skipping seq-3; heatmap: 5 classes", () => {
    expect(legendItems(CHART_SAMPLES["tile-map"]).map((i) => i.color)).toEqual([
      "var(--seq-1)",
      "var(--seq-2)",
      "var(--seq-4)",
      "var(--seq-5)",
    ]);
    expect(legendItems(CHART_SAMPLES["tile-map"]).map((i) => i.label)).toEqual(["< 4%", "4–6%", "6–8%", "≥ 8%"]);
    expect(legendItems(CHART_SAMPLES.heatmap)).toHaveLength(5);
  });
  it("every item has a token colour and a known shape", () => {
    for (const type of CHART_TYPES)
      for (const it of legendItems(CHART_SAMPLES[type])) {
        expect(it.color).toMatch(/^var\(--[a-z0-9-]+\)$/);
        expect(["line", "square", "dot", "band", "tick"]).toContain(it.shape);
      }
  });
});

describe("number and period formatting", () => {
  it("Polish: decimal comma, space thousands, typographic minus", () => {
    expect(fmtNum(2.94, "pl", 1)).toBe("2,9");
    expect(fmtNum(12345.6, "pl", 0)).toBe("12 346");
    expect(fmtNum(-0.6, "pl", 1)).toBe("−0,6");
    expect(fmtNum(-0.04, "pl", 1)).toBe("0,0");
    expect(fmtNum(null, "pl")).toBe("–");
  });
  it("English: decimal point", () => {
    expect(fmtNum(2.94, "en", 1)).toBe("2.9");
    expect(fmtNum(12345.6, "en", 0)).toBe("12,346");
  });
  it("units and differences", () => {
    expect(fmtVal(2.9, PCT, "pl")).toBe("2,9%");
    expect(fmtVal(4.256, { symbol: "zł", isRate: false, decimals: 2 }, "pl")).toBe("4,26 zł");
    expect(fmtVal(100, { symbol: "pkt", isRate: false, decimals: 0 }, "pl")).toBe("100");
    expect(fmtDiff(-4.3, PCT, "pl")).toBe("−4,3 pp");
    expect(fmtDiff(0.02, { symbol: "zł", isRate: false, decimals: 2 }, "en")).toBe("+0.02 zł");
  });
  it("axis ticks: % only on percentage axes, large counts compacted", () => {
    expect(fmtTick(10, PCT, "pl", 5)).toBe("10%");
    expect(fmtTick(2.5, { symbol: "", isRate: false, decimals: 1 }, "pl", 0.5)).toBe("2,5");
    expect(fmtTick(1500000, { symbol: "", isRate: false, decimals: 0 }, "pl", 500000)).toBe("1,5 mln");
    expect(fmtTick(20000, { symbol: "", isRate: false, decimals: 0 }, "en", 10000)).toBe("20 k");
  });
  it("periods", () => {
    expect(periodLabel("2023-02", "pl", "long")).toBe("luty 2023");
    expect(periodLabel("2023-02", "pl", "phone")).toBe("II 2023");
    expect(periodLabel("2026-Q2", "pl")).toBe("2 kw. 2026");
    expect(periodLabel("2026-Q2", "en")).toBe("Q2 2026");
  });
});

describe("scales", () => {
  it("nice ticks", () => {
    expect(niceTicks(-2, 18, 4).values).toEqual([-5, 0, 5, 10, 15, 20]);
  });
  it("year ticks end on the last year and respect the limit", () => {
    const xs = Array.from({ length: 129 }, (_, i) => `${2016 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`);
    const t6 = timeTicks(xs, 6, "pl", false);
    expect(t6.length).toBeLessThanOrEqual(6);
    expect(t6[t6.length - 1]!.label).toBe("2026");
    expect(timeTicks(xs, 3, "pl", true).length).toBeLessThanOrEqual(3);
  });
  it("quantile breaks are ascending", () => {
    const b = quantileBreaks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4);
    expect(b).toHaveLength(3);
    expect([...b].sort((x, y) => x - y)).toEqual(b);
  });
  it("text width grows with size", () => {
    expect(textWidth("Mazowieckie", 12)).toBeGreaterThan(textWidth("Mazowieckie", 11));
  });
});

describe("tile map", () => {
  it("16 voivodeships PL02…PL32 on a 4 × 5 grid", () => {
    expect(VOIVODESHIP_TILES.map((t) => t.key).sort()).toEqual(
      ["02", "04", "06", "08", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30", "32"].map((n) => `PL${n}`),
    );
    const cells = new Set(VOIVODESHIP_TILES.map((t) => `${t.col},${t.row}`));
    expect(cells.size).toBe(16);
  });
  it("values by geography key; ids with suffixes match", () => {
    const s = tileMapSeries({ PL14: 3.6 }, "x");
    expect(s.points).toHaveLength(16);
    expect(s.points.find((p) => p.x === "PL14")?.y).toBe(3.6);
    const html = renderToString(
      <ZChart {...CHART_SAMPLES["tile-map"]} series={[{ id: "v", label: "v", points: [{ x: "PL14|gus", y: 3.6 }] }]} width={500} />,
    );
    expect(html).toContain(">MZ<");
    expect(html).toContain(">3,6<");
  });
});
