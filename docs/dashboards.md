# Dashboard format

Dashboards are YAML files in `dashboards/`, one dashboard per file. They are declared, not coded:
the portal bundles them at build time and `ops/check-dashboards.ts` fails CI when one names
something the semantic manifest does not have.

## Version 1 (today)

Read by `apps/portal/src/dashboards.ts`.

- `id` — the dashboard's id; `overview` is listed first.
- `title` — shown as the page heading and in the dashboard list.
- `description` — optional text under the title.
- `tiles` — the list of tiles, in display order. Each tile has:
  - `title` — the tile heading.
  - `note` — optional text under the tile heading.
  - `metric` — a metric id from `packages/semantic`.
  - `chart` — `line` or `bar`.
  - `selects` — optional; `true` on a bar tile makes a click on a bar set `$selected`.
  - `filters` — dimension column → list of values; the value `$selected` is replaced by the
    value picked in the `selects` tile.

## Version 2

Version 2 is the contract the validator, the smoke test and the five domain dashboards are built
against. Keys and KPIs refer to the published `catalog.json`.

| field | type | required | meaning |
|---|---|---|---|
| `schema` | `2` | yes | Format version; a file without it is version 1. |
| `id` | string, kebab-case | yes | The dashboard id; equals the file name without `.yaml`. |
| `title_pl`, `title_en` | string | yes | Page heading in Polish and English. |
| `description_pl`, `description_en` | string | no | Text under the heading. |
| `domain_key` | string | yes | A domain key of `catalog.json`; groups the dashboard by domain. |
| `slicers` | list of `geography` and/or `period` | no (default none) | Page-level pickers applied to every tile. |
| `tiles` | list of tiles | yes, 1–12 | The tiles, in display order. |

Tile:

| field | type | required | meaning |
|---|---|---|---|
| `title_pl`, `title_en` | string | yes | Tile heading in Polish and English. |
| `kpi_key` | string | yes | A KPI key of `catalog.json`. |
| `view` | string | yes | Explorer URL query without `?`, e.g. `rows=geo&cols=time&geo_level=voivodeship`. |
| `chart` | `line` \| `bar` \| `multiples` \| `ranking` \| `map` | yes | How the tile draws the view. |
| `selects` | boolean | no | As in version 1: a click sets `$selected` for the other tiles. |
| `note_pl`, `note_en` | string | no | Text under the tile heading. |
| `title_unselected_pl`, `title_unselected_en` | string | no | Heading while nothing is selected, for a tile whose title uses `$selected`; the tile then asks the user to click the selecting tile. |

## Rules

- A slicer value overrides the same parameter in every tile's `view`: `geography` sets `geography_name`,
  `period` sets `from` and `to` (inclusive `date_key` prefixes, e.g. `2015` or `2015-01`).
- `$selected` keeps its version 1 meaning: the value picked in the tile with `selects: true`.
- A version 1 file has no `schema` field and stays valid until the five-dashboards Deliverable
  migrates it.

## Example

```yaml
schema: 2
id: population-labour
title_pl: Ludność i rynek pracy
title_en: Population and labour
description_pl: Liczba ludności Polski i bezrobocie w województwach.
description_en: Poland's population and unemployment by voivodeship.
domain_key: population
slicers: [period]
tiles:
  - title_pl: Ludność Polski
    title_en: Population of Poland
    kpi_key: population
    view: rows=time&geo_level=country&geo=PL
    chart: line
  - title_pl: Stopa bezrobocia według województw
    title_en: Unemployment rate by voivodeship
    kpi_key: unemployment_rate
    view: rows=geo&cols=time&geo_level=voivodeship
    chart: ranking
    note_pl: Ostatni dostępny okres.
    note_en: Latest available period.
```

## Version 3 (domain dashboards)

One file per catalogue domain: `dashboards/domains/<domain_key>.yaml`, `schema: 3`. The file is the domain
overview (`/d/<domain>`) plus one page per domain group (`/d/<domain>/<page id>`); the portal draws whatever the
file says, so changing a dashboard never needs code. The 12 starter files come from
`python3 ops/template/gen_dashboards.py` and are template placeholders: the Domain expert owns them from then on
and edits them by hand. Rules live in `packages/semantic/src/dashboardsV3.ts` (types, `validateDashboardV3`,
`validateDashboardV3Catalog`, `v3ChartFit`); the portal build fails on a structural error and
`bun ops/check-dashboards.ts` also checks every key against the catalogue. Messages are Polish / English and name
the file and the path, e.g. `dashboards/domains/economy.yaml: pages[2].sections[0].cards[1].chart: nieznany typ
wykresu „pie” / unknown chart type "pie"`.

### File

