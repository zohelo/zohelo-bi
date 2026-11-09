# Chart catalogue: the owner's six sources against the zohelo library

2026-11-09. Every type named by the owner's six sources, merged with the earlier research
(`docs/chart-catalogue-research.md`), deduplicated, grouped the way the picker groups (type family), tagged with the
FT function and the data-to-viz data shape, and judged against what zohelo has (data: measure × time × region ×
breakdown from GUS/BDL, Eurostat and NBP; engine: `packages/visuals` LIBRARY, 31 types, 91 variants; the wardrobe
looks and settings of `docs/chart-looks-spec.md`). Built in this round: **Pareto** (new type) and the **cumulative
histogram (ogive)** (new variant); see §4. Everything else is "later" or "rejected" with the reason, kept visible for
the owner to overrule.

## 1. Sources (every one opened in this session)

| Code | Source | What it gave | Opened |
|---|---|---|---|
| FT | FT Visual Vocabulary poster, journalismcourses.org PDF | 9 functions, ~62 named types | yes (PDF text; a few placements inferred by the reader, marked below) |
| SWD | storytellingwithdata.com → /chart-guide | 21 types with a post each (links in §6) | yes (home page and chart guide; the per-chart posts were not opened) |
| GMU | infoguides.gmu.edu/data-visualization/types | **no chart types**: seven purposes (Comparison, Distribution, Location, Part-to-Whole, Pattern, Relationship, Trend over Time) and links to from Data to Viz, FT, Kagen Quiballo's Chart Chooser, the Data Viz Project, SWD, Atlassian, the Data Visualisation Catalogue | yes |
| CI | coolinfographics.com/dataviz-guides | **no chart types of its own**: 30 chart choosers and guides (Abela, Schwabish & Ribecca's Graphic Continuum, Few, Emery, Evergreen, Kirk, Dullaert, SQLBI's 204 Power BI visuals…); its text names only pie, bubble, line, multimedia timeline, Sankey, word cloud | yes |
| DVP | datavizproject.com (catalogue grid) | 166 entries; facets Family (Chart, Diagram, Geospatial, Plot, Table), Function (7), Shape (10), Input | yes |
| DVP100 | 100.datavizproject.com | the fetch returned only the Shape filter (Rectangle, Circle, Area, Polygon, Line, Bar, Dot, Symbol, 3D) and the Feature filter; the 100 chart names did not come through as text | partly |
| D2V | data-to-viz.com (home, poster.html, caveats.html) | 39 gallery types; the decision tree's first level (Numeric, Categoric, Num & Cat, Maps, Time series, Network) and the numeric sub-branches (one / two / three / several variables, ordered / not ordered, few / many points); 30 caveats | yes (the tree's leaves below the first level were not legible as text) |
| R | `docs/chart-catalogue-research.md` (S1–S19) | 78 entries, data shapes, styles, modifiers | yes |

Two of the six sources (GMU, Cool Infographics) are directories of chart choosers, not chart lists; they add no
types. The Data Viz Project is the broadest and the least selective: 60 of its 166 entries are diagrams, process
pictures or concept visuals (flow chart, mind map, SWOT, fishbone, org chart…), which §3 rejects as a class.

## 2. The master list

Columns: PL name · FT function · D2V data shape (the tree's branch; `N×C` = numeric by category, `T` = time series,
`G` = map, `F` = flow) · sources · zohelo today (**T** = a library type, **V** = a variant, **L** = a look or setting
of the wardrobe, **–** = none) · verdict (**now** = built in this round, **later** = include when the named data or
engine work exists, **no** = reject, with why). Synonyms are merged into the first name; the others follow in
brackets.

### 2.1 Comparison and ranking (picker group "Porównanie")

