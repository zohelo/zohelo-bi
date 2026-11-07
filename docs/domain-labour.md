# Labour & income (Praca i dochody): research and domain spec

Domain expert spec for `dashboards/domains/labour.yaml`, written 2026-11-07 on branch `template`. Same method as
economy, business and finance: read how official publishers report the domain, then decide pages, sections, KPIs,
charts, dimensions and reference lines. This doc is the spec; the YAML and sample KPIs are built from it.
Figures marked (verify) must be checked against the source before the dashboard goes live on real data.

## 1. How the domain is reported (what readers already know)

| Publisher | Publication | What it shows first |
|---|---|---|
| GUS | Sytuacja społeczno-gospodarcza kraju (monthly), ch. Rynek pracy | Enterprise-sector employment and average wage (nominal, real), registered unemployment rate |
| GUS | Aktywność ekonomiczna ludności Polski (BAEL, quarterly) | Activity, employment and unemployment rates by sex, age, education, urban/rural, voivodeship |
| GUS | Popyt na pracę (quarterly) | Job vacancies, vacancy rate, newly created and liquidated jobs |
| GUS | Struktura wynagrodzeń według zawodów (biennial) | Wage distribution: median, deciles, gender gap, occupations |
| GUS | Budżety gospodarstw domowych (annual), EU-SILC (annual) | Disposable income and spending per person; poverty (extreme, relative, AROPE), Gini, S80/S20 |
| MRPiPS | Bezrobocie rejestrowane (monthly) | Registered unemployed, inflows/outflows, long-term unemployed, offers |
| NBP | Kwartalny raport o rynku pracy | Labour market tightness (vacancies per unemployed, Beveridge curve), wage growth vs productivity, unit labour costs |
| ZUS | Informacja o świadczeniach (monthly/annual) | Pensioners, average pension, replacement rate |
| Eurostat | LFS headline, EU-SILC, Social Scoreboard of the European Pillar of Social Rights | Employment rate 20–64 (EU 2030 target 78%; Poland's national target 78.5% (verify)), NEET, gender employment gap, AROPE, child AROPE, impact of social transfers on poverty, GDHI per capita |

Reading order used by NBP and the Social Scoreboard: **quantity of work → price of work → what households
end up with → the safety net.** The dashboard follows it.

## 2. Pages and sections

Overview (`/d/labour`): KPI row + four sections, one per page below, each with the single chart that answers
"how is it going".

| Page (domain group) | Sections | Question each section answers |
|---|---|---|
| Zatrudnienie i bezrobocie (`labour.employment`) | Poziom zatrudnienia · Bezrobocie · Napięcie na rynku pracy · Regiony | How many work, how many cannot find work, how hard is it to hire, where |
| Wynagrodzenia i koszty pracy (`labour.wages`) | Płace nominalne i realne · Struktura płac · Koszty pracy i wydajność | Are wages rising faster than prices; for whom; is it sustainable for firms |
| Dochody i warunki życia (`labour.income_living`) | Dochody · Nierówności · Ubóstwo | What households have, how evenly, who is left behind |
| Zabezpieczenie społeczne (`labour.social_protection`) | Wydatki · Emerytury · Świadczenia rodzinne | How much the state spends and on whom |

## 3. KPIs

Existing sample KPIs (12) stay. New ones needed (16), all with real official sources:

| kpi_key | Name (PL) | Unit | Freq | Geo | Dims | Source |
|---|---|---|---|---|---|---|
| activity_rate | Współczynnik aktywności zawodowej 15–89 | pct | Q | nuts2 | sex, age | GUS BAEL |
| employment_enterprise | Przeciętne zatrudnienie w sektorze przedsiębiorstw, r/r | pct | M | pl | – | GUS |
| registered_unemployed | Bezrobotni zarejestrowani | count_th | M | nuts2 | sex | MRPiPS/GUS |
| long_term_unemployment | Stopa bezrobocia długotrwałego | pct | A | eu | – | Eurostat LFS |
| youth_unemployment | Stopa bezrobocia osób 15–24 | pct | Q | eu | sex | Eurostat LFS |
| neet_rate | Młodzież NEET 15–29 | pct | A | eu | sex | Eurostat LFS |
| job_vacancy_rate | Wskaźnik wolnych miejsc pracy | pct | Q | eu | nace | GUS Popyt na pracę / Eurostat |
| vacancies_per_unemployed | Wolne miejsca pracy na 100 bezrobotnych | idx | Q | pl | – | GUS, MRPiPS (derived) |
| real_wage_growth | Realne przeciętne wynagrodzenie, r/r | pct | M | pl | – | GUS |
| nominal_wage_growth | Przeciętne wynagrodzenie, r/r | pct | M | pl | nace | GUS |
| median_wage | Mediana wynagrodzeń | pln | A | pl | sex | GUS Struktura wynagrodzeń |
| unit_labour_cost | Jednostkowe koszty pracy, r/r | pct | Q | eu | – | Eurostat |
| labour_productivity | Wydajność pracy na pracującego, r/r | pct | Q | eu | – | Eurostat |
| extreme_poverty | Zasięg ubóstwa skrajnego | pct | A | pl | urban | GUS BGD |
| child_arope | Dzieci zagrożone ubóstwem lub wykluczeniem | pct | A | eu | – | Eurostat EU-SILC |
| avg_pension | Przeciętna emerytura ZUS | pln | A | pl | – | ZUS |

New dimension: `education` (podstawowe/gimnazjalne, zasadnicze zawodowe, średnie, wyższe) for BAEL rates.
`zus_pension_avg` already exists in the catalogue (finance domain): reuse it instead of `avg_pension`.

## 4. Charts and reference lines

| Card | Chart | Reference | Why |
|---|---|---|---|
| Employment rate 20–64 vs EU-27 | line + reference EU27 | target line 78.5% (verify) | The headline EU 2030 target |
| Unemployment LFS vs registered | two lines, same axis | – | Readers confuse them; showing both explains the gap |
| Unemployment by voivodeship | choropleth + ranked bars | PL value | Regional question is the most asked |
| Vacancies per 100 unemployed | line | – | NBP's tightness measure |
| Beveridge curve | scatter (unemployment × vacancy rate, points = quarters) | – | Standard tightness view |
| Nominal vs real wage growth | two lines + CPI | 0 line | "Are wages beating prices" |
| Wages by NACE section | ranked bars | national average | Who earns most |
| Median vs average wage | dumbbell by sex | – | Average overstates the typical wage |
| ULC vs productivity | lines | 0 line | Sustainability of wage growth |
| Disposable income urban/rural | lines | – | Gap over time |
| Gini and S80/S20 vs EU-27 | lines + EU27 | – | Inequality |
| AROPE, child AROPE, extreme poverty | small multiples | EU27 | Who is left behind |
| Social spending % GDP vs EU | ranked bars of countries | EU27 | Scale of the state |
| Pensioners and average pension | columns + line (same axis not possible: two cards) | – | No dual axis (template rule) |

Colour: polarity for green/red only where direction is agreed — unemployment, NEET, AROPE, poverty, Gini
(lower = better); employment, activity, real wages, median wage (higher = better). Wage growth and ULC have no
agreed polarity (neutral).

## 5. Filters

Page filters: period (per chart), geography level (Kraj / Województwo) on Zatrudnienie and Wynagrodzenia,
sex on BAEL cards. No source filter (one source per KPI, except unemployment LFS: GUS and Eurostat).

## 6. Build plan and cost

1. `ops/template/kpis.py`: 15 new KPIs (reuse `zus_pension_avg`), `education` dimension; polarity in `polarity.ts`.
2. `python3 ops/template/gen_data.py` → `apps/portal/src/data/dummyCatalog.ts`, prettier.
3. Hand-write `dashboards/domains/labour.yaml` from §2–§5 (remove the GENERATED STARTER header).
4. `tests/ui/pages.json`: add the four labour pages. Definition of done as in the handover.
Push size: about 260 KB (catalogue file is regenerated whole), the largest single push so far.