| field | type | required | meaning |
|---|---|---|---|
| `schema` | `3` | yes | Format version. |
| `id` | string | yes | Equals `domain_key` and the file name. |
| `domain_key` | string | yes | A catalogue domain (level `domain`). |
| `title_pl`, `title_en` | string | yes | Domain title (h1 of the overview, breadcrumb). |
| `description_pl`, `description_en` | string | no | Short description for lists. |
| `overview` | Overview | yes | The domain landing page. |
| `pages` | list of Page | yes | One page per group of the domain; every group needs a page. |

Overview: `lead_pl`, `lead_en` (one-sentence finding), `filters` (optional), `kpis` (3–5 tiles), `sections`
(optional). Below the sections the overview always lists the domain's pages.

Page:

| field | type | required | meaning |
|---|---|---|---|
| `id` | string | yes | The group key suffix: page `prices` of `economy` is group `economy.prices`. |
| `group_key` | string | yes | `<domain_key>.<id>`. |
| `title_pl`, `title_en` | string | yes | Page title (h1). |
| `lead_pl`, `lead_en` | string | yes | One sentence stating the main finding. |
| `filters` | list | no | Dashboard-wide filters, see below. |
| `kpis` | list of tiles, 3–5 | yes | The KPI row: a KPI key, or `{kpi, geography?, context_pl?, context_en?}`. |
| `sections` | list of sections | yes | h2 sections of chart cards; the page's section navigation lists them. |

Section (the third level under domain → page; not in the sidebar):

| field | type | required | meaning |
|---|---|---|---|
| `id` | slug | no | Anchor `#sec-<id>` (lower-case letters, digits, hyphens; unique on the page). Default: its position. |
| `title_pl`, `title_en` | string | yes | Section heading (h2): what the section answers. |
| `nav_pl`, `nav_en` | string, ≤ 28 characters | no | Short label of the section's button in the sticky header. Default: the title. |
| `lead_pl`, `lead_en` | string | no | One sentence under the heading. |
| `cards` | list | yes | Chart cards, at most 6 with a chart. |

The page header (title, period, sample tag) and the section buttons stay fixed under the top bar while the page
scrolls; the button of the section being read is marked. "Najważniejsze liczby" (the KPI row) is always the first
button, "Obszary" the last on the overview.

### Card

| field | type | required | meaning |
|---|---|---|---|
| `kpi` | KPI key | yes | The card's indicator. |
| `chart` | one of the 21 chart types | yes | `line-band`, `line-highlight`, `columns`, `contributions`, `small-multiples`, `area-share`, `ranked-bars`, `grouped-bars`, `dumbbell`, `slope`, `diverging-bars`, `bullet`, `waterfall`, `stacked-bars`, `segmented-bar`, `pyramid`, `histogram`, `scatter`, `tile-map`, `heatmap`, `sparkline-table`. |
| `title_pl`, `title_en` | string | yes | States the finding. Tokens filled from the data: `{value}` (latest value), `{period}`, `{geo}` (selected area), `{top}`, `{bottom}` (highest / lowest category, or largest / smallest change), `{from}`, `{to}` (window). |
| `sub_pl`, `sub_en` | string | no | Default: KPI name, unit, frequency, range, plus a note for every filter that does not apply. |
| `span` | 12 \| 8 \| 6 \| 4 | no (12) | Width in grid columns. Cards of a section fill rows of 12, 8+4, 4+8, 6+6 or 4+4+4. |
| `geographies` | list of keys, `voivodeships` or `eu` | no | Categories or comparison lines. Default: voivodeships when the KPI has them, else Poland and EU countries (the Poziom filter switches). |
| `compare` | list of KPI keys | scatter, optional for bullet / sparkline-table | `scatter`: the x-axis KPI (exactly one). `bullet`, `sparkline-table`: further rows (bullet: same unit). |
| `split` | dimension key | part-of-whole charts, `contributions` | Members become series, parts or components. |
| `period` | `1y`, `5y`, `10y`, `max` or `{from, to}` | no (`10y`; heatmap, sparkline-table and contributions `5y`) | Window of time charts; the two ends for two-period charts. Bounds as `2015`, `2015-01` or `2015-Q1`. |
| `band` | `[low, high]` | no | Target band (line-band, bullet). |
| `reference` | number, geography key, or `{value, label_pl, label_en}` | no | Reference line; a geography key (`EU27`, `PL`) takes that area's latest value. |
| `highlight` | geography or member key | no | Emphasised category; default the selected area. |
| `annotate` | `max`, `min`, `last` or `{x, label_pl, label_en}` | no | One annotated point. |

At most 6 chart cards per section and 18 per page (`sparkline-table` does not count): a long page is split into sections, each a screen or so.

### What each chart draws (and needs)

