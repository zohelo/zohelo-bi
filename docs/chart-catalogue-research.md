# Chart catalogue — research (Katalog wykresów — badanie)

Research date: 2026-11-09. Scope: chart library for a public-statistics BI portal (GUS, BDL, Eurostat, NBP). This is research input only; it changes no code.

Contents:
1. Method & sources
2. Classification model (type → variant → facets)
3. Data-shape notation
4. Master type table (all types: function, style, relevance)
5. Variant catalogue by family (variants + data shape)
6. Cross-cutting modifiers (not variants)
7. Style systems
8. Domain-specific style notes
9. Recommended first-release set (30 types, 85 variants)
10. Open questions / caveats

---

## 1. Method & sources

### Method
1. Collected type lists from taxonomies that take different angles. The FT Visual Vocabulary groups by function. The Data Viz Project classifies by family, function and shape. The Vega-Lite gallery and ECharts show what renderers implement. The OWID Grapher schema shows what a public-statistics product actually ships. The ONS, Eurostat, UNHCR and BFS guides give official-statistics practice. IBCS and Zebra BI cover business-reporting notation.
2. Merged synonyms into a single English name per type, with the Polish name in parentheses.
3. Split each type into **variants**: presets a user picks, each with a fixed encoding and data shape.
4. Tagged each type with **function** (the FT categories) and **style** (notation system).
5. Judged relevance against the portal's data: mostly aggregated official statistics, i.e. measure × time × territory (NUTS/TERYT) × breakdown (sex, age, NACE, etc.). There is little microdata, few daily series and essentially no intraday market data.

### Sources actually opened (cited)
| # | Source | What was used |
|---|---|---|
| S1 | FT Visual Vocabulary README — github.com/Financial-Times/chart-doctor/blob/main/visual-vocabulary/README.md | The 9 function categories and the full type list per category |
| S2 | data.europa.eu data visualisation guide, "Choosing charts: the message" — data.europa.eu/apps/data-visualisation-guide/choosing-charts-the-message | EU adoption of FT categories (7 message patterns) |
| S3 | data.europa.eu guide, "Dataviz catalogue" page — data.europa.eu/apps/data-visualisation-guide/dataviz-catalogue | Describes datavizcatalogue.com (~60 types, searchable by function) |
| S4 | Data Viz Project "About" — datavizproject.com/?p=3091 | Taxonomy: Family (Chart, Diagram, Geospatial, Plot, Table), Function (7), Shape (10) |
| S5 | Vega-Lite example gallery — vega.github.io/vega-lite-v2/examples | Implemented types incl. error bars/bands, horizon, streamgraph, candlestick, bullet, waterfall, ranged dot, trellis, unit charts |
| S6 | Apache ECharts features — echarts.apache.org/feature.html | Series types: line, bar, scatter, pie, candlestick, boxplot, map, heatmap, lines, graph, treemap, sunburst, parallel, funnel, gauge, custom |
| S7 | OWID Grapher JSON schema — files.ourworldindata.org/schemas/grapher-schema.latest.json | Chart types shipped: LineChart, ScatterPlot, StackedArea, DiscreteBar, StackedDiscreteBar, SlopeChart, StackedBar, Marimekko, Dumbbell, Swimlane; map + table tabs; stackMode absolute/relative; log toggle; sortBy; facetDomain shared/independent |
| S8 | IBCS Standards page — ibcs.com/standards/ | Version 2.0 splits into Notation + Composition; aligned with ISO 24896 |
| S9 | IBCS v2 final PDF (2026-07-02) — ibcs.com/wp-content/uploads/2026/07/IBCS_v2_final_2026-07-02_jf-with-ad.pdf (first ~100k chars only; EXPRESS body truncated) | Scenario notation, axis direction, widths, variance notation/colours, scale bands, highlighting, discouraged visuals (pie, 3D, gauges, radar, funnel, spaghetti, traffic lights, log axes) |
| S10 | Wikipedia mirror, "International Business Communication Standards" | SUCCESS pillars (conceptual/perceptual/semantic) and the ISO/AWI 24896 project (2024) |
| S11 | Zebra BI Charts KB overview — help.zebrabi.com/kb/excel/zebra-bi-charts-visual-overview/ | Chart types: column/bar, area, line, waterfall, variance, hills & valleys, dot, lollipop, pin; layouts; forecast segment; small multiples; combo |
| S12 | Zebra BI Charts visual page — zebrabi.com/zebra-bi-charts-visual/ | "Built-in IBCS standards"; difference highlights; Top N + Others small multiples; segmented forecast |
| S13 | ONS Service Manual, chart types index — service-manual.ons.gov.uk/data-visualisation/chart-types | ONS core set: bar, clustered bar, column, line, pie/doughnut, stacked bar, population pyramid, choropleth, small multiples |
| S14 | ONS, "Choosing a chart type" | Simple/familiar charts; one relationship per chart; line/area for stock data, columns for flow data; stacked-chart caution |
| S15 | ONS, "Showing uncertainty in charts" | Shaded bands on lines; dot plots with ranges instead of error bars on bars; when to show or omit uncertainty |
| S16 | ONS, "Line chart" | Highlight/reference series, step lines for rates/caps, gaps for missing data, small multiples when crowded |
| S17 | Eurostat Statistics Explained, "Tutorial: Layout rules for maps" | Choropleth only for ratios, never totals; 3–6 classes; all NUTS units shown; grey for no data |
| S18 | BFS (Swiss Federal Statistical Office) Chart Chooser — chartchooser.bfs.admin.ch/en/index.html | Official-stats chart set (31 general + 3 maps); relationship + variable-type filters |
| S19 | UNHCR Dataviz Platform chart types — dataviz.unhcr.org/chart-types/ | Function grouping used by a public data producer, incl. icon map and pie-chart map |

### Requested sources that could not be opened
- **datavizcatalogue.com, datavizproject.com (home), data-to-viz.com, the ibcs.com SUCCESS page and the ECharts example gallery.** Direct fetches were blocked by the research tool's URL rules. Secondary pages (S3, S4) and the GitHub/README pages for data-to-viz returned no type lists. Types typical of those catalogues (ridgeline, violin, chord, sunburst, parallel coordinates, calendar heatmap, Lorenz, Pareto, control chart) are included from general domain knowledge and marked "(K)" where no opened source names them.
- **Eurostat "Layout rules for graphs".** The page returned only the Statistics Explained home page, so no graph rules were extracted. Eurostat practice below rests on S17 (maps) only.
- **The EXPRESS chapter of IBCS v2.** It is truncated. Chart-type replacements (EX 2.x) are known only by title.

---

## 2. Classification model

