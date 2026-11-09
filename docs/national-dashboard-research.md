# How the EU tracks a country: research for "Polska w skrócie"

2026-11-09. Owner's question: what should the country summary show, especially in "Najważniejsze liczby"? The
answer starts from the indicator sets the EU itself uses to judge a member state. Sources are listed at the end;
"opened" means the page was read in this session.

## 1. The EU's sets, what each judges, and what it means for Poland

| Set | Owner and rhythm | What it judges | Indicators | Poland now |
|---|---|---|---|---|
| **Maastricht convergence criteria** (nominal convergence) | ECB and Commission convergence reports, every two years (latest June 2026) | Readiness for the euro | 4 numeric + 2 qualitative: HICP inflation (12-month average) ≤ best three + 1.5 pp (**2.7%** in 2026); deficit ≤ **3%** of GDP; debt ≤ **60%** of GDP; long-term interest rate ≤ best three + 2 pp (**5.1%** in 2026); two years in ERM II without strain; legal compatibility | Above the inflation reference (by less than Romania); deficit above 3% (excessive deficit procedure since July 2024, correction deadline 2028); debt below 60% in 2025 but projected above it in 2026; long-term rate **5.4%** against 5.1%; zloty not in ERM II; law not fully compatible |
| **Macroeconomic Imbalance Procedure (MIP) scoreboard** | Commission, Alert Mechanism Report every autumn | Early warning of imbalances | 13 headline indicators with thresholds (below) + 23 auxiliary | Assessed each year like every member state |
| **Stability and Growth Pact / excessive deficit procedure** | Council and Commission, European Semester | Public finances | Deficit 3%, debt 60%, and since the 2024 reform a net expenditure path | In the procedure since July 2024 |
| **Social Scoreboard** (European Pillar of Social Rights) | Commission and Eurostat, in the Joint Employment Report each year | Social progress | Headline indicators in 3 chapters: equal opportunities, fair working conditions, social protection and inclusion (mostly LFS and EU-SILC) | Assessed each year |
| **EU 2030 headline social targets** (Porto) | Council, 2021 | Employment, skills, poverty | Employment 20–64 at least **78%**; adults in training each year at least **60%**; **15 million** fewer people at risk of poverty or social exclusion (5 million children) than in 2019 | Each state set its own national target (Poland's to be confirmed from its 2022 submission) |
| **EU SDG indicator set** (Eurostat) | Eurostat yearly monitoring report | Sustainable development | about 100 indicators across the 17 SDGs; 25 carry an EU target, e.g. renewables **42.5%** of final energy, net GHG **−55%** vs 1990, R&D **3%** of GDP, recycling **60%**, tertiary attainment 25–34 **45%**, early leavers **9%**, NEET **9%**, high-speed internet **100%** of households | Monitored yearly |
| **Real convergence** (cohesion) | Commission cohesion reports | Catching up with EU living standards | GDP per capita in PPS against EU = 100 (regions below 75 are "less developed"), productivity, wages | The main story of the last 20 years |

MIP headline thresholds, as the Commission states them: current account (3-year average) between −4% and +6% of
GDP; net international investment position above −35% of GDP; real effective exchange rate (3-year change) within
±10% for non-euro countries; export performance against advanced economies (3-year change) above −3%; nominal unit labour cost (3-year change) up to +12% for non-euro
countries; government debt 60%; household debt 55%; corporate debt 85%; household credit flow 14%; corporate credit
flow 13%; house prices (1-year change) up to 9%; unemployment 10%; activity rate (3-year change) not below −0.2 pp.

**ESG.** There is no EU ESG set for countries: ESG is an investor's lens. For sovereigns the reference is the World
Bank's Sovereign ESG Data Framework: 82 indicators in three pillars (environment: emissions, energy, climate risk,
natural capital; social: services, demography, education, employment, health, poverty; governance: effectiveness,
rule of law, corruption, innovation, gender). Ratings agencies' sovereign ESG scores are proprietary. Almost every
indicator in it is already in one of the EU sets above.

**What national dashboards do** (examples opened): the UK ONS national well-being dashboard (44 measures in 10
domains, each judged improved / deteriorated / unchanged against five years earlier); Australia's Measuring What
Matters (about 50 indicators, five themes: healthy, secure, sustainable, cohesive, prosperous); Destatis' Dashboard
Deutschland (100+ indicators on economy, finance, health, mobility, recent figures first); Eurostat's European
Statistical Recovery Dashboard (23 monthly and quarterly indicators, a short description of the latest situation per
view). The common pattern: a few themes as questions, a verdict per indicator, the trend, and a sentence of context.

## 2. What follows for zohelo

1. **The verdict comes from the official threshold, not from us.** Maastricht, MIP, the SGP and the 2030 targets
   each give a number to compare with. "Spełnia / nie spełnia kryterium" is a fact anyone can check, and it replaces
   the weak "3 tematy lepiej, 3 gorzej" summary we removed. This is the "smart without AI" rule in its purest form.