| chart | data drawn | needs (checked) |
|---|---|---|
| `line-band` | the KPI over the window for the selected area | – |
| `line-highlight` | selected area as hero; neighbours (EU27, DE, CZ, SK, HU) or Poland with the 2 highest and 2 lowest voivodeships; or split members | several areas or `split` |
| `columns` | annual values (rates: annual mean) or, for levels, annual change | – |
| `contributions` | per period, each member's contribution as a signed stacked column (positive parts up from zero, negative down) and the KPI's `total` member as a dot; tooltip and table in pp with sign | `split` with at most 7 members, unit `pp` |
| `small-multiples` | one panel per area (max 9) or member, shared scale | several areas or `split` |
| `area-share` | member shares over time, % | `split`, additive unit |
| `ranked-bars` | latest value per area or member, sorted | several areas or `split` |
| `grouped-bars`, `dumbbell`, `slope` | the two ends of the window per category | several areas or `split` |
| `diverging-bars` | change since the window start (pp for %, % for levels) | several areas or `split` |
| `bullet` | latest value of the KPI and `compare` KPIs (or areas / members) against `band` | `compare`, `split` or areas |
| `waterfall` | change of each member between the window ends | `split`, additive unit |
| `stacked-bars` | member shares at window start, middle and end | `split`, additive unit |
| `segmented-bar` | member shares at the latest period | `split`, additive unit |
| `pyramid` | men and women by age band, latest period | dimensions `sex` and `age` |
| `histogram` | number of voivodeships per value range, median reference | voivodeship data |
| `scatter` | one dot per area: `compare` KPI (x) against the KPI (y) | `compare` with one KPI, shared areas |
| `tile-map` | latest value per voivodeship | voivodeship data |
| `heatmap` | month × year | monthly KPI |
| `sparkline-table` | the KPI and `compare` KPIs: latest value, change, trend | – |

Additive units (members add up to a whole): `pln_bn`, `eur_bn`, `persons_th`, `persons_mn`, `count`, `count_th`,
`twh`, `t_th`, `ha_th`, `m3_mn`.

`contributions` is the "contributions to growth" chart of NBP, ECB and ONS (GDP growth by demand component,
CPI inflation by group). Use it when the members are components that add up to a headline rate, given as
contributions in percentage points (unit `pp`); the members may be negative. Label the total in the title
(`{value}` is the latest total, signed, in pp; `{top}` / `{bottom}` the largest / smallest contribution in the
latest period). At most 7 components (more fold into "Pozostałe" from the 6th on; the checker rejects a
dimension with more than 7 members); for one period use `waterfall`. The total dot is the KPI's `total` member;
without it, the sum of the members.

### Filters

`filters` lists any of `period`, `geography`, `geo_level`, `source` and dimension keys (`sex`, `age`, `nace`, …).
Values live in the URL so a link reproduces the view: `?period=5y&geo=PL14&level=country&source=eurostat&sex=f`.
`period` is the segmented control in the page header (Domyślny | 1 rok | 5 lat | 10 lat | Maks.; Domyślny keeps
each card's own period); the rest form one row of selects under the header. A filter applies to every card whose
KPI supports it; otherwise the card says so in its subtitle. The checker rejects a filter no KPI of the page can use.

### Example

Leads are plain text (tokens work in card titles only). One page shown; the real file has a page per group.

```yaml
schema: 3
id: economy
domain_key: economy
title_pl: Gospodarka
title_en: Economy
overview:
  lead_pl: "Inflacja wróciła do pasma celu NBP."
  lead_en: "Inflation is back within the NBP target band."
  kpis: [gdp_real_growth, hicp_annual_rate, gfcf_rate]
pages:
  - id: prices
    group_key: economy.prices
    title_pl: "Ceny i inflacja"
    title_en: "Prices & inflation"
    lead_pl: "Inflacja HICP w Polsce: szczyt z 2023 roku minął."
    lead_en: "HICP inflation in Poland: the 2023 peak has passed."
    filters: [period, geography, coicop]
    kpis: [hicp_annual_rate, cpi_annual_rate, core_inflation]
    sections:
      - title_pl: Trend
        title_en: Trend
        cards:
          - kpi: hicp_annual_rate
            chart: line-band
            title_pl: "Inflacja HICP: {value} ({period})"
            title_en: "HICP inflation: {value} ({period})"
            span: 8
            band: [1.5, 3.5]
            annotate: max
          - kpi: hicp_annual_rate
            chart: bullet
            compare: [cpi_annual_rate, core_inflation]
            band: [1.5, 3.5]
            title_pl: "Wszystkie miary inflacji blisko celu"
            title_en: "Every inflation measure is near the target"
            span: 4
```
