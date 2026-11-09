# Chart looks: the wardrobe (spec and handoff)

2026-11-09. Owner's brief: building a chart should feel like choosing an outfit. This document is the design
specification of what was built on branch `worktree-agent-a9358e92d92520743` (looks v3): the model, the UI, the
settings and looks per type, the rules and what was left out on purpose. Code: `apps/portal/src/tpl/explore/looks.ts`
(registry), `LookBar.tsx` (strip and pane), `LookGlyph.tsx` (glyphs), `view.ts` (build and apply), engine options in
`packages/visuals/src/z/types.ts` (`ZOptions`).

## 1. The model: garment, outfit, accessories

| Owner's word | Product word (PL / EN) | What it is | Where it lives |
|---|---|---|---|
| garment | typ wykresu / chart type | the visual form: liniowy, kolumnowy, słupkowy, warstwowy, złożony | the picker (Wizualizacja); `chart=` in the URL |
| outfit for an occasion | wygląd / look | a prepared preset of settings **and** of the dimension layout, named for the occasion it serves | ‹ › and the strip on the chart; `v=<type>.<look>` |
| accessories, alterations | ustawienia / settings | one control each, grouped like a format pane; the reader changes any on top of a look | "Dostosuj" pane; `o.<key>=<value>` for every change |

Rules of the model:

- A look is a **preset**, never a different chart: the same data, the same wells, one palette. Changing a setting
  marks the look "zmienione: …" with "Przywróć wygląd" one click away. Choosing another look drops the changes.
- The first look of every type is **Pusty** (blank): the garment without accessories, for readers who build up.
  The second is the type's default (Czysty / Ranking / Kolumny i linia).