```
Type (visual form)  ── e.g. Line chart (wykres liniowy)
 └─ Variant (preset) ── e.g. Indexed line (=100), Line with confidence band
     ├─ Data shape     ── what the query must return
     ├─ Function tags  ── FT: deviation | correlation | ranking | distribution |
     │                     change-over-time | magnitude | part-to-whole | spatial | flow
     └─ Style          ── statistical-official | editorial | IBCS | scientific | financial | cartographic
Modifiers (orthogonal, not variants): small multiples, log scale, sort, highlight, annotations,
   reference line, uncertainty, forecast segment, normalisation (per capita / %), top-N + others
```

Design rules derived from the sources:
- **Primary grouping is visual type**, as the owner asked. Function is a filter or facet, and one type can carry several functions: in S1, the slope chart appears under both ranking and change over time, and the waterfall under both part-to-whole and flow.
- **A variant is a named preset** that changes encoding or layout (stacking, orientation, layering), not just colour.
- **Data transforms are not variants**: index = 100, y/y %, per 100k inhabitants, share of total. Keep them as modifiers on the measure, the way OWID uses stackMode and the relative toggle (S7). Some are exposed as variant presets only where they define the chart's meaning (indexed line, 100% stacked).
- **Style is a theme or notation layer** applied to the same type, not a separate type. The exception is a few style-native types: candlestick (financial), IBCS variance/pin charts and the fan chart (scientific/central bank).

---

## 3. Data-shape notation

| Code | Meaning | Example (Polish stats) |
|---|---|---|
| **M** | numeric measure (aggregated value) | unemployment rate, GDP, population |
| **T** | time (ordered, regular: year/quarter/month/day) | 2010–2025 annual |
| **C** | nominal category (few) | sex, NACE section, ownership sector |
| **O** | ordinal category | age groups, education level, income decile |
| **G** | geography (TERYT/NUTS code, joins to geometry) | 16 voivodeships, 380 powiats, ~2,477 gminas |
| **H** | hierarchy (parent–child) | NACE section→division, NUTS1→2→3 |
| **U** | uncertainty pair (lower, upper) or percentiles | LFS CI, NBP projection bands |
| **R** | reference value (target, plan, prior period, average) | EU-27 avg, 2030 target |
| **N** | many units / observations per group (≥ ~20) | all gminas' values for one year |
| **F** | flow pair (source → target, value) | migration voivodeship→voivodeship |
| **OHLC** | open/high/low/close per period | market prices (not in NBP fixing) |

Shapes are written like `1M × T`, `1M × C × T`, `2M × G`, `1M(+U) × T`.

Key portal fact: because BDL has many territorial units (380 powiats, ~2,477 gminas), **distribution charts (histogram, box, beeswarm) are viable without microdata**. They show the distribution of units, not of people. That makes them more relevant here than in a typical KPI dashboard.

---

## 4. Master type table

Relevance: **Core** = must have; **Useful** = valuable, later or advanced; **Niche** = specialist, skip for now; **Skip** = poor fit or discouraged.
Style codes: **OFF** official-statistical (ONS/Eurostat/OWID), **ED** editorial (FT/Economist), **IB** IBCS/business, **SCI** scientific/statistical, **FIN** financial markets, **CAR** cartographic.

### 4a. Comparison and magnitude
| # | Type (PL) | Function | Style | Relevance | Reason | Source |
|---|---|---|---|---|---|---|
| 1 | Column chart (wykres kolumnowy) | magnitude, change-over-time, part-to-whole | OFF, ED, IB | **Core** | Default for flow data over time (ONS S14) and small category sets | S1, S13, S18 |
| 2 | Bar chart (wykres słupkowy poziomy) | magnitude, ranking, deviation | OFF, ED, IB | **Core** | Ranking of regions or countries with long labels; IBCS puts structure on the vertical axis (S9) | S1, S13, S18 |
| 3 | Lollipop chart (wykres lizakowy) | ranking, magnitude | ED, IB | **Core** (as part of Dot/Lollipop) | Lighter than bars for long ranked lists such as 380 powiats or EU-27 | S1, S11, S19 |
| 4 | Dot plot / Cleveland dot (wykres punktowy kategorii) | magnitude, ranking, distribution | ED, SCI, OFF | **Core** | ONS-recommended carrier for ranges/CI (S15); compares 2–3 series per category | S1, S5, S15 |
| 5 | Dumbbell / range plot (wykres hantlowy) | change, deviation | ED, OFF | **Core** | Gap between two points (2015 vs 2025, men vs women); shipped by OWID (S7) | S7, S16 |
| 6 | Slope chart (wykres nachylenia) | change-over-time, ranking | ED, OFF | **Useful→Core** | Two-period change across units; OWID SlopeChart | S1, S5, S7 |
| 7 | Bullet chart (wykres pociskowy) | magnitude, deviation | IB, ED | **Useful** | Actual vs target (EU 2030, SDG targets) | S5 |
| 8 | Proportional symbol / area chart (wykres symboli proporcjonalnych) | magnitude | ED | **Niche** | Area comparison is perceptually weak; IBCS prefers linear comparison (S9) | S1 |
| 9 | Isotype / pictogram (wykres piktogramowy) | magnitude | ED | **Niche** | Storytelling only | S1 |
| 10 | Radar chart (wykres radarowy) | magnitude, multi-measure profile | ED | **Niche** | Region profile across indicators; IBCS lists it for replacement (S9) | S1, S18 |
| 11 | Parallel coordinates (współrzędne równoległe) | magnitude, correlation | SCI | **Niche** | Exploratory multi-indicator analysis; expert users only | S1, S6 |
| 12 | Gauge (wskaźnik zegarowy) | magnitude vs target | (dashboard) | **Skip** | IBCS discourages (S9); use KPI card or bullet | S6, S9 |

### 4b. Change over time
| # | Type (PL) | Function | Style | Relevance | Reason | Source |
|---|---|---|---|---|---|---|
| 13 | Line chart (wykres liniowy) | change-over-time | OFF, ED, IB, SCI | **Core** | Primary chart for time series (ONS S16) | S1, S5, S7, S13 |
| 14 | Area chart (wykres warstwowy) | change-over-time, part-to-whole | OFF, ED | **Core** | Stock data and composition over time (S14); OWID StackedArea | S1, S5, S7 |
| 15 | Combo line + column (wykres złożony) | correlation, change-over-time | ED, IB, OFF | **Core** | Level + rate; contributions + total (GDP growth decomposition) | S1, S11, S18 |
| 16 | Bump chart (wykres rankingowy w czasie) | ranking, change-over-time | ED | **Useful** | Rank of voivodeships or countries over years | S5 ("ranks over time") |
| 17 | Fan chart (wykres wachlarzowy) | change-over-time (projection) | SCI, central-bank | **Useful** | Projections with uncertainty (NBP inflation projection, population projections) | S1 |
| 18 | Sparkline (mikrowykres) | change-over-time | ED, IB | **Core** | Inline trend in tables and KPI cards | (K), S12 (small multiples context) |
| 19 | Streamgraph (wykres strumieniowy) | change-over-time, part-to-whole | ED | **Niche** | Aesthetic; poor value reading | S5 |
| 20 | Horizon chart (wykres horyzontowy) | change-over-time | SCI | **Niche** | Dense many-series monitoring; hard for the public | S5 |
| 21 | Calendar heatmap (kalendarz ciepła) | change-over-time | ED, SCI | **Niche** | Needs daily data (NBP FX, air quality); few such series | S1, S5 |
| 22 | Candlestick / OHLC (wykres świecowy / OHLC) | change-over-time | FIN | **Niche** | NBP fixing is one value per day, so no OHLC is available | S1 ("stock price"), S5, S6 |
| 23 | Timeline / Priestley timeline (oś czasu) | change-over-time | ED | **Niche** | Better as an annotation layer (policy events) than a type | S1 |
| 24 | Seismogram / circle timeline | change-over-time | ED | **Skip** | Editorial curiosity | S1 |
| 25 | Swimlane (wykres torów) | change-over-time, categorical state | OFF | **Niche** | OWID uses it for categorical status over time (e.g. policy in force) | S7 |