| # | Type (PL) | FT | D2V shape | Sources | zohelo | Verdict |
|---|---|---|---|---|---|---|
| 1 | Column chart (kolumnowy) [vertical bar, barplot] | magnitude, time | N×C, T | FT, SWD, DVP, D2V, R | T column + looks | have |
| 2 | Bar chart, horizontal (słupkowy) [ordered bar] | magnitude, ranking | N×C | FT, SWD, DVP, D2V, R | T bar + looks | have |
| 3 | Ordered column / ordered bar (ranking) | ranking | N×C | FT, D2V ("rank your barplot"), R | L column.ranked, bar.ranked, setting Kolejność | have |
| 4 | Paired / clustered / grouped column and bar (grupowane) | magnitude | N×C×C | FT, DVP, R | L column.clustered, bar.clustered (setting Słupki serii) | have |
| 5 | Stacked column / bar (skumulowane) | part-to-whole | N×C×C | FT, SWD, DVP, D2V (caveat), R | L stacked, setting | have |
| 6 | 100 % stacked (struktura 100 %) [proportional stacked bar] | part-to-whole, distribution | N×C×C | FT, DVP, R | L percent | have |
| 7 | Diverging bar / column (wokół zera) | deviation | N×C signed | FT, DVP ("opposite"), R | L bar.diverging; columns colour negatives | have |
| 8 | Diverging stacked bar (Likert) | deviation, part | O×C | FT, R | – | **later**: needs survey scale data (GUS social cohesion, EU-SILC opinions); engine: stacked-bars with a centre offset |
| 9 | Spine chart / butterfly / paired back-to-back (motylkowy) | deviation | N×C×2 | FT, DVP, R | T pyramid (any two groups by category) | have (pyramid) |
| 10 | Lollipop (lizakowy) | ranking | N×C | FT, DVP, D2V, R | V dot.lollipop | have |
| 11 | Dot plot / Cleveland (punktowy kategorii) [dot chart] | magnitude, ranking | N×C×C | FT, SWD, DVP, D2V, R | V dot.cleveland, dot.interval | have |
| 12 | Dumbbell / range plot / column range / span (hantlowy) | change, deviation | N×C×2 | DVP (dumbbell, column range, span), R | T dumbbell | have |
| 13 | Slope (nachylenia) [slopegraph] | change, ranking | N×C×2 | FT, SWD, DVP, R | T slope | have |
| 14 | Bump (rankingowy w czasie) | ranking, time | rank×T | DVP, R | T bump | have |
| 15 | Bullet (pociskowy) [progress bar, target diagram] | magnitude vs target | N + R | SWD, DVP, R | T bullet; V kpi.target | have (target data pending) |
| 16 | Radar / spider (radarowy) [polar chart] | magnitude profile | N×C (few) | FT, SWD, DVP, D2V (caveat), R | – | **no**: readers compare areas, not values; D2V and IBCS both warn; a parallel-coordinates or table view does the profile job |
| 17 | Parallel coordinates (współrzędne równoległe) | correlation, profile | several N | FT, DVP, D2V, R | – | **later**: analyst mode for 16 voivodeships × 4–6 indicators; engine ~1 day; not for the public explorer |
| 18 | Radial bar / circular barplot / radial histogram / radial line / polar area (promieniowe) | magnitude | N×C | DVP, D2V (two caveats) | – | **no**: bending bars distorts length; the owner's "well formatted" rule |
| 19 | Proportional area chart (circle, square, half circle, icon) / ordered proportional symbol | magnitude | N×C | FT, DVP, SWD (square area chart) | – | **no**: area is read poorly (D2V "area is a poor metaphor"); bars do it better |
| 20 | Pictorial / isotype / icon count / unit chart (piktogram) | magnitude, part | N×C | FT, SWD (unit chart), DVP (7 pictorial entries) | V waffle.grid covers "x in 100" | **no** beyond waffle: decorative; icon scaling misleads |
| 21 | Scaled-up number / icon and number | magnitude | 1 N | DVP | T kpi | have (KPI card) |
| 22 | Table / comparison chart / tally | lookup | any | SWD, DVP, R | T table, T matrix | have |
| 23 | Word cloud | – | text | D2V, DVP, CI (menu) | – | **no**: no text data in official statistics |

### 2.2 Change over time (group "Czas")

