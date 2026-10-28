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