### 4c. Distribution
| # | Type (PL) | Function | Style | Relevance | Reason | Source |
|---|---|---|---|---|---|---|
| 26 | Population pyramid (piramida wieku) | distribution | OFF | **Core** | Canonical demography chart; ONS core set (S13) | S1, S13, S18, S19 |
| 27 | Histogram (histogram) | distribution | SCI, OFF | **Useful→Core** | Distribution of gmina/powiat values; GUS income bands | S1, S5, S18 |
| 28 | Box plot (wykres pudełkowy) | distribution | SCI | **Useful** | Regional dispersion per year or category | S1, S5, S6, S19 |
| 29 | Strip plot / beeswarm (wykres punktowy rozkładu / rój) | distribution, ranking | ED, SCI | **Useful** | Every unit visible, highlight "my powiat" | S1 ("dot strip", "barcode"), S5 |
| 30 | Error bars / CI plot (słupki błędów / przedziały ufności) | distribution (uncertainty) | SCI, OFF | **Useful** (as variants) | LFS and other surveys; ONS prefers dots with ranges and bands (S15) | S5, S15 |
| 31 | Violin plot (wykres skrzypcowy) | distribution | SCI | **Niche** | Needs many observations; harder for the public | S1 |
| 32 | Ridgeline (wykres grzbietowy) | distribution × time | SCI, ED | **Niche** | Distribution shift over years (K) | (K) |
| 33 | Cumulative curve / ogive (krzywa skumulowana) | distribution | SCI | **Niche** | Covered by Lorenz | S1, S5 |
| 34 | Lorenz curve (krzywa Lorenza) | distribution (inequality) | SCI | **Useful** | Income/wealth inequality with Gini; GUS publishes decile shares (K) | (K) |
| 35 | Barcode plot (wykres kodów kreskowych) | distribution | ED | **Niche** | Variant of strip plot | S1 |
| 36 | Control chart (karta kontrolna) | deviation over time | SCI (quality) | **Niche** | SPC; not a public-stats need (K) | (K) |
| 37 | Pareto chart (wykres Pareto) | ranking, part-to-whole | business/quality | **Niche** | Sorted bars + cumulative % line; can be built as a combo variant (K) | (K) |

### 4d. Correlation
| # | Type (PL) | Function | Style | Relevance | Reason | Source |
|---|---|---|---|---|---|---|
| 38 | Scatter plot (wykres punktowy / rozrzutu) | correlation | SCI, ED, OFF | **Core** | Two indicators across regions/countries; OWID ScatterPlot | S1, S5, S7 |
| 39 | Bubble chart (wykres bąbelkowy) | correlation, magnitude | ED | **Useful** | Third measure (population) as size; Gapminder-style animation | S1, S5 |
| 40 | Connected scatter (połączony wykres punktowy) | correlation, change-over-time | ED, SCI | **Useful** (as scatter variant) | Beveridge or Phillips curve paths | S1, S5 |
| 41 | Heatmap, category × category / time (mapa ciepła) | correlation, change-over-time, magnitude | OFF, SCI | **Core** | Region × year or indicator × region matrix; compact | S1 ("XY heatmap"), S5, S6 |
| 42 | Correlation matrix (macierz korelacji) | correlation | SCI | **Niche** (heatmap variant) | Indicator relationships for analysts | (K) |
| 43 | Scatterplot matrix (SPLOM) | correlation | SCI | **Niche** | Analysts only | S5 |

### 4e. Part-to-whole
| # | Type (PL) | Function | Style | Relevance | Reason | Source |
|---|---|---|---|---|---|---|
| 44 | Pie chart (wykres kołowy) | part-to-whole | OFF (limited) | **Useful** | ONS keeps it (S13); IBCS lists it for replacement (S9); restrict to ≤5 slices, single period | S1, S13, S9 |
| 45 | Donut chart (wykres pierścieniowy) | part-to-whole | OFF, ED | **Useful** (pie variant) | Same as pie, with a KPI in the centre | S1, S13 |
| 46 | Treemap (mapa drzewa) | part-to-whole, hierarchy | ED, OFF | **Useful** | NACE structure, budget expenditure by function | S1, S6, S18, S19 |
| 47 | Waffle / grid plot (wykres waflowy) | part-to-whole | ED, OFF | **Useful** | Readable "x in 100" shares for a public audience | S1 ("gridplot"), S5 (unit chart), S18 |
| 48 | Marimekko / mosaic (wykres Marimekko) | part-to-whole (2 dims) | ED, OFF | **Useful** | Employment by sector × region; shipped by OWID (S7) | S7, S18 |
| 49 | Sunburst (wykres wielopierścieniowy) | part-to-whole, hierarchy | ED | **Niche** | Treemap does it better | S6 |
| 50 | Waterfall / bridge (wykres kaskadowy / mostkowy) | part-to-whole, flow, deviation | IB, ED | **Useful** | Population change (births − deaths + migration), budget balance bridge | S1, S5, S11 |
| 51 | Voronoi treemap | part-to-whole | ED | **Skip** | Decorative | S1 |
| 52 | Venn / Euler (diagram Venna) | part-to-whole (overlap) | ED | **Skip** | Rarely in aggregate stats | S1, S19 |
| 53 | Arc (half-donut, parliament) | part-to-whole | ED | **Niche** | Seats in Sejm (elections) only | S1 |
| 54 | Funnel (lejek) | part-to-whole (stages) | business | **Skip** | No stage-funnel data in official stats; IBCS discourages (S9) | S6, S9 |

