# Dashboard

How a dashboard page is assembled inside the app shell.

## Reading order

1. **Page header:** title and a one-sentence finding ("Inflacja w Polsce wróciła do pasma celu NBP po szczycie z lutego 2023").
2. **KPI row:** 3–5 KPI tiles, the numbers to remember. Each: label, period, value, neutral change with arrow, one line of context, source.
3. **Main trend:** the widest card (8 of 12 columns): the headline indicator over time, with its reference band and peak annotation.
4. **Companion:** 4 columns: a compact comparison of the same moment (bullet chart of related measures, ranking).
5. **Breakdown rows:** two 6-column cards: geography (EU ranking, voivodeship tile map), structure (100% bars), seasonality (heatmap).
6. **Detail:** a table of all series on the page, then the methodology note.

Summary before detail, always. Never open with a table or a filter panel.

## Grid

12 columns, 16px gap. Allowed card spans: 12, 8+4, 6+6, 4+4+4, 3×4 (KPI only). Cards in a row share their height; content sets it, never empty space. Below 1280px every chart row stacks to one column in the same order (KPI tiles go two per row).

## Chart card

Every chart sits in a chart card (see the ChartCard component):

- **Title** (`card-title`) states the finding; **subtitle** (`caption`, `ink-3`) states measure, unit, frequency and range.
- **View toggle** Wykres | Tabela top-right; **actions menu** (⋯): Pokaż tabelę, Pełny ekran, Pobierz CSV, Pobierz PNG, Kopiuj link do wykresu, Osadź na stronie, Otwórz w Eksploratorze, Źródło i metodologia.
- **Chart** drawn from the Chart library rules.
- **Legend** under the chart for 2+ series; **source line** at the bottom: "Źródło: Eurostat (prc_hicp_manr)", plus data date and next release where known.
- **States:** loading (skeleton bars, same height), empty ("Brak danych dla wybranego okresu" + how to change it), not applicable ("Dane tylko krajowe"), error (what failed + Spróbuj ponownie). See the ChartStates card.

## Filters

- Dashboard-wide filters sit in one row under the page header (Okres, Obszar, Częstotliwość, Źródło), each a button showing its current value. They apply to every card and are written to the URL.
- A card that a filter does not apply to says so in its subtitle.
- Comparison series appear as removable chips with their series colour swatch.
- The period control (1 rok | 5 lat | 10 lat | Max) is a segmented control with `aria-pressed`.

## KPI tile rules

- Value in `kpi-value` (proportional figures), period top-right in `ink-muted`.
- Change: arrow ▲/▼ plus value and basis ("▼ 0,1 pp m/m") in `ink-2`; never coloured.
- Context line: the comparison that gives the number meaning ("W paśmie celu NBP", "UE-27: 5,9%").
- Sparkline 88×30, `series-1`, no axes; hidden on phone.
- A tile is not a chart: no single-bar charts, no gauges, no donut "progress" rings.

## Density and count

- Max 4 KPI tiles and 6 chart cards above the detail table. More belongs on another tab.
- One hero colour per page: Polska is always `series-1`; comparison countries `series-context` unless the chart compares 2–3 named series.

## Export and share

Udostępnij copies the URL (with filters). Pobierz dane downloads all series on the page as CSV with a metadata header (source, licence, date). PNG export renders the card at 2× with the source line and the mark.
