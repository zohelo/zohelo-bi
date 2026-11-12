# AI view builder

The home page search panel takes a request in the reader's own words ("inflacja w Polsce i Niemczech od 2015",
"bezrobocie w województwach na mapie", "show me GDP growth vs EU", "dashboard o finansach publicznych", "jak czytać
wykres") and either sends the reader to existing content (indicator page, dashboard page, guide page) or builds a
Data explorer view. Code: `apps/portal/src/tpl/ai/` (`intent.ts`, `ViewBuilder.tsx`, `ai.css`).

## v1: rule-based, in the browser

No server, no LLM, no key: `buildView(text, catalog, lang)` is a deterministic parser over the catalogue.

- **Words**: lower case, diacritics folded (`ł` = `l`), "2015–2020" read as a range, "UE-27" as `ue27`. Words match
  by stem (prefix), so Polish inflection is tolerated: "inflacji", "województwach", "Niemczech" → DE, "Czechach" →
  CZ, "UE"/"Unii" → EU27, "na Mazowszu" → PL-14. Upper-case ISO codes (DE, CZ…) are areas.
- **Indicators**: a synonym table (inflacja/CPI/HICP, bezrobocie, PKB/GDP/wzrost gospodarczy, płace/wynagrodzenia,
  dług, deficyt, kurs euro, ludność, mieszkania, eksport…), multi-word topics first ("ceny mieszkań" before
  "mieszkania"). A concept picks the indicator that has the requested scope: inflation is HICP when other countries
  are asked for, CPI otherwise; GDP growth is regional GDP for voivodeships. Unknown words fall back to stems of
  catalogue names ("szkoły podstawowe").
- **Areas**: Poland, the EU countries in the catalogue, EU27, "kraje UE", "sąsiedzi", the 16 voivodeships in all
  cases with their regions and English names, the largest cities (Warszawa → mazowieckie, said in the explanation);
  "województwa"/"regiony" → voivodeship level.
- **Periods**: "od 2015", "2015–2020", "w latach 2015–2020", "do 2020", "w 2024", "ostatnie 5 lat", "last 10
  years", "ostatnia dekada", "cały okres". Windows the explorer does not offer (3 years) become fixed years.
- **Charts**: "na mapie" → tile map (switches to voivodeships), "ranking" → ranked bars, "linia", "słupki",
  "mapa cieplna", "rozrzut"/"korelacja" → scatter; "porównaj"/"vs"/"na tle" adds Poland to foreign areas; two
  indicators ("płace a inflacja") get the explorer's compare mode for their units ("indeks", "osobne panele" override).
- **Content**: "dashboard o …" → `/d/<domain>[/<page>]` (domain and group names from the catalogue, pages from
  `dashboards/domains/*.yaml`); a topic word alone ("zdrowie") → its dashboard; an indicator alone → `/kpi/<key>`;
  guide topics ("jak czytać wykres", "kolory", "dostępność") → `/przewodnik/<slug>`.

Explorer URLs are made with the explorer's own state (`normaliseQuery` + `serialiseExplore`), so the explanation
describes the normalised view the link really opens; anything the request asked for but the data cannot show (a map
without voivodeship data, a year before the series starts) is said in the explanation and lowers the confidence.

`<ViewBuilder />` is the panel (field, four example prompts, result card with the explanation as chips, "Otwórz",
alternatives, live region). It is marked "Wersja próbna: dopasowanie bez AI" and takes an optional `engine`.

## Output contract

```ts
type ViewProposal = {
  kind: "explore" | "kpi" | "dashboard" | "guide" | "none";
  url: string; // /explore?…, /kpi/<key>, /d/<domain>[/<page>], /przewodnik[/<slug>]; for "none" /catalogue[?q=…]
  title: string; // what will be shown, in the UI language
  explanation: string[]; // how the request was read: "Wskaźnik: …", "Obszary: …", "Okres: …", "Wykres: …", notes
  alternatives: { label: string; url: string }[]; // up to 3
  confidence: "high" | "medium" | "low";
};
type ViewBuilderEngine = (text: string, cat: Catalog, lang: Lang) => ViewProposal | Promise<ViewProposal>;
```

`proposalUrlOk(url, catalog)` accepts only URLs the pages open: explorer queries in normal form (parse and serialise
back to the same string), known indicator keys, existing dashboard pages and guide slugs, same origin.

## v2: an LLM behind a Pages Function (plan)

- **Where**: a Cloudflare Pages Function `POST /api/view` in `apps/portal/functions/`. The browser sends the text
  and the UI language; `ViewBuilder` gets an `engine` that calls it and falls back to `buildView` on any error or
  timeout, so the panel keeps working without the backend.
- **Model input**: the catalogue as tool definitions rather than prose: `open_explorer` (indicator keys, level, areas,
  period, chart, compare as enums from the catalogue and `exploreState.ts`), `open_indicator`, `open_dashboard`
  (domain and page ids from the dashboard files), `open_guide` (slugs from `guide/sections.ts`). The model picks a
  tool and its arguments; it never writes URLs.
- **Same output**: the function turns the tool call into a `ViewProposal` with the same code as v1 (normaliseQuery,
  serialiseExplore, dashboardUrl), adds the explanation from the normalised state, and validates every URL with
  `proposalUrlOk` (the same parsers the pages use). An invalid or empty answer becomes the v1 result.
- **Limits**: text capped at 300 characters; per-IP rate limit and a daily request budget (Workers KV or Durable
  Object counter) with the v1 parser as the answer once spent; Turnstile on repeated use; a small, fast model with a
  short output limit; responses cached by normalised text. No logging of request text beyond aggregate counts.
- **Keys**: the model API key is an organisation-level secret of the Pages project (Cloudflare dashboard or
  `wrangler pages secret put`), read only by the function. No keys in the repository, in `.env` files that are
  committed, or in the browser bundle. The tag on the panel changes to name the AI only when v2 is live.