### 4f. Deviation
| # | Type (PL) | Function | Style | Relevance | Reason | Source |
|---|---|---|---|---|---|---|
| 55 | Diverging bar (słupkowy rozbieżny) | deviation | ED, OFF | **Core** (bar/column variant) | Deviation from national/EU average; y/y change | S1, S18 |
| 56 | Diverging stacked bar (skumulowany rozbieżny) | deviation, part-to-whole | ED, OFF | **Useful** (bar variant) | Likert/opinion surveys (GUS social cohesion) | S1, S5 |
| 57 | Spine chart (wykres grzbietowy dwustronny) | deviation | ED | **Niche** | Two-sided bars around zero; pyramid covers demography | S1 |
| 58 | Surplus/deficit filled line (linia nadwyżki/deficytu) | deviation, change-over-time | ED, IB ("hills & valleys") | **Useful** (area variant) | Trade balance, budget balance, actual vs reference | S1, S11 |
| 59 | IBCS variance chart / pin chart (wykres odchyleń / szpilkowy) | deviation | IB | **Useful** (column/bar variant) | Absolute ΔPY and relative ΔPY% pins | S9, S11, S12 |

### 4g. Spatial
| # | Type (PL) | Function | Style | Relevance | Reason | Source |
|---|---|---|---|---|---|---|
| 60 | Choropleth map (kartogram) | spatial | CAR, OFF | **Core** | Rates/ratios by NUTS/TERYT; Eurostat and ONS standard | S1, S13, S17, S18 |
| 61 | Proportional symbol map (kartodiagram) | spatial, magnitude | CAR | **Core** | Absolute counts; Eurostat says choropleths must not show totals (S17) | S1, S18, S19 |
| 62 | Tile / hex map (mapa kafelkowa) | spatial | ED, CAR | **Useful** | Equal-area 16-voivodeship grid; carrier for small multiples | S1 ("equalised cartogram") |
| 63 | Cartogram, value-scaled (anamorfoza) | spatial | ED, CAR | **Niche** | Distortion confuses the public | S1 ("scaled cartogram") |
| 64 | Dot density map (mapa kropkowa) | spatial, distribution | CAR | **Niche** | Needs sub-unit allocation (grid data) | S1, S5, S19 |
| 65 | Flow map (mapa przepływów) | spatial, flow | CAR | **Niche→Useful** | Migration and commuting between powiats (GUS commuting study) | S1, S5, S18, S19 |
| 66 | Contour / isoline map (mapa izoliniowa) | spatial | CAR, SCI | **Niche** | Environment (air quality, temperature) needs gridded data | S1 |
| 67 | Spatial heat map (mapa gęstości) | spatial | CAR | **Niche** | Point data only | S1 |
| 68 | Bivariate choropleth (kartogram dwuzmienny) | spatial, correlation | CAR | **Niche** | Powerful but hard to read (K) | (K) |
| 69 | Pie / chart map (mapa z diagramami) | spatial, part-to-whole | CAR, IB | **Niche** | IBCS allows pies only in map placements (S9); UNHCR uses them (S19) | S9, S19 |

### 4h. Flow and relationships
| # | Type (PL) | Function | Style | Relevance | Reason | Source |
|---|---|---|---|---|---|---|
| 70 | Sankey diagram (diagram Sankeya) | flow | ED, SCI | **Useful** | Energy balance (Eurostat/GUS), migration origin→destination | S1, S18, S19 |
| 71 | Chord diagram (diagram cięciw) | flow | ED | **Niche** | Symmetric flows between ~10–20 units; hard to read | S1, S19 |
| 72 | Network graph (graf sieci) | flow, relationships | SCI | **Skip** | No network data | S1, S6 |
| 73 | Arc diagram | flow | ED | **Skip** | — | S19 |

### 4i. Tabular and KPI
| # | Type (PL) | Function | Style | Relevance | Reason | Source |
|---|---|---|---|---|---|---|
| 74 | Table (tabela) | all (lookup) | OFF, IB | **Core** | Official stats always need exact values; OWID table tab (S7) | S4 (family Table), S7 |
| 75 | Matrix / pivot (tabela przestawna) | magnitude, part-to-whole | IB, OFF | **Core** | Cross-tabs (region × sex × year) with subtotals; GUS tablice | S12 (Zebra BI Tables), (K) |
| 76 | KPI card (karta wskaźnika) | magnitude, change | IB, dashboard | **Core** | Headline figure + change + period | (K) |
| 77 | Small multiples (małe wielokrotności) | any | OFF, ED, IB | **Core, as a modifier** | ONS core (S13, S16); Zebra BI for any chart (S11) | S5, S11, S13 |
| 78 | Gantt chart | time intervals | project | **Skip** | Not a statistics chart | S5 |

Total distinct entries: **78** (≈60 genuinely distinct visual types once pie/donut, connected scatter and similar near-duplicates are merged).

---

## 5. Variant catalogue by family

Each variant lists its data shape and notes. ★ = in the recommended first release (section 9).

### 5.1 Line chart (wykres liniowy)
| Variant (PL) | Data shape | Notes / source |
|---|---|---|
| ★ Simple line (prosta) | 1M × T | Single series |
| ★ Multi-series line (wieloseryjna) | 1M × C × T (C ≤ ~6) | Above ~6 series, switch to small multiples (S16) |
| ★ Highlighted line (z wyróżnieniem) | 1M × C × T, + selected C | Focus series coloured, rest grey; e.g. "my voivodeship vs others" |
| ★ Line with reference (z linią odniesienia) | 1M × T + R (avg/target/EU) | Comparison series recommended by ONS (S16) |
| ★ Step line (schodkowa) | 1M × T (piecewise constant) | NBP reference rate, minimum wage, tax thresholds (S16, S5) |
| ★ Indexed line (=100) (indeksowana) | 1M × C × T + base period | Transform preset; compares growth of series with different units/levels |
| ★ Line with confidence band (z pasmem ufności) | 1M(+U) × T | ONS-preferred uncertainty display (S15, S5) |
| ★ Line with forecast segment (z prognozą) | 1M × T + scenario flag (AC/FC) | Dashed or hatched projection; Zebra BI segmented (S11); IBCS FC = hatched (S9) |
| Line with fan (wachlarzowa) | see Fan chart | — |
| Log-scale line | 1M × C × T | Modifier; OWID toggle (S7); IBCS discourages (S9) |
| Rolling-average line (średnia ruchoma) | 1M × T (monthly/daily) | Transform + raw series in light colour (S16) |
| Dual-axis line | 2M × T | Avoid; prefer combo or indexed |
| Rank line (bump) | see Bump | — |