| # | Type (PL) | FT | D2V shape | Sources | zohelo | Verdict |
|---|---|---|---|---|---|---|
| 24 | Line (liniowy) [line graph, line plot] | time | T | FT, SWD, DVP, D2V, R | T line + 15 looks | have |
| 25 | Step line (schodkowy) | time | T | DVP, R | L line.step | have |
| 26 | Spline / smoothed line (wygładzona) | time | T | DVP | setting Kształt: wygładzona | have (setting) |
| 27 | Highlighted / spaghetti remedy (bohater i tło) | time | T×C | D2V ("spaghetti" caveat), R | L line.highlight, panels | have |
| 28 | Indexed line (= 100) | time, deviation | T×C | R | L line.indexed | have |
| 29 | Line with band / error band (z przedziałem) | time, distribution | T + U | DVP (error bars), R | L line.band (locked: no CI data yet) | later: data |
| 30 | Fan chart, time series (wachlarzowy) | time (projection) | T + U | FT, DVP, R | T fan (locked: no projections yet) | later: data |
| 31 | Area (warstwowy) [area chart, layered area] | time | T | FT, SWD, DVP, D2V, R | T area + 10 looks | have |
| 32 | Stacked area (skumulowany) | time, part | T×C | FT, SWD, DVP, D2V, R | L area.stacked, area.percent | have |
| 33 | Streamgraph (strumieniowy) [stream chart, sorted stream] | time, part | T×C | DVP, D2V, R | – | **no**: a wiggling baseline makes values unreadable; stacked area says the same honestly |
| 34 | Surplus / deficit filled line (nadwyżka i deficyt) [range area] | deviation, time | T signed | FT, DVP, R | L area.surplus, area.range | have |
| 35 | Line + column / combo (złożony) | correlation, time | 2N×T | FT, DVP, R | T combo + looks | have |
| 36 | Connected scatter (połączony punktowy) | correlation, time | 2N×T | FT, DVP, D2V, R | V scatter.connected | have |
| 37 | Candlestick / OHLC / Kagi / Renko (świecowy) | time | OHLC×T | FT ("stock price"), DVP, R | – | **no**: no open/high/low/close source (NBP fixing is one value a day) |
| 38 | Calendar heatmap (kalendarz) | time | daily T | FT, DVP (circular, spiral variants), R | – | **later**: NBP daily FX and air-quality days would work; engine ~half a day; revisit when a daily series is in the catalogue |
| 39 | Sparkline / column sparkline / win-loss (mikrowykres) | time | T | DVP, R | T sparkline (line, columns) | have |
| 40 | Timeline / Priestley / scaled timeline / bubble timeline / circle timeline / seismogram | time (events) | events | FT, DVP, R | – | **no**: event data, not statistics; policy events belong in annotations |
| 41 | Gantt / swimlane | intervals | intervals | SWD, DVP, R | – | **no**: project charts |
| 42 | Horizon chart | time, many series | T×C | R | – | **no**: expert-only density; panels and heatmap cover it |
| 43 | Trendline (linia trendu) | correlation | 2N | DVP | setting Linia trendu (line), V scatter.trend | have |

### 2.3 Part of a whole (group "Część całości")

| # | Type (PL) | FT | D2V shape | Sources | zohelo | Verdict |
|---|---|---|---|---|---|---|
| 44 | Pie (kołowy) | part | C | FT, SWD, DVP, D2V (caveat), R | V pie.pie | have (≤ 5 parts) |
| 45 | Donut / semi-circle donut (pierścieniowy) | part | C | FT, DVP, D2V, R | V pie.donut | have |
| 46 | Multi-level pie / nested donut / sunburst (wielopierścieniowy) | part, hierarchy | H | FT, DVP, D2V, R | – | **no**: treemap reads better; hierarchy data limited to NACE / NUTS, which the hierarchical treemap serves |
| 47 | Treemap / convex treemap (mapa drzewa) | part, hierarchy | C or H | FT, SWD, DVP, D2V, R | T treemap | have |
| 48 | Circular packing / nested proportional area | part, hierarchy | H | DVP, D2V | – | **no**: area comparison of circles |
| 49 | Waffle / gridplot (waflowy) | part | shares | FT, DVP, R | V waffle.grid | have |
| 50 | Marimekko / mosaic (Marimekko) | part (two dims) | N×C×C | DVP, R | – | **later**: employment by sector × region is real data; engine ~1 day (variable-width stacked columns); second release |
| 51 | Waterfall (kaskadowy) | part, flow | C signed | FT, SWD, DVP, R | T waterfall; L bar.bridge | have |
| 52 | **Pareto** (Pareto) | part, ranking | C additive | FT (ordered column + cumulative), DVP, R | – → **T pareto** | **now**: built; one % axis for shares and the cumulative line, 80 % mark; additive measures only; the explorer refuses a time axis |
| 53 | Arc / hemicycle (parlament) | part | C | FT | – | **no** for now: only election results fit; revisit if PKW data are added |
| 54 | Venn / Euler | overlap | sets | FT, DVP, D2V, R | – | **no**: no set-overlap data in aggregates |
| 55 | Voronoi treemap | part | points | FT, R | – | **no**: decorative |
| 56 | Funnel / pyramid chart (lejek) | stages | ordered C | DVP, R | – | **no**: no stage data; IBCS discourages |
| 57 | Gauge, angular / solid (zegarowy) | magnitude vs target | 1 N + R | DVP, R | – | **no**: a KPI card with a target says it with the number; IBCS discourages |

