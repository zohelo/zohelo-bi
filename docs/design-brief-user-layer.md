# Design brief: the user layer (home, explorer, dashboards landing)

Owner: Radek. Written 2026-11-05 for an agent continuing the design template on branch `template`.
Read `docs/handover-2026-11-04.md` first (where things are, definition of done, rules). This brief says
**what to build and how to work with the owner**; the handover says **how the repo works**.

## 1. The problem in one paragraph

The topic dashboards (`/d/<domain>`) are well structured and approved. What is missing is the layer a visitor
meets *before* and *around* them: a home page that feels alive and personal, an explorer that is as flexible
as Power BI but as easy as a search box, and a dashboards landing that summarises everything at a glance. The
owner knows what he wants when he sees it but finds it hard to describe up front. **So do not ask him to
specify — show him variants and let him react.** (See §6.)

## 2. The owner's ideas, written out

These are his ideas, made concrete. Treat them as requirements; the "means" lines are the interpretation to
build and then confirm by showing.

1. **AI support and guidance.** One box that understands plain language ("inflation in Poland vs Germany since
   2015") and turns it into a view, and that also helps a newcomer: suggests what to ask, explains what a
   chart shows, says where the data comes from.
   Means: the ask box is the hero of home and the top of the explorer; answers are always a real, editable
   view (fields visible), never a black box; every view has "explain this" (definition, source, caveats).
   v1 is rule-based (`ai/intent.ts`); v2 LLM is planned (`docs/ai-view-builder.md`) — design for both, the UI
   must not change when v2 arrives.
2. **Data exploration.** Pick one or more KPIs, then domain, group, source, dimensions and filters, and place
   each field where it should go — like Power BI's field list and wells — on data from R2.
   Means: explorer v3 (§4.2). The data catalogue lives inside the explorer: everything visible with nothing
   selected, descriptions of the data behind a selection.
3. **Easy accessibility.** For everyone: phone, keyboard, screen reader, people who are not analysts.
   Means: WCAG 2.2 AA (axe 0 in the UI suite), every drag action also doable by click and keyboard, plain
   Polish first, no jargon without a definition, every value readable without colour or hover.
4. **Favourites, featured, recommended, popular, saved views.** A personal layer like Netflix rows or the
   Power BI home (Recent / Favourites / Recommended).
   Means: the Dla Ciebie section on home (`ForYouSection`); stars on every KPI, dashboard and view; local
   storage now, accounts later (`personal.ts`). Rows that are empty must teach what fills them, not look broken.
5. **A background on top of the home page**, as seen in other services.
   Means: a hero band with a quiet visual (§5) behind the ask box — gives the page identity and a sense of
   "data about Poland" without hurting contrast or speed.
6. **Roles and plans.** Guide only for admins now; later free (basic) vs paid (premium) content.
   Means: keep everything behind `role` / a future `plan` flag in one place; design a tasteful "premium"
   marker but do not build paywalls.

## 3. Reference services (show the owner these patterns by name)

Pick from these when building variants, and say which one each variant borrows from — the owner reacts to
named patterns much faster than to abstract descriptions.

| Pattern | Seen in | Use for |
|---|---|---|
| Prompt-first home (big box, suggestion chips) | Perplexity, ChatGPT, Notion AI | Home hero, explorer top |
| Personal rows (Recent, Favourites, Recommended) | Power BI home, Netflix, Spotify | Dla Ciebie |
| Gradient / mesh hero band | Stripe, Linear, Vercel | Home background |
| Data-shaped hero (faint chart lines or a map) | Our World in Data, USAFacts, FRED | Home background with meaning |
| Field list + wells + chart | Power BI, Tableau, Looker Studio | Explorer v3 |
| Grapher (one chart, tabs: chart/map/table/sources) | Our World in Data | Explorer result card |
| Catalogue side panel with definitions | Eurostat Data Browser, FRED series notes | Explorer catalogue panel |
| KPI summary strip, green/red with words | Google Finance, Power BI scorecards | Dashboards landing |
| "Chart of the day" / featured story | Tableau Public, Statista | Home "featured" |

Do not copy any brand's visuals; borrow the layout pattern only, in zohelo tokens.

## 4. Pages

### 4.1 Home (`/`)
Order, top to bottom:
1. **Hero band** with background (§5): title, one-line promise, the ask box (large), 4 example prompts,
   scope line (indicators · topics · sources · date) and "Open the explorer".
2. **Dla Ciebie** — favourites, your views, frequently viewed, recommended (from interests), featured by
   zohelo, popular. Horizontal rows of cards, max one row each on desktop, "see all" when longer. First visit
   (nothing saved): one friendly onboarding card "Pick your topics" instead of six empty rows.
3. **Context for you** — the key figures of the reader's topics (KPI cards with agreed red/green,
   `polarity.ts`), else Poland in 8 figures. Not called "dashboards".
4. **What's new in the data** — recently updated indicators + short catalogue summary.
5. Optional, for a variant: **Featured story** — one chart with two sentences of explanation (Tableau Public's
   viz-of-the-day pattern).
Not on home: a copy of the sidebar, the guide, a dashboard grid.