### 5.2 Column chart (wykres kolumnowy)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Simple column (prosta) | 1M × T or 1M × C | Flow data per period (S14) |
| ★ Clustered column (grupowana) | 1M × C(≤4) × T | e.g. men/women by year |
| ★ Stacked column (skumulowana) | 1M × C × T (additive) | Total + composition; caution (S14) |
| ★ 100% stacked column (skumulowana 100%) | 1M × C × T (shares) | Structure over time; OWID stackMode=relative (S7) |
| ★ Diverging (±) column (dodatnio-ujemna) | 1M × T (signed) | y/y growth, balances; colour by sign |
| ★ Column with variance (IBCS z odchyleniem) | 1M × T × scenario (AC vs PY/PL) | Integrated variance columns/pins; Δ abs + Δ% (S9, S11) |
| Ordered column | 1M × C | Ranking (S1) |
| Column with error bars | 1M(+U) × C | Available (S5), but ONS advises dot-with-range instead (S15) |
| Overlapping column (IBCS scenario overlay) | 1M × T × 2 scenarios | AC over PY (S9) |
| Histogram-style column | see Histogram | — |

### 5.3 Bar chart (wykres słupkowy poziomy)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Ranked bar (rankingowy) | 1M × C or 1M × G (one period) | Sorted; default for regional comparison |
| ★ Bar with benchmark highlight (z wyróżnieniem średniej) | 1M × G + R | EU-27 / Poland bar coloured differently (Eurostat practice, not verified) |
| ★ Clustered bar (grupowany) | 1M × G × C(≤3) | ONS core (S13) |
| ★ Stacked bar (skumulowany) | 1M × G × C | ONS core (S13) |
| ★ 100% stacked bar (skumulowany 100%) | 1M × G × C (shares) | Structure by region |
| ★ Diverging bar (rozbieżny) | 1M × G (deviation from R) | FT deviation (S1) |
| Diverging stacked bar (Likert) | 1M × C × O(scale) | Survey answers (S1, S5) |
| Bar with variance pins (IBCS) | 1M × G × scenario | Horizontal pins for Δ% (S9) |
| Butterfly / paired bar | 1M × C × 2 groups | Two-sided comparison (S18); pyramid for age |

### 5.4 Area chart (wykres warstwowy)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Simple area | 1M × T (stock data) | S14 |
| ★ Stacked area (skumulowany) | 1M × C × T | OWID StackedArea (S7) |
| ★ 100% stacked area | 1M × C × T (shares) | Energy mix, employment structure |
| ★ Surplus/deficit area (nadwyżka/deficyt) | 1M × T signed, or 2M × T (A vs B) | Filled between line and zero/reference; "hills & valleys" (S1, S11) |
| ★ Range band (pasmo min–max) | 1M(min, max) × T (+ line) | Range across regions + national line |
| Streamgraph | 1M × C × T | Niche (S5) |
| Horizon | 1M × C × T | Niche (S5) |

### 5.5 Combo chart (wykres złożony)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Column + line (kolumny + linia) | 2M × T (e.g. level + rate) | S1 "line + column"; Zebra BI combo (S11) |
| ★ Contribution stacked column + total line (wkłady do wzrostu) | 1M × C(components) × T + total | GDP growth contributions, CPI contributions — staple of GUS/NBP reports |
| ★ Dual-axis line (dwie osie) | 2M × T (different units) | Offer with a warning; prefer indexed |
| Pareto (sorted bars + cumulative %) | 1M × C | Niche |

### 5.6 Scatter plot (wykres punktowy)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Simple scatter | 2M × G (one period) | S5, S7 |
| ★ Scatter with trend line (z linią trendu) | 2M × G | Regression/LOESS overlay |
| ★ Labelled / highlighted scatter | 2M × G + selection | Label outliers or the selected unit |
| ★ Quadrant scatter (ćwiartki) | 2M × G + 2R (averages) | Lines at national averages; typology |
| ★ Connected scatter (ścieżka w czasie) | 2M × T (× few G) | Beveridge/Phillips curves (S1, S5) |
| Coloured-by-category scatter | 2M × G × C | e.g. urban/rural gmina type |
| Binned scatter / hexbin | 2M × N (many points) | ~2,477 gminas → overplotting (S5) |

### 5.7 Bubble chart (wykres bąbelkowy)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Simple bubble | 3M × G | Size = population |
| ★ Animated bubble (time slider) | 3M × G × T | Gapminder (S5) |

### 5.8 Dot plot and lollipop (wykres punktowy kategorii / lizakowy)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Ranked lollipop (lizakowy rankingowy) | 1M × G | Long ranked lists (S1, S11) |
| ★ Cleveland dot, multi-series (punktowy wieloseryjny) | 1M × G × C(2–3) | Replaces clustered bars |
| ★ Dot with interval (punkt z przedziałem) | 1M(+U) × C | ONS-preferred CI display (S15); "ranged dot" (S5) |

### 5.9 Dumbbell (wykres hantlowy)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Two periods (dwa okresy) | 1M × G × {t0, t1} | OWID Dumbbell (S7); ONS range plot (S16) |
| ★ Two groups (gap) (luka) | 1M × G × {C1, C2} | Gender pay gap, urban/rural |

### 5.10 Slope chart (wykres nachylenia)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Two-period slope | 1M × G × {t0, t1} | S1, S5, S7 |
| ★ Highlighted slope | same + selection | Others grey |

### 5.11 Bump chart (wykres rankingowy w czasie)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Rank over time | rank(1M) × G × T (G ≤ ~16) | Voivodeship ranks (S5) |

### 5.12 Population pyramid (piramida wieku)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Simple pyramid (absolute) | 1M × O(age) × C(sex) | S13 |
| ★ Percentage pyramid (% of total) | share × O × C | Comparable across regions |
| ★ Overlay pyramid (two periods/projection) | 1M × O × C × {t0, t1} | Outline for comparison year or projection (FT and ONS practice) |
| Pyramid small multiples | 1M × O × C × G | Modifier |

### 5.13 Histogram (histogram)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Simple histogram (units by value bin) | 1M × N (e.g. all gminas) | S5 |
| ★ Histogram with marker (mean/median/selected) | 1M × N + R | S5 "histogram with global mean overlay" |
| Pre-binned histogram | count × O(bins) | When GUS publishes bins (income classes); renders as a gapless column |
| Layered / cumulative histogram | 1M × N × C | S5 |

### 5.14 Box plot (wykres pudełkowy)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Box by category | 1M × N × C | Tukey 1.5 IQR or min/max whiskers (S5) |
| ★ Box over time | 1M × N × T | Regional dispersion per year |

### 5.15 Strip plot / beeswarm (rozkład punktowy / rój)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Strip / dot strip | 1M × N (× C) | S1 "dot strip plot", S5 "strip plot" |
| ★ Beeswarm with highlight | 1M × N + selection | "Where is my powiat?" (K) |

### 5.16 Fan chart (wykres wachlarzowy)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Percentile fan | 1M × T + U(percentile bands, e.g. 30/60/90%) | S1; central-bank projections (NBP style, not verified here) |
| ★ Scenario lines (warianty prognozy) | 1M × T × scenario (low/mid/high) | GUS population projection variants |