### 2.4 Distribution (group "Rozkład")

| # | Type (PL) | FT | D2V shape | Sources | zohelo | Verdict |
|---|---|---|---|---|---|---|
| 58 | Histogram (histogram) [hanging rootogram] | distribution | one N | FT, DVP, D2V, R | T histogram | have |
| 59 | Cumulative curve / ogive (skumulowany) | distribution | one N | FT, R | – → **V histogram.cumulative** | **now**: built; bin shares and the cumulative share on one % axis |
| 60 | Density plot (gęstości) | distribution | one N | D2V, R | – | **later**: with powiat and gmina counts a density is honest; engine: kernel smoothing ~half a day; keep the histogram first |
| 61 | Box plot / bagplot (pudełkowy) | distribution | N×C | FT, SWD, DVP, D2V (caveat), R | T boxplot | have |
| 62 | Violin (skrzypcowy) | distribution | N×C | FT, DVP, D2V, R | – | **later**: needs ≥ 100 units per group (gminas); engine with density |
| 63 | Ridgeline (grzbietowy) | distribution × time | N×C | D2V, R | – | **later**: same engine as density; good for "distribution of powiat unemployment by year" |
| 64 | Strip / dot strip / jitter / barcode / beeswarm (rój) | distribution | N×C | FT, DVP, R | T strip (strip, beeswarm) | have |
| 65 | Population pyramid (piramida) | distribution | O×2 | FT, DVP, R | T pyramid | have |
| 66 | Error bars / dot with interval | uncertainty | N + U | DVP, D2V (caveat: not on bars), R | V dot.interval | have (locked: no CI data) |
| 67 | Scatter with marginal plots | distribution + correlation | 2N | D2V | – | **later**: analyst nicety; engine small once density exists |
| 68 | 2D density / hexagonal binning (hexbin) | distribution of pairs | 2N many | D2V, DVP | – | **later**: only gminas (≈ 2 477 points) overplot; engine ~half a day |
| 69 | Lorenz curve (krzywa Lorenza) | distribution (inequality) | cumulative shares | R | – | **later**: GUS decile shares exist; engine small; income domain |
| 70 | Control chart (karta kontrolna) | deviation over time | T + bands | DVP, R | – | **no**: process control, not statistics reading |
| 71 | Counts plot | distribution | 2 C | DVP | T heatmap covers | have (heatmap) |

### 2.5 Relationships and patterns (group "Zależności i wzory")

| # | Type (PL) | FT | D2V shape | Sources | zohelo | Verdict |
|---|---|---|---|---|---|---|
| 72 | Scatter (rozrzutu) [scatterplot] | correlation | 2N | FT, SWD, DVP, D2V, R | T scatter (5 variants) | have |
| 73 | Bubble (bąbelkowy) [circular bubble] | correlation, magnitude | 3N | FT, SWD, DVP, D2V, R | T bubble | have |
| 74 | Heatmap, XY / table heatmap / matrix diagram (mapa ciepła) | correlation, time | N×C×C | FT, DVP, D2V, R | T heatmap | have |
| 75 | Correlogram / correlation matrix (macierz korelacji) | correlation | several N | D2V, R | V heatmap.correlation | have |
| 76 | Bubble-based heatmap | correlation | N×C×C | DVP | – | **no**: heatmap with less precision |
| 77 | 3D scatter / 3D bar / 3D stream / surface (3D) | – | 3N | DVP, D2V (caveat "avoid 3D") | – | **no**: perspective distorts; the owner's rule |
| 78 | Ternary plot / ternary contour | composition of three | 3 shares | DVP | – | **no**: three-part compositions are rare and the plot is unfamiliar to the public |
| 79 | Dendrogram / cluster analysis / hierarchical edge bundling | hierarchy, similarity | H, network | D2V, DVP | – | **no**: analysis outputs, not statistics charts |
| 80 | Taylor diagram, nomogram, phase diagram, Chernoff faces | scientific | – | DVP | – | **no**: specialist or novelty |

### 2.6 Maps (group "Mapy")