2. **ESG is a lens, not a section.** Tag indicators E / S / G (World Bank framework) so a reader can filter by it;
   do not build a fourth duplicate list.
3. **Two convergences, kept apart.** Nominal (Maastricht: can Poland adopt the euro) and real (is Poland catching up
   with EU living standards). Readers mix them up; the dashboard should not.
4. **Reference values change.** The Maastricht inflation and interest references are recomputed in every report
   (2024 and 2026 differ), and EU targets have dates. They belong in metadata with the report they come from, not in
   chart code.

## 3. Proposed "Polska w skrócie"

Key figures (5), each with its official yardstick: real GDP growth (EU-27); GDP per capita in PPS (EU = 100); HICP
inflation (Maastricht reference 2.7%); employment rate 20–64 (EU target 78%); general government balance (−3%).

Sections, as questions:

| Section | Indicators (in the catalogue now) | Missing in the catalogue |
|---|---|---|
| Czy doganiamy UE? (real convergence) | gdp_per_capita_pps, labour_productivity, avg_wage, gdp_per_capita_region | – |
| Czy spełniamy kryteria euro? (Maastricht scorecard) | hicp_annual_rate (12-month average), bond_yield_10y, gg_deficit_gdp, gg_debt_gdp, eurpln (stability) | the reference values per report as metadata |
| Czy gospodarka jest w równowadze? (MIP scoreboard) | current_account_gdp, niip_gdp, reer, unit_labour_cost, gg_debt_gdp, unemployment_lfs, activity_rate, price_m2_secondary (house prices) | household and corporate debt and credit flows, export market share |
| Czy rozwój jest społecznie sprawiedliwy? (Social Scoreboard, 2030 targets) | employment_rate, adult_learning, arope_rate, child_arope, neet_rate, basic_digital_skills, gender_pay_gap, gini, long_term_unemployment | housing cost overburden, early leavers, S80/S20, disability employment gap |
| Czy rozwój jest zielony i nowoczesny? (SDG targets, Green Deal, Digital Decade) | ghg_emissions, recycling_rate, pm25_mean, gerd_gdp, tertiary_attainment, broadband_households | renewables share of final energy |
| Jak zmienia się ludność? | population_total, tfr, old_age_dependency, life_expectancy, net_migration | – |
| Jak działa państwo? (governance) | government_trust, turnout_parliament | World Bank governance indicators (rule of law, corruption) |

Each section opens with a **scorecard**: indicator, Poland's latest value, the official yardstick and its source,
the EU-27 value, a verdict in words (spełnia / nie spełnia / brak progu), and a five-year trend. Charts follow for
the two or three indicators that tell the section's story. The scorecard is a new card type (a table with a verdict
column driven by threshold metadata); everything else exists.

## Sources

Opened:
- ECB press release on the 2026 convergence report: https://www.ecb.europa.eu//press/pr/date/2026/html/ecb.pr260624~ec1dcac037.en.html
- European Commission, MIP scoreboard: https://economy-finance.ec.europa.eu/economic-governance-framework/macroeconomic-imbalance-procedure/scoreboard_en
- Eurostat, EU SDG target indicators 2024: https://ec.europa.eu/eurostat/cache/website/sdg/sdg_key/sdg_key_2024/img/target_indicators_en.pdf
- Eurostat, European Pillar of Social Rights data: https://ec.europa.eu/eurostat/web/european-pillar-of-social-rights/information-data
- Council of the EU, revised Social Scoreboard headline indicators (2021): https://data.consilium.europa.eu/doc/document/ST-9314-2021-INIT/en/pdf
- European Commission, Member States' 2030 social targets: https://employment-social-affairs.ec.europa.eu/news/commission-welcomes-member-states-targets-more-social-europe-2030-2022-06-17_sk
- World Bank, Sovereign ESG Data Framework: https://esgdata.worldbank.org/data/framework
- ONS, national well-being dashboard: https://www.ons.gov.uk/visualisations/dvc2448/main_dashboard/index.html
- ABS, Measuring What Matters: https://www.abs.gov.au/statistics/measuring-what-matters
- Destatis, Dashboard Deutschland launch: https://destatis.de/EN/Press/2020/12/PE20_509_p001.html
- Destatis, European Statistical Recovery Dashboard: https://www.destatis.de/EN/eu2020/recovery-dashboard/recovery-dashboard.html

Not opened (found, to read when building): the ECB 2024 convergence report annex on Poland
(https://ecb.europa.eu/press/other-publications/convergence/pdf/ecb.cr202406_annex_pl.en.pdf); the Social
Scoreboard dashboard itself (its full headline list did not come through as text); Poland's 2022 national 2030
targets.