### 5.17 Waterfall (wykres kaskadowy)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Bridge (mostek start→koniec) | 1M × C(components) + start/end totals | Population change; budget bridge; Zebra BI bridge (S12); S5 |
| ★ Period waterfall (zmiany w czasie) | ΔM × T | Monthly change accumulation (S5 "monthly P&L") |
| Vertical waterfall | 1M × C (hierarchy) | IBCS structure on vertical axis (S9, S12) |

### 5.18 Bullet chart (wykres pociskowy)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Actual vs target | 1M × C + R(target) | S5 |
| ★ Bullet with qualitative ranges | 1M × C + R + bands | Poor/fair/good ranges |

### 5.19 Pie / donut (wykres kołowy / pierścieniowy)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Pie (≤5 slices) | 1M × C (one period, additive) | S13; IBCS discourages (S9) |
| ★ Donut with centre value | 1M × C + total | S13 |

### 5.20 Treemap (mapa drzewa)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Flat treemap | 1M × C | S1, S18 |
| ★ Hierarchical treemap | 1M × H (2 levels) | NACE section→division; budget part→chapter (S6) |

### 5.21 Waffle (wykres waflowy)
| Variant | Data shape | Notes |
|---|---|---|
| ★ 10×10 waffle | share(1M) × C (1–3) | S1 gridplot, S18 |
| Waffle small multiples | share × C × G | Modifier |

### 5.22 Marimekko (wykres Marimekko)
| Variant | Data shape | Notes |
|---|---|---|
| Marimekko (width = total, height = share) | 1M × C1 × C2 | OWID Marimekko (S7); first release optional |

### 5.23 Heatmap (mapa ciepła)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Category × time heatmap | 1M × G/C × T | Region × year; month × year seasonality (S5 "table heatmap") |
| ★ Indicator × region (standardised) | kM × G (z-scores or ranks) | Regional scorecard |
| ★ Correlation matrix | corr(kM) | Analysts (K) |
| Calendar heatmap | 1M × day | Niche (S1, S5) |

### 5.24 Choropleth map (kartogram)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Sequential classed (sekwencyjny, klasy) | rate(1M) × G | 3–6 classes (S17); ratios only, never totals (S17) |
| ★ Diverging (vs average) (rozbieżny) | deviation(1M) × G | Midpoint = national/EU average |
| ★ Categorical / typology (jakościowy) | category × G | e.g. dominant sector, urban-rural typology |
| Bivariate choropleth | 2M × G | Niche |
| Choropleth with time slider | rate × G × T | Modifier (OWID map timeline, S7) |

### 5.25 Proportional symbol map (kartodiagram)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Proportional circles | count(1M) × G (centroids) | Counts/totals (S1, S18) |
| ★ Symbols over choropleth | count(1M) + rate(1M) × G | Two measures; bubble map (S19) |
| Pie/chart symbols on map | 1M × C × G | Niche (S9, S19) |

### 5.26 Tile / hex map (mapa kafelkowa)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Coloured tile map | 1M × G (16 voivodeships / EU-27) | Equal-area, no small-region bias (S1 equalised cartogram) |
| ★ Tile map of sparklines/mini charts | 1M × G × T | Geographic small multiples |

### 5.27 Sankey (diagram Sankeya)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Two-stage Sankey (źródło→cel) | F (source, target, value) | Migration, energy supply → use |
| Multi-stage Sankey | F chain | Energy balance (supply→transformation→final use) |

### 5.28 Table (tabela)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Plain data table | any long/wide table | OWID table tab (S7); downloadable values (S15) |
| ★ Heat-formatted table (z formatowaniem warunkowym) | 1M × G × T | Colour-scaled cells |
| ★ Table with inline bars/sparklines | 1M × G (+ T) | Micro charts in cells |
| ★ Variance table (IBCS) | 1M × C × scenario (AC, PY, ΔPY, ΔPY%) | Zebra BI Tables style (S12) |

### 5.29 Matrix / pivot (tabela przestawna)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Cross-tab (tabela krzyżowa) | 1M × C1 × C2 (× T) | Region × sex × year |
| ★ Hierarchical with subtotals | 1M × H × T | NUTS or NACE drill-down, expandable rows |

### 5.30 KPI card (karta wskaźnika)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Value + change | 1M × {t, t−1} | Value, Δ abs/%, period label |
| ★ Value + sparkline | 1M × T | Trend context |
| ★ Value vs target | 1M + R | Progress bar or bullet; replaces a gauge (S9) |

### 5.31 Sparkline (mikrowykres)
| Variant | Data shape | Notes |
|---|---|---|
| ★ Line sparkline | 1M × T | In tables and cards |
| ★ Column / win-loss sparkline | 1M × T (signed) | Growth sign per period |

### 5.32 Niche types, single variant each (not in first release)
| Type | Data shape |
|---|---|
| Violin | 1M × N × C |
| Ridgeline | 1M × N × T |
| Lorenz curve (with Gini) | cumulative share pairs (deciles) × C/T |
| Radar | kM × G(≤3) |
| Parallel coordinates | kM × G |
| Chord | F (symmetric, ≤20 nodes) |
| Sunburst | 1M × H (≤3 levels) |
| Streamgraph | 1M × C × T |
| Horizon | 1M × C × T |
| Calendar heatmap | 1M × day |
| Candlestick / OHLC (+ volume) | OHLC (+volume) × T |
| Control chart | 1M × T + mean ± kσ |
| Pareto | 1M × C (sorted + cumulative) |
| Flow map | F × G (geometry) |
| Dot density | count × G (allocated dots) |
| Cartogram (value-scaled) | 1M × G |
| Swimlane | category × C × T |

---

## 6. Cross-cutting modifiers (not variants)

Implement these once, as toggles valid across many types, rather than duplicating them into variants.

| Modifier | Applies to | Source / rule |
|---|---|---|
| Small multiples / facet (shared vs independent axis) | line, column, bar, area, pyramid, map, waffle | S5, S7 (facetDomain), S11, S13; Zebra BI enforces a uniform scale (S12) |
| Top-N + "Others" | bar, column, small multiples, treemap, pie | S12 |
| Sort (value, name, change, start/end value) | bar, lollipop, dot, dumbbell, table | S7 sortBy |
| Absolute ↔ relative (stack mode) | stacked column/bar/area | S7 stackMode |
| Log scale | line, scatter | S7; IBCS discourages (S9) — default off |
| Normalisation (per capita, per 100k, % of total, index = 100, y/y %) | measure-level | Transform, not a chart variant |
| Highlight / focus selection | line, bar, scatter, slope, beeswarm | S16 |
| Reference line/band (average, EU, target, prior year) | line, column, bar, histogram | S16; IBCS reference axis (S9) |
| Annotation / event markers | time charts | S16; IBCS highlighting ellipses and arrows (S9) |
| Uncertainty overlay (band, interval) | line, dot, column | S15 |
| Forecast/projection segment | line, column, area | S9 (FC hatched), S11 |
| Missing-data handling (gap, ":", grey) | all | S16 (gaps), S17 (":" and grey) |
| Time slider / animation | map, scatter, bubble, bar | S7 (map timeline) |
| Map/table/chart tab switch | any | S7 (hasMapTab, table tab) |

