# Chart library

22 chart types (21 charts of `@zohelo/visuals` and the KPI tile), grouped by what the chart must show (the FT Visual Vocabulary groups, with ONS chart guidance). Each type has a component card with a live example and its when / avoid rules; `kit/zchart.js` draws all of them.

| Job | Types |
| --- | --- |
| Change over time | Linia + pasmo, Linia z wyróżnieniem, Kolumny, Wkłady do wzrostu, Małe wielokrotności, Obszar 100% |
| Size and ranking | Słupki rankingowe, Słupki grupowane, Wykres hantlowy, Wykres nachylenia |
| Deviation | Słupki rozbieżne, Wykres pociskowy, Wykres kaskadowy |
| Part of a whole | Słupki skumulowane 100%, Słupek segmentowany |
| Distribution | Piramida ludności, Histogram |
| Relationship and space | Wykres rozrzutu, Kartogram kafelkowy, Mapa ciepła |
| Single values and overview | Kafelek KPI, Tabela z liniami trendu |

**Not used:** pie and donut charts (use 100% bars or a segmented bar), gauges (use a bullet chart), dual-axis charts (use two charts or index to a common base), 3D, radar, word clouds.

## Colour by job

- **Identity (categorical):** `series-1` … `series-5` in fixed order, never cycled. Colour follows the entity: Polska is `series-1` on every chart. A 6th series folds into "Pozostałe" or small multiples.
- **Hero vs context:** one hero series in `series-1`, the rest in `series-context`, labelled directly.
- **Magnitude (sequential, binned):** `seq-1` … `seq-5`, one hue, light to dark. Never lighter than `seq-1`. When cells carry values use four classes (seq-1, seq-2, seq-4, seq-5): ink text on the first two, white on the last two.
- **Polarity (diverging):** `div-negative` below, `div-positive` above, `div-mid` neutral; always with a zero line and a legend.
- **Contributions to growth:** components in `series-1` … `series-5` (a 6th and later fold into "Pozostałe" in `series-context`), positive parts stacked up from zero and negative parts down from zero, the headline total as an `ink` dot with a white ring on every column; the zero line in `series-reference`, above the columns.
- **Reference:** `series-reference` for averages and sums, `band` + dashed `band-edge` for target ranges.
- **Status colours are reserved** for the StatusTag and never appear in charts.

The categorical set passed the dataviz palette validator (lightness band, chroma floor, colour-blind separation ≥ 8 ΔE on adjacent pairs, normal-vision floor). `series-3`…`series-5` are below 3:1 on white, so charts using them must carry direct labels or the table view.

## Marks and anatomy

- Lines 2–2.5px (hero 2.5px), context lines 1.25px; markers ≥ 8px with a 1.5px white ring.
- Bars: 2px rounded data end, 2px surface gap between adjacent bars and stacked segments, baseline at zero.
- Gridlines: solid 1px `grid`, horizontal only; the zero line `series-reference-light`.
- Axis text `chart-text` 11px `ink-muted`; data labels 11–12px `ink` (weight 600 for the highlighted value). Text is never in a series colour.
- Direct labels on line ends where they fit; otherwise a legend under the chart. Never a number on every point.
- Annotate one moment that matters (peak, policy change) with a dot and a short label.
- Y axis starts at zero for bars and areas; lines may start elsewhere, but never with a hidden break.

## Interaction

- Hover and keyboard focus show a crosshair and a tooltip (date, series name, value with unit). The tooltip is never the only way to read a value: the table view has every number.
- Wykres | Tabela toggle on every chart; the table has the same title, units and source.
- Charts are `role="img"` with an `aria-label` that states the finding in one sentence; the SVG paths are never read aloud.

## Size of chart text

Charts render at their real pixel size with fixed font sizes (axis text 11px, labels 11–12px). Never scale a fixed-viewBox SVG so that its text ends up below 11px on screen; the UI test measures this.

## Phone

Below 768px charts switch to phone variants drawn for a 300px-wide viewBox with 12px text (11px or more on a 360px screen), fewer ticks (3 years instead of 6), labels shortened (II 2023), legends wrap under the chart. Never scale a desktop chart down.

## Number formatting in charts

Decimal comma, thousands with a space, unit in the subtitle (not on every tick) except % on percentage axes. Round to what the source supports: rates 1 decimal, exchange rates 2 decimals, counts whole numbers with tys./mln/mld.
