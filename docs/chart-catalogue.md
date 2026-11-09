# Chart catalogue: the owner's six sources against the zohelo library

2026-11-09, third round (rework after the owner's note of 20:55: "the source analysis was too shallow"). This
version replaces the second-round catalogue. It records what was actually opened, treats each of the 100
visualisations of 100.datavizproject.com as a candidate, turns From Data to Viz into a rule table, extracts the
Storytelling with Data guidance into rules the looks apply, and re-judges the "later" and "rejected" types from the
Data Viz Project detail pages. It follows `docs/product-principles.md`: every chart is judged on its value to a
business reader of public statistics who is not an analyst, and a type is rejected only with a concrete reason.

## 1. What was opened (honest coverage)

| Source | Opened in this round | Not opened, or weak |
|---|---|---|
| **100.datavizproject.com** | All **100 of 100** seen as images: the index page rendered in the browser, nine screenshots of twelve tiles each (§2). Detail pages read for **#1–#64** (description, story, property and shape tags; the fetch tool paraphrased some sentences). | Detail pages of **#65–#100 were not opened**: the owner had to approve each subpage, so the coordinator limited the visit to the index. Those 36 are judged from the thumbnail alone and carry no site description. #96 is not legible at thumbnail size. |
| **From Data to Viz** | Home page; **19 of 19** leaf "story" pages behind the tree; **23 of 30** caveat pages. | Three story pages hold no content of their own: "RegionWithValue" is a stub with the one-number intro only, and the two "NestedValue…" pages repeat the GPS story. Two caveat pages are empty (dual axis: links only; small multiple: stub). The tree itself is an image; the shape-to-chart mapping in §3 is taken from the charts each story walks through. |
| **Storytelling with Data** | Chart guide and **21 of 21** chart posts. The "when to use", "when not to" and design sections were read for 19. | Gantt and flowchart: introduction only (not statistics charts). The posts have no section on titles; what they say about words is in §4. |
| **Data Viz Project** | The grid (166 entries) and **83 of 166** detail pages: every data chart that the second round marked "later" or "rejected". | The other 83 (types zohelo has, and the diagram class) were judged from the grid as before. |
| FT Visual Vocabulary, GMU Infoguides, Cool Infographics, `chart-catalogue-research.md` | Not reopened; second-round reading stands (FT: 9 functions, about 62 types; GMU and Cool Infographics list chart choosers, not charts). | – |

Nothing in this document is filled in from memory. Where a page was not opened, the row says so.

## 2. 100 visualisations, one dataset: every one a candidate

The project draws one small table 100 ways: World Heritage sites in Norway, Denmark and Sweden in 2004 and 2022
(5 → 8, 4 → 10, 13 → 15). That is the commonest business case in public statistics, **a few units, then and now**,
so the collection is a direct test of what answers "what changed?" best. The site tags every piece with one of six
stories; five of them are business questions we name in §5: the whole grew (change in the total), who leads
(ranking), who gained most (change), who overtook whom (rank change), and who had over half (structure).

Screenshots (index tiles, numbered as on the site), in
`/tmp/claude-0/-home-claude/5313693e-7e7f-5702-8dff-21bfaeae7de0/scratchpad/designer/100viz/`:
`100viz-001-012.jpg`, `100viz-013-024.jpg`, `100viz-025-036.jpg`, `100viz-037-048.jpg`, `100viz-049-060.jpg`,
`100viz-061-072.jpg`, `100viz-073-084.jpg`, `100viz-085-096.jpg`, `100viz-097-100.jpg`. The site's own full-size
image of number N is `https://100.datavizproject.com/wp-content/uploads/viz/viz-N.png` (licence CC BY-NC-ND, so the
images are not copied into this repository).

**Data needed.** `C×2T`: one measure, a few categories, two periods (every one of the 100 fits this). `+Σ`: the
measure must be additive, because the picture shows a total or shares. `count`: the picture draws one mark per unit,
so it only works for small whole numbers.

**Verdicts.** **have** (where) · **now** (built in this round, §6) · **later** (worth building, with what it needs) ·
**text** (the message belongs in an automatic finding, not in a new chart) · **no** with a reason code:

- **R1 area**: the value is read from an area or a size. From Data to Viz ("area is a poor metaphor") and SWD
  (bubble, treemap, pie posts) agree that readers cannot compare areas; a bar or a dot on a scale says it exactly.
- **R2 bent**: lengths on an arc, a circle or a spiral. Outer rings are longer for the same value (From Data to Viz,
  circular barplot caveat); the site itself notes on #59 that the circular axis has no purpose.
- **R3 3D**: perspective hides and shortens marks; the site says of #16 and #39 that they are harder to read.
- **R4 count**: one mark per unit. Public statistics run to thousands and millions; the waffle (one cell = 1 %)
  keeps the idea for shares.
- **R5 dress**: a decorative reshaping of a chart we have (wavy, triangular, rounded, funnel-like); the site notes
  on #24 and #34 that the shape distorts the reading.
- **R6 map**: charts placed on a map. The site says of #23 that heights are harder to compare and of #46 that the map
  adds little; a ranked bar or a choropleth says more.

| # | What it is | What it shows best | Data | Verdict |
|---|---|---|---|---|
| 1 | Stacked columns, two periods, totals on top | the whole grew; structure | C×2T +Σ | have: column.stacked |
| 2 | Then → now dots on a gauge-like arc | who moved most | C×2T | **now**: dumbbell "Strzałki zmiany" on a straight scale (arc: R2) |
| 3 | Paired lollipops with the % change under each pair | change per unit, in % | C×2T | have: dot.lollipop; the % change label is **now** on the dumbbell and slope |
| 4 | Isometric stacked columns | as #1 | C×2T +Σ | no: R3 (have column.stacked) |
| 5 | Clusters of hexagons, one per site | rough ratio | count | no: R4 |
| 6 | Rounded bars: had then + gained since | who gained most | C×2T | have: bar.stacked; rounding R5 |
| 7 | Scatter: now on X, then on Y, labels on dots | who leads in both years | C×2T | **later**: "then against now" scatter with the equal line (also in From Data to Viz); engine small, needs one measure at two periods on two axes |
| 8 | Two stacked bars joined by ribbons, % change per part and in total | change of the whole and of the parts | C×2T +Σ | have: bar.stacked over two periods; ribbons R5; the % changes → change table (later) |
| 9 | Square area for the total beside share columns | size and structure | C×2T +Σ | later: with Marimekko (#90) |
| 10 | Then → now arcs on a diagonal number line | who overtook whom | C×2T | **now**: dumbbell arrows |
| 11 | Overlapping squares | who leads | C×2T | no: R1 |
| 12 | Nested circles | growth as a ring | C×2T | no: R1 |
| 13 | Stars with one ray per site | – | count | no: R4, R2 |
| 14 | Donut made of one tick per site | share and count | count +Σ | no: R4 (have pie.donut for shares) |
| 15 | Range columns with arrows per country and one for the average | who moved most, against the average | C×2T | **now**: dumbbell arrows; average as the reference |
| 16 | Isometric area chart | – | C×2T | no: R3 |
| 17 | Bump chart with values | rank change | C×2T | have: bump (the site notes a bump is a poor fit for two periods; slope is better) |
| 18 | Two axes at 90° joined by quarter circles | who overtook whom | C×2T | no: R2 (have slope) |
| 19 | Dumbbell with the % change written on the connector | change per unit | C×2T | have: dumbbell; **now**: change in % |
| 20 | Dots in two rings, then inside, now outside | – | count | no: R4 |
| 21 | Semicircular stacked bars | then inside now | C×2T | no: R2 |
| 22 | Wavy lines as bars | – | C×2T | no: R5 |
| 23 | Stacked bars standing on a map | – | C×2T | no: R6 |
| 24 | 100 % stacked bars, progress style | who has over half | C×2T +Σ | have: bar.percent |
| 25 | Clustered columns by period | compare all values | C×2T | have: column.clustered |
| 26 | Dots on semicircular paths | – | count | no: R4, R2 |
| 27 | Then bar in front of the now bar, per country | change per unit | C×2T | have: column.ibcs (previous period behind the current one) |
| 28 | Nested half circles | – | C×2T | no: R1 |
| 29 | Overlapping areas between two dates | who overtook whom | C×2T | have: area; with two dates the slope says it |
| 30 | A strip of numbered tabs, the added ones filled, "+3" | units added | count | text: the change is in the finding and in the variance look; the strip is R4 |
| 31 | Half donuts sized by the total | structure and size | C×2T +Σ | no: R1, R2 (have bar.percent) |
| 32 | Bars along the sides of a triangle | – | C×2T | no: R5 |
| 33 | All six values as one sorted column chart | where each value ranks | C×2T | have: column.ranked |
| 34 | Triangles scaled by height | – | C×2T | no: R5 (site: distorted perception) |
| 35 | Table with a ring per cell (full ring = the maximum) | exact values first, picture second | C×2T | later: change table with data bars (bars, not rings: R2) |
| 36 | Then and now bars with a "change" column between | change per unit in % | C×2T | later: change table (#100) |
| 37 | Table with slanted "shadows" as bars | – | C×2T | no: R5 |
| 38 | Polar area (coxcomb) | – | C×2T | no: R2, R1 |
| 39 | 3D columns in two rows | – | C×2T | no: R3 |
| 40 | Staircase with jumps "+3" | units added | count | no: R4; the jump is the variance label |
| 41 | Columns of dots | exact count | count | no: R4 |
| 42 | Sorted stream (ribbon) between two dates | rank change with size | C×2T | later: ribbon chart for many periods (§7); with two dates the slope says it |
| 43 | Waffle of unit squares, stacked | the whole grew | count +Σ | have: waffle.grid for shares; unit counts R4 |
| 44 | Isometric slope ribbons with % | – | C×2T | no: R3 (have slope) |
| 45 | Half circles, then left and now right | – | C×2T | no: R1 |
| 46 | Icons per site beside a map | – | count | no: R4, R6 |
| 47 | Columns: had then + gained since | where the stock comes from | C×2T | have: column.variance (value with the change on top) |
| 48 | 3D stacked blocks | – | C×2T +Σ | no: R3 |
| 49 | Heat map, 2 × 3 | – | C×2T | have: heatmap (the site finds the table too small; it works for 16 voivodeships × years) |
| 50 | Two donuts | structure then and now | C×2T +Σ | have: bar.percent. Two pies side by side are not offered: SWD shows that comparing across pies fails |
| 51 | Triangular areas between two axes | – | C×2T | no: R2, R5 |
| 52 | Circles at the corners of a triangle | – | C×2T | no: R1 |
| 53 | Centred bars joined like a funnel, % change inside | change per unit | C×2T | no: R5; the % → change table |
| 54 | Slope chart with the % change at each line end | who overtook whom, how fast | C×2T | have: slope; **now**: change in % at the line end |
| 55 | Treemap, then nested inside now | structure now | C×2T +Σ | have: treemap for one period; nesting R1 |
| 56 | Butterfly of tick marks | – | count | have: pyramid (two groups back to back); ticks R4 |
| 57 | One ring per country, full ring = the maximum | – | C×2T | no: R2 (bar.ranked says it with length) |
| 58 | One stacked bar split into "up to 2004" and "after" | when the stock was built | C×2T +Σ | have: bar.stacked |
| 59 | Dots joined by arrows on a circular axis | who moved | C×2T | **now**: dumbbell arrows (straight; the site: the circle has no purpose) |
| 60 | A small area panel per country with a % badge | change per unit | C×2T | have: line.panels / area.panels; the % badge per panel is later (small) |
| 61 | Tally marks | – | count | no: R4 |
| 62 | Treemap pair sized by the total | structure and size | C×2T +Σ | no: R1 (have column.stacked) |
| 63 | Isometric cubes | – | count | no: R3, R4 |
| 64 | Donuts on a map | – | C×2T | no: R6 |
| 65 | Overlapping triangles ("mountains") | – | C×2T | no: R5 · thumbnail only |
| 66 | The emblem scaled by value, as a table | – | C×2T | no: R1 · thumbnail only |
| 67 | Concentric rings, one per site | – | count | no: R4 · thumbnail only |
| 68 | Dot clusters in a table | – | count | no: R4 · thumbnail only |
| 69 | Stacks of coins on a map | – | count | no: R6, R3 · thumbnail only |
| 70 | Connected scatter: share of the total against the count, then → now | share and size moving together | C×2T +Σ | have: scatter.connected · thumbnail only |
| 71 | Vertical dumbbell | change per unit | C×2T | have: dumbbell · thumbnail only |
| 72 | Scatter: absolute change on X, % change on Y | who grew most, in units and in % | C×2T | **later**: strong and unusual; it settles the usual dispute between "most" and "fastest". Needs derived measures (Δ and Δ %) as axes · thumbnail only |
| 73 | Two pies with totals | structure then and now | C×2T +Σ | have: pie for one period; the pair is not offered (SWD) · thumbnail only |
| 74 | Semicircular bars, then left and now right | – | C×2T | no: R2 · thumbnail only |
| 75 | Icon array, before and after | – | count | no: R4 · thumbnail only |
| 76 | Isometric rows of icons | – | count | no: R3, R4 · thumbnail only |
| 77 | "Who wins" grid: most then, most now, biggest change, biggest % change, one dot per pair of countries | the findings themselves | C×2T | **text**: this is what the automatic findings and the look suggestions say in words (§5) · thumbnail only |
| 78 | Packed circles, two periods | – | C×2T | no: R1 · thumbnail only |
| 79 | Radial bars, before and after | – | C×2T | no: R2 · thumbnail only |
| 80 | Concentric half rings | – | count | no: R4 · thumbnail only |
| 81 | Radar with three axes | – | C×2T | no: SWD, the filled area overstates large values; dumbbell says it · thumbnail only |
| 82 | Nested donut, then inside now | – | C×2T +Σ | no: R2 · thumbnail only |
| 83 | Bars of unit cells with a "then" mark | change per unit | count | have: bar with a comparison marker (bar.benchmark, bullet) · thumbnail only |
| 84 | The leader against the other two stacked together | is the leader bigger than the rest combined | C×2T +Σ | **later**: "lider i reszta razem" for additive measures (small) · thumbnail only |
| 85 | Two number lines joined by lines, % change between | who moved, who overtook | C×2T | **now**: dumbbell arrows · thumbnail only |
| 86 | Nested boxes with dots (before, after, all) | – | count | no: R4 · thumbnail only |
| 87 | Proportional circles in a table | – | C×2T | no: R1 · thumbnail only |
| 88 | Thermometers, before and after | – | C×2T | no: R5 (have bar.stacked) · thumbnail only |
| 89 | One number line, flags above for then and below for now | positions and gaps | C×2T | **now**: dumbbell arrows; have strip · thumbnail only |
| 90 | 100 % columns whose width is the total (22, 33) | structure and size in one picture | C×2T +Σ | **later**: Marimekko, first in the queue (§7) · thumbnail only |
| 91 | Isometric squares | – | C×2T | no: R3, R1 · thumbnail only |
| 92 | Stacked triangles | – | C×2T +Σ | no: R1 · thumbnail only |
| 93 | Scatter then against now with ring markers | who leads in both years | C×2T | later: with #7 (ring markers: no) · thumbnail only |
| 94 | Radial tally around the emblem | – | count | no: R4, R2 · thumbnail only |
| 95 | Dot grid on each country's outline, a large number and "+2 since 2004" | the number and its change | C×2T | have: KPI card with the change · thumbnail only |
| 96 | A triangle of flag tiles | not legible at this size | – | not judged: looks like a unit chart (R4) · thumbnail only |
| 97 | Two stacked bars joined by lines, % change per part | change of the whole and the parts | C×2T +Σ | have: bar.stacked; the % → change table · thumbnail only |
| 98 | Curves from one starting point, ending at +150 %, +60 %, +15 % | who grew fastest | C×2T | have: line.indexed (start = 100) answers exactly this · thumbnail only |
| 99 | Paired columns per country with the % change between | change per unit | C×2T | have: column.clustered; % on the dumbbell and slope · thumbnail only |
| 100 | Table: then, now, change, change in %, each with a small bar, and an average row | everything exact, in the form Excel users know | C×2T | **later**: change table, first small item in the queue (§7) · thumbnail only |

**Count** (100, checked by script against the table): have 28 (three of them, #3, #19 and #54, gain the % label
built now) · now 6 (#2, #10, #15, #59, #85, #89, all one built item: the dumbbell arrows) · later 10 · text 2 ·
no 53 · not judged 1 (#96).

**What the collection teaches.** Half of the 100 are the same four charts in costume (R1–R5). The useful half says
one thing clearly: for "then and now" the reader wants **the change itself drawn and written**, as an arrow, a
connector or a column, with the percentage beside it (#2, #3, #10, #15, #19, #36, #54, #59, #60, #85, #99, #100).
zohelo had the charts (dumbbell, slope, variance looks) but wrote only the absolute difference and drew no
direction. That gap is closed in this round. The second lesson is #77: a grid that only states who wins on four
criteria. That is not a chart at all but a list of findings, which is what "smart without AI" should produce.

## 3. From Data to Viz as a rule table

The site's tree goes from the shape of the data to chart families; each leaf has a "story" page that tries the
candidates on a real dataset and says which one wins and why. Translated to zohelo's wells (measure, time, areas,
breakdown), the stories give these rules. The last column names the caveat page that applies. This table is the
source of the question groups and the suggestions in §5.

| Data shape (zohelo wells) | Question | Recommended chart → zohelo look | Rule and caveat |
|---|---|---|---|
| One measure over time, one series ("two ordered numeric") | How did it change? | Line → `line.blank`; area if the single line looks empty → `area.simple` | Lines may start above zero when the swing is small against the level, and must say so; bars and areas never (cut_y_axis). Few points: show the markers (connected scatter). Time goes on X (hard_label). Dots on an ordered X must be joined (connect_your_dot). |
| The same, against a limit | Above or below the threshold? | Area filled by side of the threshold → `area.surplus`, `line.reference` | – |
| One measure over time, several series ("one categoric, several ordered numeric") | Who changed how? | Line, one per group → `line.multi` up to about five | More than about five lines is a spaghetti chart: highlight one and grey the rest → `line.highlight`, or small multiples → `line.panels`, `area.panels` (spaghetti). |
| The same, parts of a whole | How did the structure change? | Stacked area → `area.stacked`; 100 % → `area.percent` | Stacking shows the total and each group's weight, not each group's course: only the bottom band has a flat base (stacking, mental_calculation). Streamgraph: no. |
| One measure by category, one value each ("one numeric, one categoric") | Who is highest? | Bar or lollipop, **sorted, horizontal** → `bar.ranked`, `bar.top`, dot.lollipop | Order by value, not by alphabet (order_data). Long names: horizontal (hard_label). One colour unless colour says something (color_com_nothing). Bars start at zero. Treemap or packed circles only for an overview. Circular barplot: only many groups and an obvious pattern; rejected here (circular_bar_yaxis). |
| Parts of one whole | What is the structure? | Bar; treemap for many parts → `bar.percent`, treemap, `pareto` | Pie: readers judge angles badly; prefer bars, or a treemap for many parts (pie). Percentages must sum to 100 (calculation_error). |
| One measure by category and subgroup, one value each ("several categoric, subgroups") | Compare groups within groups | Grouped bars → `column.clustered`, `bar.clustered` | Group so that each cluster has few bars; a legend over about seven entries means another chart is better; bars of a group must touch (grouped_bar). |
| The same, when the second dimension has two levels (two years, two sexes) | What changed? Who overtook whom? | **Slope chart**, or a scatter of one level against the other → slope, dumbbell, `column.variance`; scatter "then against now" (later) | The story's verdict: the slope shows rank and change at once and beats the grouped bars. |
| Nested categories with a value per leaf | What is the structure, level by level? | Treemap; sorted lollipop when the hierarchy does not matter → treemap, `bar.ranked` | Area is imprecise (area_hard). |
| One measure for many units (powiats, gminas) | How is it distributed? | Histogram, density → histogram, histogram.cumulative | Try several bin sizes; the picture changes (bin_size). |
| One measure for many units in groups | Do the groups differ? | Box plot; violin; ridgeline for many groups → boxplot, strip | A box hides the sample size and the shape: show the points (boxplot). Order the groups; horizontal for long names. |
| Two measures | Do they move together? | Scatter → scatter, scatter.trend | Many points: transparency or binning (overplotting). A trend across the whole can reverse inside groups (simpson). Never two Y axes (dual_axis). |
| Two measures over time | How did the pair travel? | Connected scatter → scatter.connected, `combo.*` | – |
| Three measures | Position and weight | Bubble → bubble | Size by area, never by radius (radius_or_area); decide which variable matters; label a few points. |
| Several measures | What goes with what? | Correlogram, heat map → heatmap.correlation | – |
| A value per region | Where is it high? | Choropleth → choropleth, tiles, symbols | The site's own page is a stub; the rule comes from SWD (§4): map rates, not totals. |
| Flows between units | Who sends to whom? | Sankey, chord, or a heat map of the matrix → sankey (waiting for flow data) | Chord and network need teaching; the heat map is the plain alternative. |

Rules that apply to every chart, from the caveat pages: keep one meaning per colour across charts in one report
(consistency); remove what does not carry data (declutter: 3D always, decoration always, grid and decimals when not
needed); annotate the point of the chart, because a reader gives it seconds (annotation); do not make the reader do
arithmetic, draw the difference itself (mental_calculation); no 3D (3d); do not reverse axes or colour meanings
(counter_intuitive).

## 4. Storytelling with Data: rules our looks apply

One row per post. "In zohelo" says where the rule lives or what this round changed.

| Chart | Use it when | Avoid it when | In zohelo |
|---|---|---|---|
| Line | "over time"; several things compared over time; context such as a goal line, a typical range, a forecast; anomalies | quantities at single points, categories without an order, part-to-whole, sparse data | Group "Jak zmieniało się w czasie". **Four or five lines** is the working limit; more only with one emphasised → the suggestion offers `line.highlight` or panels above five series. The Y axis need not start at zero, but a cut must be visible; the data should fill 70–80 % of the height. |
| Area | one series, or a few that never cross; a part-to-whole where one part is very large; panels; the **gap between two series** | scales without a meaningful zero, several volatile series, fine differences | Zero baseline always; `area.surplus` and `area.range` are the "gap" case; stacked area is offered for structure, not for following a band. |
| Bar | categories; comparing lengths from a common base | – | Zero baseline (guardrail); **order by value** unless the categories have their own order (`bar.ranked` is the first bar look); gap narrower than the bar; labels inside the bar ends; horizontal for long names. |
| Stacked bar | the **total** is the point and the parts are secondary | the parts must be compared across bars: only the bottom part has a common base | Put the important part at the base (the highlighted series is drawn first); thin white borders between parts (done); unstack to panels or lines when parts matter → the suggestion says so. 100 % stacked gives two baselines, bottom and top. |
| Pie | a general sense of part-to-whole, or one part clearly small or large | comparing slices, comparing two pies, shares that do not sum to 100 % | Pie and donut stay at five parts at most, sorted from the largest, labelled directly, no 3D; pairs of pies are not offered. |
| Table | varied units; readers who look up their own values; reading line by line | a live presentation; a pattern or shape is the point | Add a summary row and mark it; few borders; data bars or a heat map inside the table → the change table (§7). |
| Dot plot | as a bar alternative with less ink; the connected version **emphasises the difference** between two series; the axis need not start at zero | an audience that has never seen one, without labels | dumbbell and dot.cleveland; this round the dumbbell says the change in % and shows its direction. |
| Slopegraph | change between **two** points, or one series rising while others fall; two related categories | the middle of the period matters; unrelated categories; the exact amount matters more than the direction | slope; this round: the % change at the line end. |
| Waterfall | the components of a change between a start and an end value | the totals are huge against the changes (the axis cannot be cut): then start from zero and write the starting value in words | `bar.bridge`, waterfall; gains and losses grouped; values labelled because floating bars are hard to compare. |
| Bullet | a value against a target, optionally against ranges | an audience new to it: drop the ranges and keep bar and target line | bullet, kpi.target, `bar.benchmark`. |
| Scatter | the relationship of two measures | – | Label and name the quadrants; no fitted line by default when communicating; transparent points; zero not required. scatter.quadrants already draws the mean lines and names the quadrants. |
| Bubble | three measures with real variation in the third | the third measure barely varies; precise comparison of sizes | bubble, labelled, with words. |
| Choropleth | values tied to places, **normalised** (rates, per person) | totals, which favour large or populous areas; when rank precision matters use an ordered bar | Guardrail to add: suggest the map for rates and per-capita measures, the ranked bar for totals; "no data" drawn differently from zero (done). |
| Treemap | part-to-whole with many categories, hierarchy, little space | precise comparison; negative values | treemap; bars offered beside it. |
| Square area (waffle), unit chart | a share out of 100; numbers of very different size; reminding the reader that the data are people | more than one dimension; an audience that wants standard charts | waffle.grid; icon charts not built (R4). |
| Box plot | several distributions side by side | a general audience: it needs teaching, and it hides two-peaked data | boxplot stays outside the first suggestions; the histogram comes first. |
| Spider | several dimensions in a small space, for an audience that knows it | areas grow with the square of the value, so large values are overstated; the order of axes changes the shape | rejected; dumbbell or a table. |
| Sankey | a real flow between stages | categories with no flow; precise comparison | sankey waits for flow data. |
| Gantt, flowchart | project plans, processes | – | not statistics charts. |

**Titles and words.** The posts do not give a titling formula. What they repeat: write the takeaway in words on the
chart, annotate the key points, label series directly instead of through a legend, and put a legend, when needed,
under the title so the reader meets it before the data. zohelo's finding-as-title, end labels and legend-on-top
already follow this.

## 5. The rule table in the product: looks by business question

`apps/portal/src/tpl/explore/questions.ts` holds the questions; every look in `looks.ts` names one, the look bar
groups and orders the looks by them, and `suggest.ts` proposes looks from the fields in the wells, with the reason.
No AI is involved: the rules are the rows of §3 and §4.

| Question (PL) | Looks that answer it | Suggested when |
|---|---|---|
| Jak zmieniało się w czasie? | line: jedna, kilka serii, wyróżniona, panele; column: prosty, ostatni; area: prosty; combo | time on the axis; above five series the suggestion is "wyróżniona" or "panele" (spaghetti rule) |
| Kto najwyżej? | bar: ranking, top N; column: ranking, top N | categories or areas on the axis |
| Jaka struktura? | stacked and 100 % looks of column, bar, area; pie, treemap, Pareto as types | an additive measure with a breakdown; never for rates and averages |
| Wobec poprzedniego roku | column and bar: IBCS, odchylenia; dumbbell arrows, slope | at least two years of data |
| Wobec odniesienia | line: z linią odniesienia; bar: wobec Polski lub UE; area: nadwyżka i deficyt | a Poland or EU value exists, or a reference is set |
| Co się zmieniło? | bar: pomost; line: indeks = 100; area: indeks | additive measure for the bridge; any measure but a rate for the index |
| Gdzie odstaje? | line: skrajne wartości; bar: wokół średniej | several units |
| Czy jest sezon? | line: sezonowość | monthly or quarterly data |

Purely visual variants (smooth, step, markers, labels, bar width, legend place) are not looks any more; they live in
"Dostosuj". See `docs/chart-looks-spec.md` §"Looks by question".

## 6. Built in this round

- **Dumbbell "Strzałki zmiany"** (`dumbbell.arrows`, option `arrows`): the connector becomes an arrow from the
  earlier to the later value, the earlier dot is hollow, and the change is written in % (option `changeAs: "pct"`)
  or in units. From #2, #10, #15, #19, #59, #85, #89 and the SWD dot-plot post.
- **Slope with the change in %** (`slope.change`, option `changeLabels`): each line end carries "+150 %" after the
  value. From #54, #98 and the SWD slopegraph post.
- **Looks by question, suggestions with reasons** (§5).

Pareto and the cumulative histogram of the second round stay.

## 7. Queue ("later"), in order of business value

1. **Change table** (#100, #35, #36, #8, #97; SWD table post): then, now, change, change in %, a data bar per cell, a
   marked average or total row. It is the form Excel users expect, and it pastes into Excel as it is. Small: a table
   variant.
2. **Marimekko** (#90, #9; Data Viz Project; FT): structure and size in one picture, e.g. employment by section with
   widths by voivodeship. About a day in the engine.
3. **Change scatter** (#72) and **then-against-now scatter** (#7, #93; From Data to Viz): who grew most in units and
   in %, who is above the equal line. Needs derived measures as axes.
4. **Typical range on a line** (Data Viz Project control chart; SWD line post "reference band"): mean and a band of
   usual values, points outside marked. The business form of "where does it break the norm?".
5. **Leader against the rest combined** (#84) and the **% badge per panel** (#60): small look options.
6. **Ribbon chart** (#42; Data Viz Project "stacked ordered area chart"): rank and size over many periods.
7. Unchanged from round two: Likert bars, parallel coordinates, calendar heat map, density, violin, ridgeline,
   marginal scatter, hexbin, Lorenz curve, flow map (engine); band, fan, interval dot, Sankey (waiting for data).

## 8. Data Viz Project: the "later" and "rejected" types, re-judged from their pages

83 detail pages were opened. Each page gives a short definition, alternative names and the function tags; none
argues for a use in business reporting, so most verdicts stand. What changed:

| Type (DVP page) | Round two | Now | Why |
|---|---|---|---|
| Stacked ordered area / ribbon chart; sorted stream graph | no (with streamgraph) | **later** (§7.6) | The page: made to show the change of order over time, with ribbons joining the ranks. That is a real question the bump answers without size. |
| Opposite diagram (2×2) | diagram class | **have**: scatter.quadrants | The page: points on two axes, like a scatter, read by quadrant. SWD's scatter post asks for the same; the library variant with quadrants already draws the mean lines and names the quadrants. |
| Control chart | no | **later** as "typical range" (§7.4) | The page: a line with an average and limits; points beyond are suspect. Without the process-control rules it answers "where does it break the norm?". |
| Marimekko | later | later, **first engine item** | Confirmed by #90 and #9. |
| Counts plot | "heatmap covers" (wrong) | have: strip | The page: a strip plot where overlapping dots grow; our beeswarm solves the same overlap. |
| Span chart, range area, column range | have | have | dumbbell, `area.range`. |
| Waffle ("percentage grid"), progress bar | have | have | waffle.grid, bullet. |
| Layered area | have | have | `area.highlight`; the page itself warns about overlap. |
| Error bars, fan chart (time series) | later: data | later: data | Engine ready, no intervals or projections in the catalogue yet. |
| Parallel sets, alluvial | later: data | later: data | With the Sankey. |
| Violin, hexagonal binning, parallel coordinates, flow map, connection map | later | later | No new argument. |
| Radar, polar chart, polar area, radial bar, radial histogram, radial line, radial area, circular and spiral heat map, spiral histogram, curved bar, triangle bar | no | **no** (R2, R5) | The curved-bar page itself says the form is criticised as confusing and inaccurate. Polar area and the spiral forms are for cycles; the seasonal look and a month × year heat map show cycles on straight scales. |
| Proportional area (square, circle, half circle, icon, nested), packed circles, clustered force layout, bubble-based heat map, circular bubble | no | **no** (R1) | The half-circle page describes exactly the then-and-now case; the dumbbell answers it with positions. |
| Pictorial (percentage, stacked, fraction, unit, bar), icon count, tally | no | **no** (R4) beyond the waffle | The pages call them illustrative and popular in infographics; none claims precision. |
| Sunburst, multi-level donut, multi-level pie, icicle | no | **no** | Hierarchies go to the treemap (R2 for the rings). |
| Funnel, pyramid chart | no | **no** | Stage data do not exist in the sources. |
| Angular gauge, solid gauge | no | **no** | One number on a dial; the KPI card with a target says it. |
| Candlestick, Kagi, Renko | no | **no** | Need open, high, low, close; NBP publishes one fixing a day. |
| Timeline, scaled timeline, bubble timeline, Gantt | no | **no** | Events and tasks, not measures. |
| Venn, Euler, chord, non-ribbon chord, radial convergences, dendrogram | no | **no** | Sets, networks and clustering results; none in the sources. |
| 3D bar, 3D scatter, waterfall plot (3D) | no | **no** (R3) | – |
| Ternary plot, contour plot | no | **no** | Three-part compositions and gridded surfaces are not in the data. |
| Bar chart on a map, pie chart on a map, compound bubble and pie, cartogram, dot density, isoline | no | **no** (R6, or no point and grid data) | – |
| Word cloud, comparison chart | no / have | no / have (table) | – |

## 9. The master list after three rounds

The second-round master list (93 merged rows from all sources) stands with the changes of §8. Counts:

| Verdict | Types | Change |
|---|---|---|
| have (type, variant, look or setting) | 47 | +2: counts plot is "have: strip"; the 2×2 diagram is "have: scatter.quadrants" |
| built in round two | 2 | Pareto; cumulative histogram |
| built in round three | 2 | dumbbell arrows; slope with % change (variants of existing types) |
| later: data | 4 | band, fan, interval dot, Sankey |
| later: engine | 17 | the 11 of round two + change table, change scatter, then-against-now scatter, typical range, ribbon, leader-and-rest |
| reject | 29 named rows + the diagram class | −2: ribbon and control chart moved to "later" (the 2×2 diagram left the diagram class) |

The full per-type table of round two is in the git history of this file (commit 525e641); its rows are not repeated
here because none of the opened pages changed them beyond §8.

## 10. Links

100 visualisations: https://100.datavizproject.com/ (pages `/data-type/viz1/` … `/viz100/`) · From Data to Viz:
https://www.data-to-viz.com/ (stories under `/story/`, caveats under `/caveat/`) · Storytelling with Data chart
guide: https://www.storytellingwithdata.com/chart-guide · Data Viz Project: https://datavizproject.com/ (pages under
`/data-type/`) · FT Visual Vocabulary: https://journalismcourses.org/wp-content/uploads/2020/07/Visual-vocabulary.pdf
· GMU: https://infoguides.gmu.edu/data-visualization/types · Cool Infographics:
https://coolinfographics.com/dataviz-guides.