---

## 7. Style systems

### 7.1 Official-statistical (OFF) — default for the portal
Basis: ONS (S13–S16), Eurostat maps (S17), OWID Grapher (S7), BFS (S18), UNHCR (S19).
- Small, familiar core set. ONS lists only 9 types plus maps (S13).
- One relationship per chart; overview before detail (S14).
- Line/area for stock data, columns for flow data (S14).
- Uncertainty shown as bands or dot ranges, explained in plain language; full estimates go in downloadable data (S15).
- Choropleths only for ratios; 3–6 classes; all units shown, including no-data units in grey (S17).
- Every chart can switch to a table and a map (S7).
- Tone: neutral palette, no variance colour semantics (good/bad is often contested in public statistics).

### 7.2 Editorial (ED) — FT/Economist
Basis: FT Visual Vocabulary (S1).
- Function-first chart choice across 9 categories.
- Strong headline-as-finding titles, direct labels instead of legends, highlight + grey context, annotations.
- Adds slope, dumbbell, lollipop, beeswarm/strip, bump, waffle and tile maps to the official core.
- Good fit for "story" or explainer pages and featured insights.

### 7.3 IBCS / business reporting (IB) — Zebra BI is one implementation
Basis: IBCS v2 (S8, S9), ISO/AWI 24896 (S10), Zebra BI (S11, S12).
- **Scenario notation**: AC solid dark; PY lighter solid; PL/BU outlined; FC hatched (S9).
- **Time on the horizontal axis, structure (regions, products) on the vertical axis** (S9).
- Width semantics: absolute measures at 2/3 of category width, ratios at 1/3; ratios as thin lines (S9).
- Variances: Δ abs (ΔPY, ΔPL) and Δ% as pins; green good, red bad, blue neutral; labels outside (S9).
- Scale bands across charts with different scales; outlier triangles (S9).
- Discourages pie/ring, gauges, radar, funnel, spaghetti, traffic lights, 3D and log axes (S9).
- Characteristic types: integrated variance column/bar, pin chart, waterfall/bridge (horizontal and vertical), variance table, small multiples on a uniform scale, segmented forecast (S11, S12).
- **Fit for the portal:** strongest for **public finance** (budget plan vs execution, AC vs PL) and target tracking (EU/SDG). Weaker for neutral descriptive stats, where "good/bad" colour coding would editorialise (e.g. population decline). Recommendation: offer it as a style theme on column/bar/waterfall/table plus the variance variants. Do not make it the global default.

### 7.4 Scientific / statistical (SCI)
Basis: S5 (error bars, CI bands, box plots, histograms), S15 (uncertainty), (K) for violin, ridgeline, Lorenz, control chart.
- Uncertainty is explicit (CI bands, intervals, fans); distributions instead of means; regression/trend overlays; log scales acceptable; correlation matrices.
- Fit: survey-based indicators (LFS, EU-SILC, health interview), projections, inequality, analyst mode.

### 7.5 Financial markets (FIN)
Basis: S1 ("stock price"), S5 (candlestick), S6 (candlestick series).
- Candlestick/OHLC + volume sub-panel, log price axis, moving averages, range selectors.
- Fit: very limited. NBP publishes daily fixing rates (single values), so OHLC cannot be built from official sources. Use a line + range selector for FX and interest rates, and step lines for policy rates. Skip candlestick unless market data is added.

### 7.6 Cartographic (CAR)
Basis: S1 (spatial), S17 (Eurostat), S18, S19.
- Classification (3–6 classes), sequential vs diverging palettes, mandatory no-data symbology, complete unit coverage, official unit names and codes (S17), proportional symbols for counts.
- Polish terminology trap: in Polish cartography **kartogram = choropleth map** and **kartodiagram = proportional symbol/diagram map**. The English "cartogram" (area distorted by value) is **anamorfoza** in Polish. UI labels must follow this.

### Style × type matrix (where each style applies)
| Style | Native or primary types | Applies as theme to |
|---|---|---|
| OFF | line, column, bar, stacked bar, pie/donut, pyramid, choropleth, small multiples, table | all |
| ED | slope, dumbbell, lollipop, beeswarm, bump, waffle, tile map, connected scatter | line, bar, scatter |
| IB | variance column/bar, pin, waterfall/bridge, variance table, bullet | column, bar, line, area, table, KPI |
| SCI | CI band, dot+interval, box, histogram, violin, ridgeline, fan, Lorenz, correlation matrix | line, scatter, dot |
| FIN | candlestick/OHLC, volume | line (range selector) |
| CAR | choropleth, proportional symbols, flow map, dot density, cartogram | tile map |

---

## 8. Domain-specific style notes

| Domain (PL) | Typical data | Default style | Signature types/variants | Watch out |
|---|---|---|---|---|
| Economy (gospodarka) | GDP, CPI, production, y/y and q/q | OFF + ED | Line (indexed, with forecast), contribution column + total line, diverging column (growth), fan chart (projections) | Seasonally adjusted vs NSA labels; base-year notes |
| Finance / monetary (finanse, NBP) | FX fixing, interest rates, money supply | OFF + SCI | Step line (reference rate), line with range selector, fan (inflation projection) | No OHLC from NBP fixing, so skip candlestick |
| Labour (rynek pracy) | unemployment, employment, wages, LFS | OFF + SCI | Line with band (LFS CI), choropleth (rate by powiat), dumbbell (gender gap), pyramid of employment by age | Registered vs LFS unemployment definitions |
| Population (ludność) | population by age/sex, births, deaths, migration, projections | OFF | Population pyramid (overlay projection), waterfall (population change components), Sankey/flow (migration), proportional symbols (counts) | Never choropleth for absolute population (S17) |
| Health (zdrowie) | mortality, morbidity, life expectancy, hospital beds | OFF + SCI | Line with CI, dot with interval, standardised-rate choropleth, heatmap (cause × year) | Age-standardised rates for regional comparison |
| Education (edukacja) | enrolment, attainment, exam results | OFF + ED | 100% stacked bar (attainment structure), slope (two periods), beeswarm (schools/gminas), histogram of exam scores | Small-unit volatility; suppression |
| Environment (środowisko) | emissions, energy mix, air quality, waste | OFF + ED | 100% stacked area (energy mix), Sankey (energy balance), bullet (2030 targets), calendar heatmap (daily air quality, niche) | Units (t CO₂e, toe) and targets |
| Transport (transport) | registrations, accidents, passenger flows | OFF | Line, bar ranking, proportional symbols, flow map (commuting, niche) | Per-capita vs per-km normalisation |
| Housing (mieszkalnictwo) | completions, prices, permits | OFF + ED | Line indexed (price index), combo (completions + permits), choropleth (dwellings per 1,000) | Index base changes |
| Public finance (finanse publiczne) | budget revenue/expenditure, deficit, debt, plan vs execution | **IB** + OFF | Waterfall/bridge (balance), variance column (AC vs PL), surplus/deficit area, treemap (expenditure by function), variance table | Good/bad colouring is legitimate here (plan execution) but should be neutral for debt policy debates |