### 4.2 Explorer v4 (`/explore`; v3 reviewed by the owner on 2026-11-05)
Three zones (desktop), stacked on phones; on wide, tall screens the explorer fits one browser page (the zones
share the window height below the ask box and scroll inside; a chart that needs more room grows the page).
- **Top:** page title with save / downloads on the right, the ask box under it. An answer fills the wells below,
  visibly — the user sees and can change what AI chose.
- **Left — Pola:** search; **Miary** (measures, domain → group) and **Wymiary** (dimensions), both collapsed at
  first. Dimensions are Analysis Services-style tables: Kalendarz (key = period; levels Rok → Kwartał →
  Miesiąc, attributes Miesiąc roku, Kwartał roku), Geografia (key = NUTS code; Kraj → Województwo, powiaty and
  gminy with BDL data), one table per breakdown. "+" on a table adds the whole hierarchy (drillable on the
  chart), "+" on a level adds that level. No measure → every dimension; with measures → the union of their
  dimensions (a measure without a placed dimension shows its total, and the chart says so).
- **Centre — Wells + chart:** Wartości (oś Y) or one well per measure where the chart needs it (scatter X/Y,
  bubble size, combo columns/line, map colour), Oś X, Legenda, Małe wielokrotności (or Wiersze/Kolumny, Punkty,
  Kroki…), Filtry. Time goes on the x axis. Every chart kind can be chosen; a kind with empty required wells
  says what it needs on the canvas; only a kind that cannot be drawn at all is disabled. Card: business title
  from the selection ("Stopa bezrobocia według województw i płci, 2 kw. 2026"), subtitle (unit, frequency,
  filters, count), one-line finding, drill bar for hierarchies, legend, notes, source. Kopiuj: PNG or SVG
  (title, subtitle, legend, source), raw data, pivot table (categories in rows, series in columns), XLSX/CSV.
  The explorer opens blank; `mode=view` shows the chart alone (saved views open this way, "Edytuj widok").
- **Right — Catalogue panel:** nothing selected → the whole catalogue (domains, counts, sources, freshness,
  search); something selected → definitions, unit, frequency, coverage, source with link, methodology notes,
  related indicators. Collapsible; as tall as the canvas.
Data: sample data now via `data.*`; the shape must match what R2 serving will return (KPI × dimension
members × period).

### 4.3 Dashboards landing (`/d`)
1. Summary strip: one headline KPI per topic (KPI cards, agreed red/green, words for screen readers), plus a
   one-line overall summary ("8 of 12 topics improved last period") computed from polarity.
2. Topic cards: richer than now — icon, 2–3 figures with coloured change pills, a tiny sparkline, pages and
   indicator counts, "updated <date>". Grid 4/3/2/1 with no partial rows.
3. Sticky page head + scroll spacing identical to topic dashboards (already done; keep it).

## 5. Home background — options to show

Build all three behind a switch; the owner picks.
- **A. Soft gradient mesh** in accent/series tokens at low saturation (Stripe/Linear feel). Cheapest, calm.
- **B. Data lines**: faint, wide line charts of real headline series (GDP, CPI, wages) drawn as SVG behind the
  hero — says "data" without words (OWID/FRED feel).
- **C. Poland map**: a faint voivodeship choropleth of one indicator, changing daily (USAFacts feel).
Rules for all: pure CSS/SVG (no images to download), text contrast ≥ 4.5:1 over every point of it, works in
dark mode via tokens, `prefers-reduced-motion` = no animation, nothing loads before the ask box is usable,
hidden from screen readers (`aria-hidden`).

## 6. How to work with the owner (important)

- **React, don't specify.** For each page, build 2–3 variants reachable in the live template (e.g. a
  "Variant: A / B / C" switch in the account panel next to the role preview, stored in localStorage), deploy,
  and send the owner one screenshot per variant at 1440 and 390 with one line each: what it borrows (§3)
  and the trade-off. Ask him to pick and to say what he likes/dislikes in each — then merge the best parts.
- One question at a time; best version first, then the question.
- Prose, direct, push back when an idea hurts usability or accessibility — say why and offer the alternative.
- Polish UI copy first (English second); keep his English technical terms.

## 7. Milestones (each one deployable on its own; stop and report after each)

1. Home hero band with backgrounds A/B/C + variant switch. Deploy, screenshots, owner picks.
2. Home Dla Ciebie polish (onboarding card, horizontal rows, "see all") + optional featured story variant.
3. Dashboards landing: overall summary line, richer topic cards with sparklines.
4. Explorer v3 skeleton: fields panel, wells, click/keyboard placement, URL state, catalogue panel (no drag).
5. Explorer v3: drag and drop, chart recommendation, incompatible-field reasons, AI box filling the wells.
6. Extended chart library (area, stacked area, 100% bar, waterfall, dumbbell, slope, bullet, combo, heat
   calendar, treemap, histogram/box, ranking table) with "use when / avoid when" cards in the guide.
Update `docs/handover-2026-11-04.md` at the end of every milestone.

## 8. Definition of done

As in the handover: check, lint, test, prettier, dashboards check, build, UI suite (axe 0, focus ring, no
sideways scroll at 1440/768/390, chart text ≥ 11px), screenshots looked at in Polish and English, deploy via
the `deploy.yml` workflow on `template`. Never merge to `main`; never handle secrets.