- **Dimension layouts are looks too** (owner's request): Panele moves the legend dimension to small multiples,
  Sezonowość puts the month of the year on the axis and the years in the legend. These looks move fields between
  the wells, so the wells stay the single source of truth; the "Układ serii" setting reads them back.
- **Business (IBCS) is a comparison setting of column and bar charts**, not a type: "Wobec roku poprzedniego" = Bez
  / IBCS: AC i PY / Odchylenie na słupku / Most PY → AC (bars). The business looks are presets of it. Notation in
  the zohelo palette: AC = `series-1`, PY = `series-context`, variances `change-good` / `change-bad` only where the
  polarity judges them, else `div-positive` / `div-negative`. No black.
- **Old kinds are gone from the picker, not from links**: `stackcols`, `stacked`, `share`, `stackbars`, `diverging`,
  `ibcs`, `variance`, `ibcsbars`, `varbars`, `bridge` open as the base kind in the matching look
  (`LEGACY_KIND`). Library variants drawn from those kinds that are not looks (KPI card, fan, tables, segmented
  bar, contributions) keep the variant path and show no strip.

## 2. The look bar and the pane (UX)

### 2.1 Look bar (`LookBar`, under the title and the drill bar of the chart card)

One row, left to right:

1. **‹ ›** (`.x3-look__arrow`, 36 × 36, `zt-btn`): always first and in the same place, so the owner can keep
   clicking. They cycle through the usable looks only; locked looks are skipped.
2. **The strip** (`.x3-look__strip`): every look of the type as a card, 76 × ~62 px (68 on phones, glyph-only 54 at
   window height ≤ 720), glyph 44 × 28 + name on two lines; horizontal scroll with snap and a thin scrollbar; the
   current card scrolls into view on every change. Current = `aria-pressed="true"`, `accent` border on
   `accent-tint`. Locked = `disabled`, 45 % opacity, the reason in `title` and in a visually hidden span.
   Business looks carry a sr-only style only; colour never marks a style.
3. **Dostosuj** (`.x3-look__custom`, icon + label; icon only below a 480 px card) toggles the pane;
   `aria-pressed`; a count badge shows how many settings differ from the look.

Under the row one small line: **name** (bold) **2/12 ·** then either the occasion ("Każda seria w swoim kolorze,
nazwy na końcach linii.") or, when changed, "zmienione: Kształt linii, Siatka · Przywróć wygląd". The name span is
`aria-live="polite"`, so the arrows are heard.

Why glyphs and not live thumbnails: twelve live charts of the reader's data in 44 px would be noise and would
re-render on every edit; a stylised glyph is what Excel, Datawrapper and Flourish use for recognition, and it stays
legible at 390 px. The live preview is the chart itself: every click redraws it.

### 2.2 Settings pane (`LookPane`)

- **Where**: in the right rail instead of the catalogue when the explorer grid is ≥ 1000 px (`x3-grid--pane`,
  296 px); beside the chart when the card itself is ≥ 820 px (view mode, `xp-canvas__stage--pane`); under the chart
  otherwise (phones). The chart is always visible while adjusting: that is the point of a format pane (Power BI,
  Tableau and Qlik all keep it beside the canvas). The old popover covered the chart.
- **Head**: "Dostosuj wykres", "Przywróć wygląd" (only when something changed), close ×. One sentence of context:
  "Wygląd Czysty to gotowy zestaw tych ustawień (liniowy). Zmień, co chcesz; wykres zmienia się od razu."
- **Search** ("Szukaj ustawienia"): filters rows by name and option labels; opens every group while active.
- **Groups** as `<details>` in a fixed order: Układ danych · Porównanie biznesowe · Wyróżnienie · Kształt · Analityka
  · Etykiety · Osie · Legenda i tytuł. The first two and any group with a change open by default; a badge counts
  changes per group.
- **Rows**: name (+ "· zmienione"), one `Segmented` control (≤ 5 options, wrapping), a one-line hint when the setting
  needs it, and locked options marked "⊘" with the reason under the control. Settings the data cannot have at all
  (confidence band, forecast) show the reason instead of a control. Rows whose `when` does not hold are not shown
  (no stacking choice without a series dimension; no panel axis without panels; no drawing settings in business
  mode where the IBCS notation decides).
- `?dostosuj=1` opens the pane on load for review links and the UI suite; it is never written to the URL.

### 2.3 The picker

The picker lists **types**. For the five wardrobe types the right panel says where looks live ("Wyglądy tego typu
wybierzesz na wykresie strzałkami ‹ ›…"), shows the looks as glyph chips for a direct jump (locked ones greyed with
the reason) and a primary "Użyj: Kolumnowy". Library variants of those types that are not looks (Wkłady i suma,
Jeden słupek podzielony) stay as cards. The trigger reads "Wizualizacja: Liniowy · Czysty".

### 2.4 Keyboard and screen reader

Tab order: ‹, ›, each usable card in strip order, Dostosuj, (Przywróć wygląd), then the chart. Cards are buttons
with `aria-pressed`; the strip is a `role="group"` named "Wyglądy: Liniowy". The pane is a `section` named by its
heading; groups are native `details/summary`; every control is a `Segmented` group named by the setting. Locked
options stay in the DOM with the reason next to them; a click on one does nothing. Focus rings use `--focus`.

## 3. Settings catalogue

Every setting is a `SettingDef` with `key`, labels, group, options (first = the type's neutral value), optional hint,
`when` (visibility) and `lock` (why an option cannot be chosen now). The same lock decides the pane, the URL
(`effectiveSettings` falls back to the first allowed option) and the drawing, so they never disagree.

### 3.1 Context the locks read (`LookCtx`)

| Field | From | Locks |
|---|---|---|
| `rates` | any measure's unit is pct / pp / rate / per_ | Skala: Indeks |
| `additive` | `additive(shape)` (counts, money, persons; not averages, rates, shares) | Skumulowane, 100 %, Most; folding the rest into "Pozostałe" |
| `grain` | the measures' native frequency | Sezonowość (needs M or Q) |
| `timeX` | X axis is `t` | Kolejność (a time axis keeps its order); annotations, trend, index need time |
| `seriesCount` | members of the legend or panels dimension | panels, stacking, band (≥ 3), emphasis of several |
| `years` | the data span | business comparison (needs the previous year) |
| `hasPL`, `hasEU` | among the categories or series | UE-27 benchmark and reference |
| `layout` | read from the wells: one · legend · panels · seasonal | the "Układ serii" value |
| `business` | compare ≠ none and allowed | hides drawing settings the IBCS notation owns |

### 3.2 Line (`LINE_SETTINGS`, 24)

| Group | Key | Options (first = default) | Notes |
|---|---|---|---|
| Układ danych | series | Serie na jednym wykresie · Osobne panele · Sezonowo: lata jako serie | moves fields between wells; locked without a series dimension / without M or Q data |
| | panelAxis | Wspólna skala · Dopasowana do panelu | panels only |
| | panelContext | Bez tła · Pozostałe serie na szaro | panels only (FT style) |
| | top | Wszystkie · 10 · 5 · 3 najwyższe | by the latest value; Polska always stays; seasonal: the latest years |
| Wyróżnienie | emphasis | Wszystkie w kolorach · Jedna na tle szarych · Najwyższa i najniższa | hero = Polska when present, the latest year in seasonal, else the first series |
| | context | Ciągłe · Przerywane | when a hero exists |
| Kształt | shape | Prosta · Wygładzona · Schodki | |
| | weight | Cienka · Standard · Gruba | default Standard |
| | markers | Bez · W każdym okresie | ≤ 40 periods |
| | fill | Bez · Pod wyróżnioną · Pod wszystkimi | |
| Analityka | reference | Brak · Zero · Średnia · Mediana | of the hero (or first) series |
| | band | Brak · Rozpiętość pozostałych · Środkowe 50 % pozostałych | ≥ 3 series; with a hero the grey lines are not drawn twice; seasonal: previous years |
| | trend | Bez · Liniowy | time axis, not in panels |
| | annotate | Brak · Szczyt · Dołek · Szczyt i dołek | time axis |
| | uncertainty, forecast | locked | the catalogue has no intervals or forecasts yet |
| Etykiety | names | Na końcu linii · W legendzie · Oba | default Na końcu linii; with a hero and > 4 grey lines the grey ones go unlabelled |
| | values | Brak · Ostatnia · Najwyższa i najniższa · Wszystkie (do 24) | |
| | decimals | Auto · 0 · 1 · 2 | |
| Osie | scale | Wartości · Indeks, start = 100 | locked for rates |
| | zero | Dopasowany · Od zera | |
| | grid | Pozioma · Bez | |
| Legenda i tytuł | legend | Pod wykresem · Nad wykresem · Ukryta | |
| | title | Opis danych · Wniosek jako tytuł | |

### 3.3 Column (`COLUMN_SETTINGS`, 16)

| Group | Key | Options | Notes |
|---|---|---|---|
| Układ danych | series | Na jednym wykresie · Osobne panele | shown with a series dimension |
| | stack | Obok siebie · Skumulowane · Skumulowane 100 % | locked when the parts do not add up |
| | panelAxis | as line | |
| | top | Wszystkie · 10 · 5 · 3 | categories: the rest fold into "Pozostałe (n)" when additive, else are dropped with a note; series: by the latest value |
| | sort | Jak w danych · Malejąco · Rosnąco | locked on a time axis |
| Porównanie biznesowe | compare | Bez · IBCS: AC i PY · Odchylenie na słupku | needs two years of data; over time (x = t) or over categories (AC vs PY per category) |
| Wyróżnienie | emphasis | Wszystkie w kolorach · Polska lub ostatni okres | time axis → the latest column in colour, the rest grey; categories → Polska |
| Kształt | barWidth | Standard · Wąskie | |
| Analityka | reference | Brak · Zero · Średnia · Mediana · UE-27 | UE-27 only when it is among the categories |
| Etykiety | barLabels | Ostatnia i wyróżniona · Wszystkie · Brak | "all" only when the labels fit the bar pitch |
| | totals | Nad słupkiem · Bez | stacked only |
| | decimals | | |
| Osie | scale, grid | | |
| Legenda i tytuł | legend, title | | |

### 3.4 Bar (`BAR_SETTINGS`, 13)

As column, with: `sort` default **Malejąco**; `benchmark` Bez · UE-27 (grey bar, bold name, dotted line);
`diverging` Od zera w prawo · Dodatnie i ujemne (single series); `compare` adds **Most PY → AC** (additive only);
no grid or bar width (rows are fixed height).

### 3.5 Area (`AREA_SETTINGS`, 17)

`series`, `stack` (Nakładające się · Skumulowane · Struktura 100 %), `panelAxis`, `top`, `emphasis`, `shape`,
`areaFill` (Lekkie · Mocne), `markers`, `surplus` (Nad i pod linią: above zero or the reference line in the series
colour, below in `div-negative`; one series), `band` (Rozpiętość pozostałych wokół wyróżnionej, ≥ 3 series),
`reference`, `names`, `decimals`, `scale`, `grid`, `legend`, `title`. Areas always start at zero (no "Początek
osi"): a filled shape with a hidden base lies.

### 3.6 Combo (`COMBO_SETTINGS`, 15)

`series` (Jeden wykres · Osobne panele), `swap` (which measure is the columns), `emphasis` (Kolumny i linia w kolorze
· Linia na tle szarych kolumn), `lineColour` (Atrament · Drugi kolor serii), `shape`, `weight`, `markers`,
`barWidth`, `reference`, `barLabels` (Brak · Ostatnia · Wszystkie), `lineLabel` (Na końcu linii · Brak), `decimals`,
`grid`, `legend`, `title`. One axis, always: two units are refused by the explorer's layout issue.

## 4. Looks per type (occasion, style, settings that define it)

Style is metadata for the guide and the picker filters; it never changes colours.

**Liniowy (15; 13 usable with the sample data)**
Pusty · Czysty (every series its colour, names at the ends) · Bohater i tło (editorial: Polska, grey context, only
the hero named) · Najwyższa i najniższa (editorial: two extremes + band of the rest) · Panele · Panele z tłem
(editorial, FT) · Sezonowość (months on the axis, latest year as hero against the range of the previous years) ·
Wobec średniej (hero, average line, fill) · Z trendem (scientific: trend + peak/trough) · Z etykietami (editorial:
no grid, thick, min/max/last) · Indeks = 100 (editorial, levels only) · Miękki (smooth, fill, no grid; presenting)
· Schodkowy (rates) · Z przedziałem ufności (scientific, locked) · Z prognozą (locked).

**Kolumnowy (12)**
Pusty · Czysty · Ostatni okres (editorial: latest column in colour) · Z etykietami (editorial) · Ranking (sorted,
Polska, average line; categories only) · Top 5 i pozostałe · Grupowane · Skumulowane · Struktura 100 % (segment
labels) · Panele · Biznesowy: AC i PY (IBCS) · Biznesowy: odchylenia (integrated variance, Zebra BI style).

**Słupkowy (12)**
Pusty (data order) · Ranking · Wobec UE-27 · Top 5 i pozostałe · Wokół zera (diverging) · Grupowane · Skumulowane
· Struktura 100 % · Panele · Biznesowy: AC i PY · Biznesowy: odchylenia · Most PY → AC.

**Warstwowy (10)**
Pusty · Czysty · Bohater i tło (strong fill) · Skumulowany · Struktura 100 % · Nadwyżka i deficyt · Pasmo
pozostałych (scientific: Polska as a line, the voivodeships as a band) · Panele · Indeks = 100 · Miękki.

**Złożony (6)**
Pusty · Kolumny i linia · Linia na tle kolumn (editorial: grey columns, line in `series-2` with its last value) ·
Z etykietami · Miękki · Panele.

Behaviour of a locked look: in the strip it is greyed with the reason; opened from a link it falls back to the
type's default look and the chart notes say why ("Wygląd „Indeks = 100” jest niedostępny dla tych danych: Indeks ma
sens dla poziomów… Pokazano „Czysty”.").

## 5. Rules

- **One palette.** Every look, including the business ones, draws with `series-1…5`, `series-context`,
  `series-reference`, `div-*` and `change-good/bad`. Never black for AC, never red/green without a polarity.
- **No dual axes.** Combo = two measures in one unit on one axis. Different units: the explorer says so.
- **Statistics before style.** Stacking, 100 %, Pozostałe and the bridge are locked for averages, rates and shares
  (`additive`); a line needs time on the X axis; the index needs levels; a business comparison needs the previous
  year in the data. The lock text says why in one sentence and what to choose instead.
- **Accessibility.** Text ≥ 11 px in charts; segment labels on a surface plate (white on `series-3` fails 4.5:1);
  colour never the only cue (names, values, legend, sr text); every control is a native button; axe clean, focus
  visible, no sideways scroll at 390 (UI suite pages `tpl-explore-looks`, `tpl-explore-looks-view`,
  `tpl-explore-business`).
- **Phone.** Strip scrolls under the thumb with ‹ › still first; Dostosuj becomes an icon; the pane sits under the
  chart; cards are 68 px. Short windows (≤ 720 px high) show glyph-only cards so the chart stays above the fold.
- **URL.** `v=<look>` plus `o.<key>=<value>` for the changes; layout looks are realised in the wells
  (`x`, `leg`, `sm`), and a link naming a panels or seasonal look without the matching wells gets them on parse.
  Undo/redo covers every look and setting change (they go through the same patch).

## 6. Deliberately left out

- **Live data thumbnails** in the strip (noise, cost; glyphs recognise better at 44 px).
- **Free colour pickers, fonts, shadows, 3D, gradients** — the design system decides; the owner asked for "not
  another Power BI".
- **Dual axes and secondary scales** (misleading; refused by the library since v1).
- **Per-series settings** (colour or width per line): emphasis, top N and the hero rule cover the real cases.
- **Sorting a time axis**, **axis not from zero for areas and columns**, **100 % of non-additive measures**.
- **A persistent "my looks" library**: saved views already keep `v` and `o`; custom looks come with accounts.
- **Panel axis sharing across grid panels** (column/area/combo panels are separate charts with their own axes;
  only the line's `small-multiples` shares one). Noted for the engine's next round.
- **Qlik-style "alternative dimensions" in the chart**: the wells and drill bar already do this.

## 7. Open questions for the owner

1. Should the business looks also appear as a **style filter in the strip** (Standard · Biznesowy · Redakcyjny ·
   Naukowy chips above the cards), or is the picker's style filter enough?
2. The seasonal look caps at the last 8 years (legend cap). Would you rather see all years as thin grey lines
   with only the last two in colour?
3. "Top N" folds the rest into "Pozostałe" only for additive measures. For averages, should it show the weighted
   average of the rest when population weights exist in the catalogue?