| # | Type (PL) | FT | D2V shape | Sources | zohelo | Verdict |
|---|---|---|---|---|---|---|
| 81 | Choropleth (kartogram) | spatial | G | FT, SWD, DVP, D2V, R | T choropleth (3 variants) | have |
| 82 | Proportional symbol / bubble map (kartodiagram) | spatial, magnitude | G | FT, DVP, D2V, R | T symbols | have |
| 83 | Tile / hex map / equalised cartogram (mapa kafelkowa) [hexbin map] | spatial | G | FT, D2V (hexbin map), R | T tiles | have |
| 84 | Bar / pie chart on a map | spatial, part | G×C | DVP, R | – | **no**: pies on maps compound two weak readings; small multiples of maps instead |
| 85 | Scaled cartogram (anamorfoza) | spatial | G | FT, DVP, D2V, R | – | **no**: distorted shapes confuse the public; tile map keeps equal areas |
| 86 | Flow / connection / route map (mapa przepływów) | spatial, flow | F×G | FT, DVP, D2V, R | – | **later**: BDL inter-voivodeship migration is real flow data; engine ~1 day (arcs on the map); after the Sankey gets flow data |
| 87 | Dot density / pin map | spatial | points | FT, DVP, R | – | **no**: needs point or grid data |
| 88 | Contour / isoline / topographic / profile map | spatial | grid | FT, DVP, R | – | **no**: gridded environmental data not in the catalogue |
| 89 | Spatial heat map | spatial | points | FT | – | **no**: point data |
| 90 | Transit map | – | network | DVP | – | **no** |

### 2.7 Flow (group "Zależności", flow function)

| # | Type (PL) | FT | D2V shape | Sources | zohelo | Verdict |
|---|---|---|---|---|---|---|
| 91 | Sankey / alluvial / parallel sets (Sankeya) | flow | F | FT, SWD, DVP, D2V, R | T sankey (locked: no flow data yet) | later: data |
| 92 | Chord / non-ribbon chord (cięciw) | flow | F symmetric | FT, DVP, D2V, R | – | **no**: a 16 × 16 migration matrix reads better as a Sankey or a heatmap |
| 93 | Network / arc diagram / hive plot / sociogram | relationships | network | FT, DVP, D2V, R | – | **no**: no network data |

### 2.8 Not data charts (Data Viz Project "Diagram" family, SWD flowchart)

Flow chart, swimlane flow chart, process / linear process / cycle diagram, mind map, fishbone, SWOT, org chart,
pyramid diagram, Venn as concept, exploded view, illustration, step-by-step, development and causes, matrix
diagrams (roof- and Y-shaped), hyperbolic tree, icicle (as a tree), fan chart (genealogy), phase diagram, target
diagram: **rejected as a class** (concept visualisation, not statistics). 36 of the 166 DVP entries.

## 3. Counts

| Verdict | Types | Notes |
|---|---|---|
| have (type, variant, look or setting) | 45 | rows marked "have" (merged types); behind them 31 library types, 91 variants, 55 looks |
| **now** (built this round) | 2 | Pareto (type), cumulative histogram (variant) |
| later: data | 4 | band, fan, dot interval, Sankey exist in the engine and unlock when the catalogue carries intervals, projections, flows |
| later: engine | 11 | Likert, parallel coordinates, calendar heatmap, Marimekko, density, violin, ridgeline, marginal scatter, hexbin, Lorenz, flow map |
| reject | 31 named rows + the diagram class (36 DVP entries) | 3D, radial, gauge, funnel, radar, pictograms, sunburst, streamgraph, candlestick, timelines, Gantt, networks, chord, Venn, cartogram, dot density, contour, word cloud… |

Why the rejections are not timidity: the owner's principle is a set of well-formatted charts, not an endless one.
Every rejected type is either (a) a perception trap the sources themselves flag (data-to-viz caveats: 3D, radial bars,
circular barplots, pie, dual axes, spider; IBCS: gauges, funnels, radar), (b) decorative (pictograms, Voronoi,
Chernoff), or (c) has no data in public statistics (networks, OHLC, point/grid maps, text). Each stays listed
above; a single line in `LIBRARY` brings one back if the owner overrules.

## 4. What was integrated

