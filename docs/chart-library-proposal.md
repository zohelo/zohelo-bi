# Chart library: proposed structure (for owner approval)

2026-11-09. Based on the owner's comments of 2026-11-09 and `docs/chart-catalogue-research.md` (FT Visual
Vocabulary, IBCS, Zebra BI, OWID, ONS, Eurostat map rules, Vega-Lite). Nothing is rebuilt until this is approved.

## Principle

Not a BI tool with endless settings: a set of **predefined, well-formatted charts** that cover what readers of
public statistics actually do, chosen in two clicks. So the library is organised the way people think of charts:

1. **Type** (visual form): line, column, bar, area, combo, scatter… This is the main grouping in the picker.
2. **Variant** (a named preset of that type): line → simple, highlighted, with band, indexed = 100… One click.
3. **Filters across types** (not separate groups): **function** (what the chart answers: change over time,
   ranking, part of a whole, distribution, correlation, deviation, spatial, flow, magnitude) and **style**.
4. **Modifiers** that work on every type and are therefore not variants: small multiples, top N + others, sort,
   log scale, per capita / index / y/y transform, highlight, reference line, annotation. Built once, so the
   variant count does not multiply.

## Styles: one palette, a few notations

All charts use the zohelo palette (tokens). A style changes **notation**, not colours:

| Style | What it adds | Default for |
|---|---|---|
| Standard (official statistics, ONS/Eurostat/OWID) | the current zohelo look | everything |
| Business (IBCS; Zebra BI is an implementation of IBCS, so one style) | AC/PY/PL/FC notation (solid, grey, outline, hatched) mapped to tokens; variance charts; good/bad colouring with `change-good`/`change-bad` | public finance, plan vs execution, targets |
| Scientific | uncertainty: confidence bands, error bars, fan charts, distributions | surveys (LFS, SILC), health, projections |
| Editorial (FT/Economist) | headline-led, highlight one series, direct labels | story pages, chart of the day |

Financial-markets style (candlestick, OHLC) is **not proposed**: no source in the catalogue has open/high/low/close
data (NBP fixing is one value a day). It can come back if a market data source is added.

## First release: 30 types, ~85 variants

Core 16 marked ★. Today's 35 explorer kinds all survive: they become variants of these types.

| Type | Variants | Today's kinds that become variants |
|---|---|---|
| ★ Line | simple · multi-series · highlighted · with reference · step · indexed = 100 · with confidence band · with forecast | line |
| ★ Column | simple · clustered · stacked · 100% stacked · diverging ± · with variance (Business) | columns, stackcols, ibcs, variance |
| ★ Bar | ranked · with benchmark · clustered · stacked · 100% stacked · diverging · with variance (Business) | bars, stackbars, diverging, segmented, ibcsbars, varbars |
| ★ Area | simple · stacked · 100% stacked · surplus/deficit · range band | area, stacked, share |
| ★ Combo | column + line · contributions + total line · two lines on two axes (with warning) | combo, contributions |
| ★ Scatter | simple · with trend line · labelled · quadrants · connected over time | scatter |
| Bubble | simple · over time | bubble |
| ★ Dot & lollipop | lollipop · dot plot (several series) · dot with interval | lollipop, dots |
| ★ Dumbbell | two periods · two groups (gap) | dumbbell |
| Slope | two periods · highlighted | slope |
| Bump | rank over time | bump |
| ★ Population pyramid | absolute · percent · two periods / projection overlay | pyramid |
| Histogram | simple · with marker (Poland, median) | histogram |
| Box plot | by category · over time | boxplot |
| Strip / beeswarm | strip · beeswarm with highlight (gminas, powiats) | – |
| Fan chart | percentile fan · scenarios | – |
| Waterfall | bridge (Business) · period waterfall | waterfall, bridge |
| Bullet | actual vs target · with ranges | – |
| Pie / donut | pie (≤ 5 parts) · donut with centre value | – |
| Treemap | flat · hierarchical | treemap |
| Waffle | 10 × 10 | – |
| ★ Heatmap | category × time · indicator × region · correlation matrix | heatmap |
| ★ Choropleth (kartogram) | sequential · diverging from average · typology | choro |
| ★ Proportional symbols (kartodiagram) | circles · circles over choropleth | – |
| Tile map | coloured tiles · tiles with mini charts | map |
| Sankey | two-stage | – |
| ★ Table | plain · heat-formatted · with bars/sparklines · variance (Business) | ranking |
| ★ Matrix (pivot) | cross-tab · hierarchy with subtotals | matrix |
| ★ KPI card | value + change · value + sparkline · value vs target | (dashboards) |
| ★ Sparkline | line · columns | sparkline |

Second release candidates: Marimekko, Lorenz curve, violin, ridgeline, Likert (diverging stacked), Pareto,
calendar heatmap, bivariate choropleth, flow map. Skipped: gauge, funnel, 3D, network, candlestick.

Polish naming to keep straight: **kartogram** = choropleth, **kartodiagram** = proportional symbols, English
"cartogram" = **anamorfoza**.

## Domain defaults

Each domain dashboard and explorer suggestion leans on a style: Economy standard + editorial (indexed lines,
contributions, fan for projections); Finance standard + scientific (step line for rates, fan); Labour standard +
scientific (LFS bands, dumbbell gap, choropleth by powiat); Population standard (pyramid with projection, waterfall
of population change, migration Sankey); Health scientific (intervals, standardised-rate maps); Public finance
Business (bridge, plan vs execution variance, treemap of spending).

## The picker

Picker opens on types (icons + names, grouped Comparison / Time / Distribution / Part of whole / Maps / Tables),
each type expands to its variants with a live thumbnail; a filter row for function and style; "Suggested" shows
the 3 variants that fit the current fields. Variants that would be wrong for the data (e.g. stacked averages) stay
visible but carry the reason, as the explorer guardrails do now.

## Decisions for the owner

1. The structure above (type → variant, function and style as filters, modifiers separate).
2. The four styles, with Business (IBCS incl. Zebra BI) as one style and no candlestick for now.
3. The first-release list: 30 types, or start with the 16 core types and add the rest later.