---

## 9. Recommended first-release set — 30 types, 85 variants

Organised by visual type, which is the primary navigation. Function and style tags enable faceted filtering.

| # | Type (PL) | Variants (★) | Count | Primary functions | Styles |
|---|---|---|---|---|---|
| 1 | Line (liniowy) | simple · multi-series · highlighted · with reference · step · indexed=100 · with confidence band · with forecast segment | 8 | change-over-time | OFF, ED, SCI, IB |
| 2 | Column (kolumnowy) | simple · clustered · stacked · 100% stacked · diverging ± · with variance (IBCS) | 6 | magnitude, change, part-to-whole, deviation | OFF, IB |
| 3 | Bar (słupkowy poziomy) | ranked · with benchmark highlight · clustered · stacked · 100% stacked · diverging | 6 | ranking, magnitude, deviation | OFF, ED, IB |
| 4 | Area (warstwowy) | simple · stacked · 100% stacked · surplus/deficit · range band | 5 | change, part-to-whole, deviation | OFF, ED |
| 5 | Combo (złożony) | column + line · contributions + total line · dual-axis line | 3 | correlation, part-to-whole | OFF, IB |
| 6 | Scatter (punktowy) | simple · with trend line · labelled/highlighted · quadrant · connected | 5 | correlation | SCI, ED |
| 7 | Bubble (bąbelkowy) | simple · animated over time | 2 | correlation, magnitude | ED |
| 8 | Dot & lollipop (punktowy kategorii / lizakowy) | ranked lollipop · Cleveland multi-series · dot with interval | 3 | ranking, magnitude, distribution | ED, SCI |
| 9 | Dumbbell (hantlowy) | two periods · two groups (gap) | 2 | change, deviation | ED, OFF |
| 10 | Slope (nachylenia) | two-period · highlighted | 2 | change, ranking | ED |
| 11 | Bump (rankingowy w czasie) | rank over time | 1 | ranking, change | ED |
| 12 | Population pyramid (piramida wieku) | absolute · percentage · overlay (two periods/projection) | 3 | distribution | OFF |
| 13 | Histogram | simple · with marker | 2 | distribution | SCI |
| 14 | Box plot (pudełkowy) | by category · over time | 2 | distribution | SCI |
| 15 | Strip / beeswarm (rozkład punktowy / rój) | strip · beeswarm with highlight | 2 | distribution, ranking | ED, SCI |
| 16 | Fan chart (wachlarzowy) | percentile fan · scenario lines | 2 | change (projection) | SCI |
| 17 | Waterfall (kaskadowy) | bridge · period waterfall | 2 | part-to-whole, flow | IB |
| 18 | Bullet (pociskowy) | actual vs target · with qualitative ranges | 2 | magnitude, deviation | IB |
| 19 | Pie / donut (kołowy / pierścieniowy) | pie ≤5 · donut with centre value | 2 | part-to-whole | OFF |
| 20 | Treemap (mapa drzewa) | flat · hierarchical | 2 | part-to-whole | OFF, ED |
| 21 | Waffle (waflowy) | 10×10 | 1 | part-to-whole | ED |
| 22 | Heatmap (mapa ciepła) | category × time · indicator × region · correlation matrix | 3 | change, correlation, magnitude | OFF, SCI |
| 23 | Choropleth map (kartogram) | sequential classed · diverging vs average · categorical/typology | 3 | spatial | CAR, OFF |
| 24 | Proportional symbol map (kartodiagram) | circles · symbols over choropleth | 2 | spatial, magnitude | CAR |
| 25 | Tile / hex map (mapa kafelkowa) | coloured tiles · tiles with mini charts | 2 | spatial | ED, CAR |
| 26 | Sankey (diagram Sankeya) | two-stage | 1 | flow | ED |
| 27 | Table (tabela) | plain · heat-formatted · inline bars/sparklines · variance (IBCS) | 4 | lookup | OFF, IB |
| 28 | Matrix / pivot (tabela przestawna) | cross-tab · hierarchical with subtotals | 2 | magnitude, part-to-whole | OFF, IB |
| 29 | KPI card (karta wskaźnika) | value + change · value + sparkline · value vs target | 3 | magnitude, change | IB, OFF |
| 30 | Sparkline (mikrowykres) | line · column/win-loss | 2 | change | ED, IB |
| | **Total** | | **85** | | |

Plus modifiers from section 6 (small multiples, top-N, sort, stack mode, log, normalisation, highlight, reference, annotation, uncertainty, forecast segment, missing data, time slider, tab switch).

**Core subset (minimum viable, 16 types):** line, column, bar, area, combo, scatter, dot/lollipop, dumbbell, population pyramid, heatmap, choropleth, proportional symbols, table, matrix, KPI card, sparkline. The remaining 14 are the "useful" layer.

**Second release candidates:** Marimekko (OWID ships it), Lorenz curve, flow map, violin, ridgeline, diverging stacked (Likert), Pareto, radar (with caveat), calendar heatmap, swimlane, bivariate choropleth, multi-stage Sankey.

**Explicitly skip:** gauge, funnel, 3D anything, Voronoi, Venn, network, Gantt, seismogram, candlestick/OHLC (no data source).

---

## 10. Open questions / caveats

1. **Evidence gaps.** datavizcatalogue.com, data-to-viz.com, the datavizproject.com home page and the ECharts gallery could not be opened. Types marked (K) come from domain knowledge and should be checked against those catalogues if exhaustive coverage matters.
2. **IBCS EX chapter missing.** The PDF was truncated before the chart-type replacement rules (EX 2.1–2.5). Only their titles (pie/ring, gauges, radar/funnel, spaghetti, traffic lights) are confirmed.
3. **Eurostat graph rules not retrieved.** Only the map rules (S17) were confirmed. Statements about highlighting the EU aggregate bar are common practice, not verified here.
4. **NBP fan chart and GUS projection variants** are domain knowledge, not checked in this session.
5. **Variant vs transform.** Indexed=100 and 100% stacked are kept as variant presets because users think of them as chart kinds. In the engine they should be the same chart plus a transform, so the library does not multiply variants × transforms.
6. **Small multiples** are treated as a modifier, not a type. If the UI needs them discoverable in the type picker, show a "Small multiples" entry that opens a sub-picker of eligible types.