**Pareto** (`packages/visuals/src/z/drawPareto.tsx`, type `pareto`, library type "Pareto" in the "Część całości"
group, variant `pareto.simple` "Udziały narastająco"). Parts of one additive measure from the largest as shares,
the cumulative share as an ink line with dots, the 80 % mark; one 0–100 % axis, never a second axis. Table:
category, value, share, cumulative. Legend: share, cumulative, 80 %. Sample: exports by voivodeship (six make four
fifths). Explorer: drawn from the columns kind with a breakdown or areas on the X axis; locked for averages, rates
and shares (`additive` need, "Wymaga miary, której części się sumują…"); a time axis is refused with a layout issue
("Pareto sumuje części całości, nie okresy…"). The outfit rule holds: Pareto is a type because it changes the
encoding (shares + cumulative line), not a look of the column chart.

**Cumulative histogram / ogive** (`histogram.cumulative`, `opts.cumulative`): bars as the share of units per bin,
the cumulative share as a line through the upper bin edges with the median bin labelled; table with share and
cumulative columns; legend "udział jednostek", "narastająco". A variant, not a type: same data, same bins, one
option.

Both have samples in the guide (Biblioteka wykresów), tests (`drawExtra.test.tsx`, `variants.test.ts`) and are
explorer-only for dashboard YAML until a domain expert asks (`build.test.ts` list).

## 5. Source coverage

Counts after merging synonyms into the rows of §2 (a source's own list is longer: DVP counts seven pictorial
entries where §2 has one row); they are a reading of the sources, not an audit.

| Source | Types found | Matched (have) | New now | Later | Rejected | Not charts |
|---|---|---|---|---|---|---|
| FT Visual Vocabulary | 62 | 40 | 2 (ordered column + cumulative → Pareto; cumulative curve) | 6 (Likert, parallel coords, calendar heatmap, flow map, fan*, Sankey*) | 14 (radar, proportional symbol, isotype, Voronoi, sunburst, arc, candlestick, Priestley, circle timeline, seismogram, cartogram, dot density, contour, heat map, chord, network, Venn) | 0 |
| Storytelling with Data | 21 | 17 | 0 | 1 (Sankey*) | 3 (spider, square area, Gantt) | 1 (flow chart) |
| GMU Infoguides | 0 (purposes only) | – | – | – | – | – |
| Cool Infographics | 6 named in passing | 4 | 0 | 0 | 1 (word cloud) | 1 (multimedia timeline) |
| Data Viz Project | 166 | 58 | 2 | 10 | 60 | 36 |
| 100.datavizproject | 0 legible (filters only) | – | – | – | – | – |
| From Data to Viz | 39 | 24 | 0 | 8 (density, violin, ridgeline, density 2d, hexbin map*, connection map, Sankey*, parallel) | 7 (spider, word cloud, circular barplot, circular packing, sunburst, streamchart, chord, network, arc, edge bundling, cartogram) | 0 |
| Earlier research (R) | 78 | 60 | 2 | 10 | 6 | 0 |

\* exists in the engine, locked until the data arrive. DVP counts: many of its 166 entries are variants of one type
(seven pictorial entries, six radial entries, four timelines, three gauges/progress) and were merged before judging.

## 6. Links

FT poster: https://journalismcourses.org/wp-content/uploads/2020/07/Visual-vocabulary.pdf · SWD chart guide:
https://www.storytellingwithdata.com/chart-guide (posts: area graph, bar chart, boxplot, bubble chart, bullet graph,
choropleth map, table, dot plot, waterfall, flowchart, Gantt, line graph, pie chart, scatterplot, Sankey, slopegraph,
spider chart, square area chart, stacked bars, treemap, unit chart) · GMU:
https://infoguides.gmu.edu/data-visualization/types · Cool Infographics: https://coolinfographics.com/dataviz-guides
· Data Viz Project: https://datavizproject.com/ and https://100.datavizproject.com/ · From Data to Viz:
https://www.data-to-viz.com/ (poster: /poster.html, caveats: /caveats.html).

## 7. Questions for the owner

1. **Likert / diverging stacked bars** need survey-scale data. Should the catalogue plan for GUS social-cohesion or
   EU-SILC opinion items, or is that out of scope for a statistics portal?
2. **Marimekko** (sector × region with widths = size) is the one "later" type with data already in BDL and a clear
   public use. Build it in the next round, or wait for a domain expert to ask?
3. **Density / violin / ridgeline** make sense only at powiat and gmina level (380 / 2 477 units). Do you want the
   engine work now, before BDL powiat data are loaded, or after?
