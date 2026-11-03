"""Dummy KPI set for the zohelo design template (sample data only).

Three plausible indicators per domain group so every domain dashboard looks like real statistics.
Each entry: (key, name_pl, name_en, unit, frequency, base, trend_per_year, noise, geo, dims)
  unit       one of UNITS below
  frequency  M (monthly), Q (quarterly), A (annual)
  base       level at the start of the series (2010)
  trend      change per year (absolute, in the unit)
  noise      relative noise (0.0-0.1)
  geo        "nuts2" = Poland + 16 voivodeships + EU countries, "eu" = Poland + EU countries, "pl" = Poland only
  dims       extra dimension keys from DIMENSIONS (breakdowns)
The values are synthetic. The generator (ops/template/gen_data.py) writes apps/portal/src/data/dummyKpis.ts.
"""

UNITS = {
    "pct": ("%", "procent", "per cent", True),
    "pp": ("pp", "punkty procentowe", "percentage points", True),
    "idx": ("pkt", "indeks", "index points", False),
    "pln": ("zł", "złote", "zloty", False),
    "pln_th": ("tys. zł", "tysiące złotych", "thousand zloty", False),
    "pln_bn": ("mld zł", "miliardy złotych", "billion zloty", False),
    "eur": ("€", "euro", "euro", False),
    "eur_bn": ("mld €", "miliardy euro", "billion euro", False),
    "persons_th": ("tys. osób", "tysiące osób", "thousand persons", False),
    "persons_mn": ("mln osób", "miliony osób", "million persons", False),
    "count": ("szt.", "sztuki", "count", False),
    "count_th": ("tys.", "tysiące", "thousand", False),
    "per_1000": ("‰", "na 1000 mieszkańców", "per 1,000 inhabitants", True),
    "per_100k": ("na 100 tys.", "na 100 tys. mieszkańców", "per 100,000 inhabitants", True),
    "years": ("lat", "lata", "years", False),
    "rate_fx": ("zł", "złote za jednostkę", "zloty per unit", False),
    "m2": ("m²", "metry kwadratowe", "square metres", False),
    "t_th": ("tys. t", "tysiące ton", "thousand tonnes", False),
    "kg_pc": ("kg/os.", "kilogramy na osobę", "kg per person", False),
    "twh": ("TWh", "terawatogodziny", "terawatt-hours", False),
    "celsius": ("°C", "stopnie Celsjusza", "degrees Celsius", False),
    "km": ("km", "kilometry", "kilometres", False),
    "hours": ("godz.", "godziny", "hours", False),
    "ug_m3": ("µg/m³", "mikrogramy na m³", "micrograms per m³", False),
}

DIMENSIONS = {
    "sex": ("Płeć", "Sex", [("total", "ogółem", "total"), ("m", "mężczyźni", "men"), ("f", "kobiety", "women")]),
    "age": ("Wiek", "Age", [("total", "ogółem", "total"), ("y15_24", "15–24 lata", "15–24"), ("y25_54", "25–54 lata", "25–54"), ("y55_64", "55–64 lata", "55–64")]),
    "sector": ("Sektor", "Sector", [("total", "ogółem", "total"), ("public", "publiczny", "public"), ("private", "prywatny", "private")]),
    "nace": ("Sekcja PKD", "NACE section", [("total", "ogółem", "total"), ("c", "przetwórstwo przemysłowe", "manufacturing"), ("f", "budownictwo", "construction"), ("g", "handel", "trade"), ("j", "informacja i komunikacja", "ICT")]),
    "coicop": ("Grupa COICOP", "COICOP group", [("total", "ogółem", "total"), ("food", "żywność", "food"), ("energy", "energia", "energy"), ("services", "usługi", "services")]),
    "urban": ("Miasto/wieś", "Urban/rural", [("total", "ogółem", "total"), ("urban", "miasto", "urban"), ("rural", "wieś", "rural")]),
    "level": ("Poziom", "Level", [("total", "ogółem", "total"), ("primary", "podstawowy", "primary"), ("secondary", "średni", "secondary"), ("tertiary", "wyższy", "tertiary")]),
    "fuel": ("Nośnik", "Fuel", [("total", "ogółem", "total"), ("coal", "węgiel", "coal"), ("gas", "gaz", "gas"), ("res", "OZE", "renewables")]),
    "mode": ("Rodzaj transportu", "Mode", [("total", "ogółem", "total"), ("road", "drogowy", "road"), ("rail", "kolejowy", "rail"), ("air", "lotniczy", "air")]),
    "demand": ("Składnik popytu", "Demand component", [("total", "PKB", "GDP"), ("hh", "spożycie gospodarstw domowych", "household consumption"), ("gov", "spożycie publiczne", "public consumption"), ("gfcf", "inwestycje", "investment (GFCF)"), ("stocks", "zmiana zapasów", "change in inventories"), ("nx", "eksport netto", "net exports")]),
    "core": ("Miara inflacji bazowej", "Core measure", [("total", "inflacja bazowa", "core inflation"), ("food_energy", "bez cen żywności i energii", "excluding food and energy"), ("volatile", "bez cen najbardziej zmiennych", "excluding most volatile prices"), ("admin", "bez cen kontrolowanych", "excluding administered prices"), ("trimmed", "średnia obcięta 15%", "15% trimmed mean")]),
    "asset": ("Rodzaj aktywów", "Asset type", [("total", "ogółem", "total"), ("dwellings", "budynki mieszkalne", "dwellings"), ("buildings", "pozostałe budynki i budowle", "other buildings and structures"), ("machinery", "maszyny i urządzenia", "machinery and equipment"), ("ipp", "produkty własności intelektualnej", "intellectual property products")]),
    "bop": ("Składnik rachunku bieżącego", "Current account component", [("total", "saldo ogółem", "total balance"), ("goods", "towary", "goods"), ("services", "usługi", "services"), ("primary", "dochody pierwotne", "primary income"), ("secondary", "dochody wtórne", "secondary income")]),
    "partner": ("Kraj partnera", "Partner country", [("total", "ogółem", "total"), ("de", "Niemcy", "Germany"), ("cz", "Czechy", "Czechia"), ("fr", "Francja", "France"), ("gb", "Wielka Brytania", "United Kingdom"), ("nl", "Holandia", "Netherlands"), ("other", "pozostałe", "other")]),
}

K = [
    # ---------------- economy (Domain expert spec: claude/economy research doc, 2026-11-03)
    ("economy.national_accounts", [
        ("gdp_real_growth", "PKB, wzrost realny r/r", "GDP, real growth y/y", "pct", "Q", 3.5, -0.05, 0.6, "eu", []),
        ("gdp_qoq_sa", "PKB, wzrost realny k/k (wyrównany sezonowo)", "GDP, real growth q/q (seasonally adjusted)", "pct", "Q", 0.9, -0.01, 0.7, "eu", []),
        ("gdp_contributions", "Wkład składników popytu do wzrostu PKB", "Contributions to GDP growth by demand component", "pp", "Q", 3.5, -0.05, 0.6, "pl", ["demand"]),
        ("gdp_nominal", "PKB w cenach bieżących", "GDP at current prices", "pln_bn", "A", 1450, 160, 0.01, "pl", []),
        ("gdp_per_capita_pps", "PKB na mieszkańca (PPS, UE=100)", "GDP per capita (PPS, EU=100)", "idx", "A", 62, 1.6, 0.01, "nuts2", []),
        ("gdp_regional_growth", "PKB regionu, wzrost realny r/r", "Regional GDP, real growth y/y", "pct", "A", 3.6, -0.03, 0.5, "nuts2", []),
        ("gva_by_section", "Wartość dodana brutto", "Gross value added", "pln_bn", "A", 1250, 95, 0.02, "pl", ["nace"]),
    ]),
    ("economy.business_cycle", [
        ("industrial_production", "Produkcja sprzedana przemysłu, r/r", "Industrial production, y/y", "pct", "M", 4.0, 0.0, 0.8, "nuts2", ["nace"]),
        ("business_climate", "Wskaźnik koniunktury", "Business climate indicator", "idx", "M", -2.0, 0.1, 1.2, "pl", ["nace"]),
        ("esi", "Wskaźnik nastrojów ekonomicznych (ESI)", "Economic sentiment indicator (ESI)", "idx", "M", 100, 0.0, 0.04, "eu", []),
        ("cli_oecd", "Złożony wskaźnik wyprzedzający OECD", "OECD composite leading indicator", "idx", "M", 100, 0.0, 0.01, "eu", []),
        ("consumer_confidence", "Bieżący wskaźnik ufności konsumenckiej", "Consumer confidence", "idx", "M", -18, 0.6, 0.5, "pl", []),
    ]),
    ("economy.prices", [
        ("cpi_annual_rate", "Inflacja CPI (GUS), r/r", "CPI inflation (GUS), y/y", "pct", "M", 2.6, 0.0, 0.45, "nuts2", ["coicop"]),
        ("cpi_contributions", "Wkład grup towarów i usług do inflacji CPI", "Contributions to CPI inflation by group", "pp", "M", 2.6, 0.0, 0.45, "pl", ["coicop"]),
        ("core_inflation", "Inflacja bazowa", "Core inflation", "pct", "M", 2.0, 0.05, 0.6, "pl", ["core"]),
        ("hicp_annual_rate", "Inflacja HICP, r/r", "HICP inflation, y/y", "pct", "M", 2.5, 0.0, 0.45, "eu", ["coicop"]),
        ("ppi_annual_rate", "Ceny produkcji sprzedanej przemysłu (PPI), r/r", "Producer prices in industry (PPI), y/y", "pct", "M", 2.0, 0.0, 0.9, "eu", []),
        ("inflation_expectations", "Oczekiwana inflacja konsumentów (12 miesięcy)", "Consumers' expected inflation (12 months)", "pct", "M", 2.8, 0.05, 0.5, "pl", []),
    ]),
    ("economy.investment", [
        ("gfcf_growth", "Nakłady brutto na środki trwałe, wzrost realny r/r", "Gross fixed capital formation, real growth y/y", "pct", "Q", 5.0, -0.1, 1.0, "eu", []),
        ("gfcf_rate", "Stopa inwestycji (nakłady brutto na środki trwałe / PKB)", "Investment rate (GFCF / GDP)", "pct", "A", 20.5, -0.2, 0.03, "eu", []),
        ("gfcf_by_asset", "Nakłady brutto na środki trwałe wg rodzaju", "Gross fixed capital formation by asset", "pln_bn", "A", 290, 18, 0.03, "pl", ["asset"]),
        ("investment_outlays", "Nakłady inwestycyjne przedsiębiorstw", "Enterprise investment outlays", "pln_bn", "A", 140, 9, 0.04, "nuts2", ["sector"]),
        ("capacity_utilisation", "Wykorzystanie mocy produkcyjnych w przemyśle", "Capacity utilisation in industry", "pct", "Q", 78, 0.1, 0.02, "eu", []),
        ("fdi_inflow", "Napływ bezpośrednich inwestycji zagranicznych", "FDI inflow", "eur_bn", "A", 12, 0.8, 0.15, "pl", []),
    ]),
    ("economy.trade_bop", [
        ("current_account_gdp", "Saldo rachunku bieżącego / PKB (suma 4 kwartałów)", "Current account / GDP (4-quarter sum)", "pct", "Q", -4.5, 0.4, 0.4, "eu", []),
        ("current_account_components", "Saldo rachunku bieżącego wg składników / PKB", "Current account by component / GDP", "pp", "Q", -4.5, 0.4, 0.4, "pl", ["bop"]),
        ("exports_goods", "Eksport towarów", "Exports of goods", "eur_bn", "M", 11, 1.2, 0.05, "pl", []),
        ("exports_by_partner", "Eksport towarów wg kraju partnera", "Exports of goods by partner country", "eur_bn", "A", 130, 14, 0.03, "pl", ["partner"]),
        ("trade_balance", "Saldo handlu towarami", "Trade balance in goods", "eur_bn", "M", -0.8, 0.12, 0.6, "pl", []),
        ("niip_gdp", "Międzynarodowa pozycja inwestycyjna netto / PKB", "Net international investment position / GDP", "pct", "Q", -66, 2.1, 0.03, "eu", []),
        ("reer", "Realny efektywny kurs walutowy (2015=100)", "Real effective exchange rate (2015=100)", "idx", "M", 100, 0.6, 0.03, "eu", []),
    ]),
    # ---------------- finance
    ("finance.public_finance", [
        ("gg_debt_gdp", "Dług sektora instytucji rządowych i samorządowych / PKB", "General government debt / GDP", "pct", "A", 53, 0.3, 0.03, "eu", []),
        ("gg_deficit_gdp", "Saldo sektora finansów publicznych / PKB", "General government balance / GDP", "pct", "A", -5.0, 0.1, 0.25, "eu", []),
        ("state_budget_revenue", "Dochody budżetu państwa", "State budget revenue", "pln_bn", "M", 22, 2.4, 0.08, "pl", []),
    ]),
    ("finance.money_banking", [
        ("nbp_reference_rate", "Stopa referencyjna NBP", "NBP reference rate", "pct", "M", 3.5, 0.08, 0.15, "pl", []),
        ("wibor_3m", "WIBOR 3M", "WIBOR 3M", "pct", "M", 3.8, 0.08, 0.15, "pl", []),
        ("household_deposits", "Depozyty gospodarstw domowych", "Household deposits", "pln_bn", "M", 520, 70, 0.01, "pl", []),
    ]),
    ("finance.fx_gold", [
        ("eurpln", "Kurs EUR/PLN (NBP)", "EUR/PLN rate (NBP)", "rate_fx", "M", 4.0, 0.02, 0.02, "pl", []),
        ("usdpln", "Kurs USD/PLN (NBP)", "USD/PLN rate (NBP)", "rate_fx", "M", 3.0, 0.07, 0.04, "pl", []),
        ("gold_price_pln", "Cena złota (NBP), zł/g", "Gold price (NBP), PLN/g", "pln", "M", 130, 12, 0.04, "pl", []),
    ]),
    ("finance.capital_markets", [
        ("wig_index", "Indeks WIG", "WIG index", "idx", "M", 40000, 2600, 0.05, "pl", []),
        ("market_cap_gpw", "Kapitalizacja spółek krajowych GPW", "Domestic market capitalisation (WSE)", "pln_bn", "M", 420, 30, 0.06, "pl", []),
        ("ipo_count", "Debiuty na GPW", "WSE listings (IPOs)", "count", "A", 34, -2.4, 0.2, "pl", []),
    ]),
    ("finance.insurance_pensions", [
        ("zus_pension_avg", "Przeciętna emerytura z ZUS", "Average ZUS pension", "pln", "A", 1800, 160, 0.01, "nuts2", ["sex"]),
        ("ppk_participation", "Uczestnictwo w PPK", "PPK participation rate", "pct", "A", 30, 2.0, 0.03, "pl", ["age"]),
        ("insurance_premiums", "Składka przypisana brutto", "Gross written premiums", "pln_bn", "A", 55, 3.2, 0.04, "pl", []),
    ]),
    ("finance.local_government", [
        ("lg_revenue_pc", "Dochody budżetów JST na mieszkańca", "Local government revenue per capita", "pln", "A", 4200, 380, 0.02, "nuts2", []),
        ("lg_investment_share", "Udział wydatków majątkowych JST", "Local government capital spending share", "pct", "A", 21, -0.2, 0.08, "nuts2", []),
        ("lg_debt_ratio", "Zadłużenie JST / dochody", "Local government debt / revenue", "pct", "A", 32, -0.6, 0.05, "nuts2", []),
    ]),
    # ---------------- business
    ("business.enterprises", [
        ("regon_entities", "Podmioty w rejestrze REGON", "Entities in the REGON register", "count_th", "Q", 3900, 110, 0.005, "nuts2", ["nace"]),
        ("new_firms", "Nowo zarejestrowane firmy", "New firms registered", "count_th", "M", 30, 0.6, 0.08, "nuts2", []),
        ("firm_survival_3y", "Przeżywalność firm po 3 latach", "3-year firm survival", "pct", "A", 55, 0.3, 0.02, "eu", []),
    ]),
    ("business.industry_construction", [
        ("construction_output", "Produkcja budowlano-montażowa, r/r", "Construction output, y/y", "pct", "M", 3.0, 0.0, 1.2, "pl", []),
        ("dwellings_started", "Mieszkania, których budowę rozpoczęto", "Dwellings started", "count_th", "M", 13, 0.4, 0.15, "nuts2", []),
        ("manufacturing_pmi", "PMI przemysłu", "Manufacturing PMI", "idx", "M", 51, -0.1, 0.04, "pl", []),
    ]),
    ("business.trade_services", [
        ("retail_sales", "Sprzedaż detaliczna, r/r (ceny stałe)", "Retail sales, y/y (constant prices)", "pct", "M", 4.5, -0.1, 1.0, "pl", []),
        ("ecommerce_share", "Udział e-handlu w sprzedaży detalicznej", "E-commerce share of retail", "pct", "M", 4.0, 0.7, 0.04, "pl", []),
        ("services_turnover", "Obroty w usługach rynkowych", "Market services turnover", "pln_bn", "Q", 180, 14, 0.04, "pl", ["nace"]),
    ]),
    ("business.agriculture", [
        ("cereal_yield", "Plony zbóż", "Cereal yield", "t_th", "A", 3.8, 0.04, 0.06, "nuts2", []),
        ("agri_land_ha", "Użytki rolne", "Agricultural land", "count_th", "A", 14600, -30, 0.002, "nuts2", []),
        ("milk_procurement_price", "Cena skupu mleka", "Milk procurement price", "pln", "M", 1.2, 0.07, 0.06, "pl", []),
    ]),
    ("business.tourism", [
        ("overnight_stays", "Udzielone noclegi", "Overnight stays", "count_th", "M", 5200, 220, 0.25, "nuts2", []),
        ("foreign_tourists", "Turyści zagraniczni", "Foreign tourists", "count_th", "A", 15000, 600, 0.12, "nuts2", []),
        ("bed_occupancy", "Stopień wykorzystania miejsc noclegowych", "Bed occupancy rate", "pct", "M", 35, 0.4, 0.2, "nuts2", []),
    ]),
    ("business.finances", [
        ("firm_net_margin", "Wskaźnik rentowności obrotu netto", "Net profit margin", "pct", "Q", 4.2, 0.05, 0.12, "pl", ["nace"]),
        ("firm_liquidity", "Wskaźnik płynności I stopnia", "Quick liquidity ratio", "pct", "Q", 38, 0.6, 0.05, "pl", ["nace"]),
        ("firm_revenue", "Przychody z całokształtu działalności", "Total revenue", "pln_bn", "Q", 700, 55, 0.03, "pl", []),
    ]),
    # ---------------- labour
    ("labour.employment", [
        ("unemployment_lfs", "Stopa bezrobocia (BAEL)", "Unemployment rate (LFS)", "pct", "Q", 9.6, -0.38, 0.05, "nuts2", ["sex", "age"]),
        ("registered_unemployment", "Stopa bezrobocia rejestrowanego", "Registered unemployment rate", "pct", "M", 12.4, -0.6, 0.04, "nuts2", ["sex"]),
        ("employment_rate", "Wskaźnik zatrudnienia 20–64 lata", "Employment rate 20–64", "pct", "Q", 64.5, 0.9, 0.01, "eu", ["sex"]),
    ]),
    ("labour.wages", [
        ("avg_wage", "Przeciętne wynagrodzenie brutto", "Average gross wage", "pln", "M", 3400, 340, 0.02, "nuts2", ["nace", "sector"]),
        ("min_wage", "Płaca minimalna", "Minimum wage", "pln", "A", 1317, 230, 0.0, "pl", []),
        ("gender_pay_gap", "Luka płacowa kobiet i mężczyzn", "Gender pay gap", "pct", "A", 7.5, -0.05, 0.1, "eu", []),
    ]),
    ("labour.income_living", [
        ("disposable_income_pc", "Przeciętny dochód rozporządzalny na osobę", "Disposable income per person", "pln", "A", 1200, 140, 0.02, "nuts2", ["urban"]),
        ("arope_rate", "Zagrożenie ubóstwem lub wykluczeniem (AROPE)", "At risk of poverty or social exclusion", "pct", "A", 27, -0.9, 0.03, "eu", []),
        ("gini", "Współczynnik Giniego", "Gini coefficient", "idx", "A", 31, -0.2, 0.01, "eu", []),
    ]),
    ("labour.social_protection", [
        ("social_spending_gdp", "Wydatki na ochronę socjalną / PKB", "Social protection spending / GDP", "pct", "A", 18.5, 0.15, 0.02, "eu", []),
        ("family_benefit_recipients", "Rodziny otrzymujące świadczenia rodzinne", "Families receiving family benefits", "count_th", "A", 2100, -60, 0.03, "nuts2", []),
        ("pensioners", "Emeryci i renciści", "Pensioners", "persons_th", "A", 9000, 50, 0.005, "nuts2", ["sex"]),
    ]),
    # ---------------- population
    ("population.stock", [
        ("population_total", "Ludność", "Population", "persons_mn", "A", 38.53, -0.06, 0.0005, "nuts2", ["sex", "age"]),
        ("median_age", "Mediana wieku", "Median age", "years", "A", 38.0, 0.35, 0.002, "nuts2", ["sex"]),
        ("old_age_dependency", "Współczynnik obciążenia demograficznego", "Old-age dependency ratio", "pct", "A", 19, 0.9, 0.01, "nuts2", []),
    ]),
    ("population.vital", [
        ("tfr", "Współczynnik dzietności", "Total fertility rate", "idx", "A", 1.38, -0.01, 0.03, "nuts2", []),
        ("life_expectancy", "Przeciętne dalsze trwanie życia (noworodek)", "Life expectancy at birth", "years", "A", 76.4, 0.15, 0.004, "nuts2", ["sex"]),
        ("natural_increase", "Przyrost naturalny na 1000 ludności", "Natural increase per 1,000", "per_1000", "A", 0.9, -0.35, 0.1, "nuts2", []),
    ]),
    ("population.migration", [
        ("net_migration", "Saldo migracji na pobyt stały", "Net permanent migration", "count_th", "A", -2.1, 0.6, 0.5, "nuts2", []),
        ("residence_permits", "Zezwolenia na pobyt cudzoziemców", "Residence permits for foreigners", "count_th", "A", 120, 40, 0.1, "nuts2", []),
        ("emigrants_abroad", "Emigranci czasowi przebywający za granicą", "Temporary emigrants abroad", "count_th", "A", 2060, -20, 0.02, "pl", []),
    ]),
    ("population.households", [
        ("avg_household_size", "Przeciętna liczba osób w gospodarstwie domowym", "Average household size", "idx", "A", 2.82, -0.03, 0.005, "nuts2", ["urban"]),
        ("marriages", "Małżeństwa zawarte", "Marriages", "count_th", "A", 228, -4.0, 0.04, "nuts2", []),
        ("single_person_hh", "Jednoosobowe gospodarstwa domowe", "Single-person households", "pct", "A", 24, 0.5, 0.02, "nuts2", []),
    ]),
    ("population.census", [
        ("census_population", "Ludność według spisu", "Census population", "persons_mn", "A", 38.5, -0.08, 0.0003, "nuts2", ["sex"]),
        ("census_tertiary_share", "Odsetek osób z wykształceniem wyższym (spis)", "Tertiary-educated share (census)", "pct", "A", 17, 0.6, 0.01, "nuts2", ["sex"]),
        ("census_dwellings", "Mieszkania według spisu", "Dwellings (census)", "count_th", "A", 13500, 160, 0.002, "nuts2", []),
    ]),
    # ---------------- health
    ("health.status", [
        ("healthy_life_years", "Lata przeżyte w zdrowiu", "Healthy life years", "years", "A", 59, 0.2, 0.01, "eu", ["sex"]),
        ("self_rated_good_health", "Dobra samoocena zdrowia", "Good self-rated health", "pct", "A", 58, 0.5, 0.02, "eu", []),
        ("obesity_rate", "Otyłość wśród dorosłych", "Adult obesity", "pct", "A", 16, 0.3, 0.03, "eu", ["sex"]),
    ]),
    ("health.system", [
        ("health_spending_gdp", "Wydatki na ochronę zdrowia / PKB", "Health spending / GDP", "pct", "A", 6.4, 0.08, 0.02, "eu", []),
        ("hospital_beds", "Łóżka szpitalne na 10 tys. ludności", "Hospital beds per 10,000", "per_1000", "A", 66, -0.6, 0.01, "nuts2", []),
        ("doctors_per_1000", "Lekarze na 1000 ludności", "Doctors per 1,000", "per_1000", "A", 2.3, 0.05, 0.02, "nuts2", []),
    ]),
    ("health.public_health", [
        ("vaccination_mmr", "Wyszczepialność MMR", "MMR vaccination coverage", "pct", "A", 98, -0.5, 0.005, "nuts2", []),
        ("smokers_share", "Osoby palące codziennie", "Daily smokers", "pct", "A", 24, -0.5, 0.03, "eu", ["sex"]),
        ("flu_cases", "Zachorowania na grypę i podejrzenia", "Influenza cases (incl. suspected)", "per_100k", "M", 1200, 30, 0.6, "nuts2", []),
    ]),
    ("health.pharma", [
        ("reimbursement_spend", "Wydatki NFZ na refundację leków", "NFZ drug reimbursement spending", "pln_bn", "A", 8.2, 0.7, 0.03, "pl", []),
        ("reimbursed_drugs", "Leki na liście refundacyjnej", "Drugs on the reimbursement list", "count", "A", 3700, 140, 0.02, "pl", []),
        ("oop_pharma_share", "Udział pacjentów w kosztach leków", "Patient share of drug costs", "pct", "A", 61, -0.6, 0.02, "pl", []),
    ]),
    # ---------------- education
    ("education.school", [
        ("preschool_rate", "Upowszechnienie wychowania przedszkolnego (3–5 lat)", "Pre-school enrolment (3–5)", "pct", "A", 75, 1.6, 0.01, "nuts2", ["urban"]),
        ("pupils_per_teacher", "Uczniowie na nauczyciela", "Pupils per teacher", "idx", "A", 10.5, -0.05, 0.02, "nuts2", ["level"]),
        ("schools_count", "Szkoły podstawowe", "Primary schools", "count", "A", 13500, -60, 0.005, "nuts2", ["urban"]),
    ]),
    ("education.higher", [
        ("students_total", "Studenci", "Students", "persons_th", "A", 1840, -40, 0.01, "nuts2", ["sex"]),
        ("graduates", "Absolwenci szkół wyższych", "Higher education graduates", "persons_th", "A", 480, -12, 0.02, "nuts2", ["sex"]),
        ("tertiary_attainment", "Osoby 25–34 z wykształceniem wyższym", "Tertiary attainment 25–34", "pct", "A", 35, 0.8, 0.02, "eu", ["sex"]),
    ]),
    ("education.exams", [
        ("matura_pass_rate", "Zdawalność matury", "Matura pass rate", "pct", "A", 81, -0.3, 0.03, "nuts2", []),
        ("e8_math_score", "Egzamin ósmoklasisty, matematyka (średni wynik)", "Grade 8 exam, maths (mean)", "pct", "A", 50, -0.4, 0.05, "nuts2", []),
        ("pisa_math", "PISA, matematyka", "PISA, mathematics", "idx", "A", 495, 0.5, 0.01, "eu", []),
    ]),
    ("education.science", [
        ("gerd_gdp", "Nakłady na B+R / PKB", "R&D expenditure / GDP", "pct", "A", 0.72, 0.06, 0.03, "eu", ["sector"]),
        ("patent_applications", "Zgłoszenia wynalazków do UPRP", "Patent applications to PPO", "count", "A", 3200, 60, 0.06, "nuts2", []),
        ("researchers_fte", "Pracownicy B+R (EPC)", "R&D personnel (FTE)", "persons_th", "A", 100, 7, 0.02, "nuts2", ["sector"]),
    ]),
    ("education.skills", [
        ("adult_learning", "Udział dorosłych w kształceniu", "Adult participation in learning", "pct", "A", 5.2, 0.1, 0.06, "eu", []),
        ("basic_digital_skills", "Co najmniej podstawowe umiejętności cyfrowe", "At least basic digital skills", "pct", "A", 40, 0.6, 0.03, "eu", ["age"]),
        ("vocational_students", "Uczniowie szkół branżowych", "Vocational students", "persons_th", "A", 210, -3, 0.02, "nuts2", ["sex"]),
    ]),
    # ---------------- society
    ("society.culture", [
        ("museum_visitors", "Zwiedzający muzea", "Museum visitors", "count_th", "A", 26000, 900, 0.1, "nuts2", []),
        ("library_readers", "Czytelnicy bibliotek publicznych na 1000 ludności", "Public library readers per 1,000", "per_1000", "A", 168, -3, 0.02, "nuts2", []),
        ("cinema_admissions", "Widzowie w kinach", "Cinema admissions", "count_th", "A", 38000, 800, 0.15, "pl", []),
    ]),
    ("society.media", [
        ("internet_news_use", "Korzystanie z wiadomości w internecie", "Online news use", "pct", "A", 55, 1.8, 0.03, "eu", ["age"]),
        ("tv_viewing_time", "Czas oglądania telewizji dziennie", "Daily TV viewing time", "hours", "A", 4.4, -0.05, 0.02, "pl", ["age"]),
        ("press_titles", "Tytuły prasy", "Press titles", "count", "A", 5600, -120, 0.02, "pl", []),
    ]),
    ("society.sport", [
        ("sport_participation", "Uprawianie sportu co najmniej raz w tygodniu", "Weekly sport participation", "pct", "A", 32, 0.4, 0.04, "eu", ["sex"]),
        ("sports_clubs", "Kluby sportowe", "Sports clubs", "count", "A", 14000, 120, 0.02, "nuts2", []),
        ("sports_facilities_pc", "Obiekty sportowe na 10 tys. ludności", "Sports facilities per 10,000", "per_1000", "A", 6.5, 0.1, 0.02, "nuts2", []),
    ]),
    ("society.time_use", [
        ("life_satisfaction", "Zadowolenie z życia (skala 0–10)", "Life satisfaction (0–10)", "idx", "A", 7.0, 0.04, 0.01, "eu", []),
        ("leisure_time", "Czas wolny dziennie", "Daily leisure time", "hours", "A", 4.8, 0.02, 0.02, "pl", ["sex"]),
        ("volunteering", "Wolontariat w ostatnim roku", "Volunteering in the last year", "pct", "A", 18, 0.3, 0.05, "pl", []),
    ]),
    ("society.civil", [
        ("ngo_count", "Organizacje pozarządowe", "NGOs", "count_th", "A", 100, 2.5, 0.01, "nuts2", []),
        ("one_pct_tax", "Przekazany 1,5% podatku", "Tax share donated to NGOs (1.5%)", "pln_bn", "A", 0.5, 0.1, 0.04, "pl", []),
        ("social_coops", "Spółdzielnie socjalne", "Social co-operatives", "count", "A", 900, 80, 0.04, "nuts2", []),
    ]),
    # ---------------- housing
    ("housing.housing", [
        ("dwellings_completed", "Mieszkania oddane do użytkowania", "Dwellings completed", "count_th", "M", 11, 0.5, 0.15, "nuts2", []),
        ("price_m2_secondary", "Cena 1 m² mieszkania (rynek wtórny)", "Price per m² (secondary market)", "pln", "Q", 5200, 520, 0.02, "nuts2", []),
        ("overcrowding_rate", "Przeludnienie mieszkań", "Overcrowding rate", "pct", "A", 47, -1.2, 0.02, "eu", []),
    ]),
    ("housing.municipal", [
        ("water_network_access", "Ludność korzystająca z sieci wodociągowej", "Population with mains water", "pct", "A", 90, 0.3, 0.003, "nuts2", ["urban"]),
        ("sewage_network_access", "Ludność korzystająca z sieci kanalizacyjnej", "Population with sewerage", "pct", "A", 64, 1.2, 0.005, "nuts2", ["urban"]),
        ("district_heating", "Mieszkania z ciepłem sieciowym", "Dwellings with district heating", "pct", "A", 41, 0.3, 0.01, "nuts2", []),
    ]),
    ("housing.land", [
        ("building_permits", "Pozwolenia na budowę", "Building permits", "count_th", "M", 12, 0.3, 0.15, "nuts2", []),
        ("spatial_plans_coverage", "Pokrycie miejscowymi planami", "Local plan coverage", "pct", "A", 26, 0.9, 0.01, "nuts2", []),
        ("land_price_ha", "Cena gruntów ornych za hektar", "Arable land price per ha", "pln_th", "A", 22, 2.6, 0.04, "nuts2", []),
    ]),
    ("housing.territory", [
        ("municipalities", "Gminy", "Municipalities", "count", "A", 2479, -0.2, 0.0, "nuts2", ["urban"]),
        ("population_density", "Gęstość zaludnienia", "Population density", "count", "A", 123, -0.1, 0.001, "nuts2", []),
        ("urban_population_share", "Ludność w miastach", "Urban population share", "pct", "A", 60.9, -0.15, 0.003, "nuts2", []),
    ]),
    ("housing.regions", [
        ("gdp_per_capita_region", "PKB na mieszkańca, Polska = 100", "GDP per capita, Poland = 100", "idx", "A", 100, 0.0, 0.02, "nuts2", []),
        ("city_population", "Ludność miast powyżej 100 tys.", "Population of cities over 100k", "persons_mn", "A", 11.6, -0.03, 0.002, "nuts2", []),
        ("eu_funds_pc", "Fundusze UE na mieszkańca", "EU funds per capita", "pln", "A", 1400, 60, 0.15, "nuts2", []),
    ]),
    # ---------------- environment
    ("environment.condition", [
        ("pm25_mean", "Średnie stężenie PM2,5", "Mean PM2.5 concentration", "ug_m3", "A", 26, -0.9, 0.05, "nuts2", []),
        ("protected_area_share", "Obszary prawnie chronione", "Legally protected areas", "pct", "A", 32.5, 0.05, 0.002, "nuts2", []),
        ("river_quality_good", "Wody powierzchniowe w dobrym stanie", "Surface waters in good status", "pct", "A", 9, 0.1, 0.08, "pl", []),
    ]),
    ("environment.climate", [
        ("ghg_emissions", "Emisja gazów cieplarnianych", "Greenhouse gas emissions", "t_th", "A", 410000, -3500, 0.02, "eu", ["fuel"]),
        ("mean_temperature", "Średnia temperatura roczna", "Mean annual temperature", "celsius", "A", 8.4, 0.08, 0.05, "nuts2", []),
        ("precipitation", "Suma opadów", "Annual precipitation", "km", "A", 600, 0, 0.12, "nuts2", []),
    ]),
    ("environment.waste", [
        ("municipal_waste_pc", "Odpady komunalne na mieszkańca", "Municipal waste per capita", "kg_pc", "A", 300, 9, 0.02, "eu", []),
        ("recycling_rate", "Poziom recyklingu odpadów komunalnych", "Municipal waste recycling rate", "pct", "A", 21, 1.6, 0.04, "eu", []),
        ("landfill_share", "Odpady składowane", "Landfilled waste share", "pct", "A", 60, -3, 0.04, "eu", []),
    ]),
    ("environment.energy", [
        ("res_share", "Udział OZE w zużyciu energii", "Renewables share of energy", "pct", "A", 9.3, 0.8, 0.03, "eu", []),
        ("electricity_generation", "Produkcja energii elektrycznej", "Electricity generation", "twh", "A", 157, 0.8, 0.02, "pl", ["fuel"]),
        ("electricity_price_household", "Cena energii elektrycznej dla gospodarstw", "Household electricity price", "pln", "A", 0.55, 0.04, 0.05, "eu", []),
    ]),
    ("environment.resources", [
        ("forest_cover", "Lesistość", "Forest cover", "pct", "A", 29.2, 0.05, 0.001, "nuts2", []),
        ("timber_harvest", "Pozyskanie drewna", "Timber harvest", "count_th", "A", 35000, 450, 0.04, "nuts2", []),
        ("water_abstraction", "Pobór wody na potrzeby gospodarki", "Water abstraction", "count", "A", 10500, -40, 0.03, "nuts2", []),
    ]),
    # ---------------- transport
    ("transport.modes", [
        ("rail_passengers", "Przewozy pasażerów koleją", "Rail passengers", "persons_mn", "M", 22, 0.6, 0.1, "pl", []),
        ("air_passengers", "Pasażerowie portów lotniczych", "Airport passengers", "persons_mn", "M", 1.8, 0.2, 0.15, "pl", []),
        ("freight_tonnes", "Przewozy ładunków", "Freight transport", "t_th", "A", 1800000, 40000, 0.03, "pl", ["mode"]),
    ]),
    ("transport.vehicles", [
        ("cars_per_1000", "Samochody osobowe na 1000 ludności", "Passenger cars per 1,000", "per_1000", "A", 480, 15, 0.005, "nuts2", []),
        ("road_deaths", "Ofiary śmiertelne wypadków drogowych", "Road deaths", "count", "A", 3900, -130, 0.04, "nuts2", []),
        ("ev_registrations", "Nowo zarejestrowane auta elektryczne", "New electric car registrations", "count_th", "A", 0.5, 2.2, 0.1, "pl", []),
    ]),
    ("transport.public_transport", [
        ("urban_transit_passengers", "Pasażerowie komunikacji miejskiej", "Urban public transport passengers", "persons_mn", "A", 3900, -20, 0.05, "nuts2", []),
        ("transport_exclusion", "Gminy bez publicznego transportu zbiorowego", "Municipalities without public transport", "pct", "A", 22, -0.5, 0.04, "nuts2", []),
        ("bike_paths_km", "Ścieżki rowerowe", "Cycle paths", "km", "A", 8000, 1100, 0.02, "nuts2", []),
    ]),
    ("transport.telecom", [
        ("broadband_households", "Gospodarstwa z szerokopasmowym internetem", "Households with broadband", "pct", "A", 57, 2.6, 0.02, "nuts2", ["urban"]),
        ("fibre_coverage", "Zasięg sieci światłowodowej", "Fibre coverage", "pct", "A", 10, 4.0, 0.04, "nuts2", []),
        ("mobile_data_per_user", "Transfer danych mobilnych na użytkownika (GB/mies.)", "Mobile data per user (GB/month)", "count", "A", 0.8, 1.2, 0.08, "pl", []),
    ]),
    ("transport.digital", [
        ("egov_users", "Osoby korzystające z e-administracji", "E-government users", "pct", "A", 30, 2.2, 0.03, "eu", ["age"]),
        ("mobywatel_users", "Użytkownicy aplikacji mObywatel", "mObywatel app users", "persons_mn", "A", 0.2, 0.9, 0.08, "pl", []),
        ("enterprises_cloud", "Przedsiębiorstwa korzystające z chmury", "Enterprises using cloud", "pct", "A", 8, 2.0, 0.05, "eu", []),
    ]),
    # ---------------- state
    ("state.government", [
        ("laws_enacted", "Ustawy uchwalone", "Laws enacted", "count", "A", 210, 1, 0.15, "pl", []),
        ("government_trust", "Zaufanie do rządu", "Trust in government", "pct", "A", 30, 0.2, 0.15, "eu", []),
        ("public_employment", "Zatrudnieni w administracji publicznej", "Public administration employment", "persons_th", "A", 430, 1.5, 0.01, "nuts2", []),
    ]),
    ("state.elections", [
        ("turnout_parliament", "Frekwencja w wyborach do Sejmu", "Sejm election turnout", "pct", "A", 49, 1.6, 0.06, "nuts2", []),
        ("turnout_local", "Frekwencja w wyborach samorządowych", "Local election turnout", "pct", "A", 47, 0.6, 0.05, "nuts2", []),
        ("women_mps_share", "Kobiety w Sejmie", "Women in the Sejm", "pct", "A", 24, 0.4, 0.04, "pl", []),
    ]),
    ("state.justice", [
        ("court_case_duration", "Średni czas trwania postępowania sądowego", "Average court case duration", "count", "A", 4.2, 0.2, 0.04, "nuts2", []),
        ("cases_received", "Sprawy wpływające do sądów", "Cases received by courts", "persons_mn", "A", 14, 0.2, 0.04, "pl", []),
        ("judges_per_100k", "Sędziowie na 100 tys. ludności", "Judges per 100,000", "per_100k", "A", 26, -0.05, 0.01, "eu", []),
    ]),
    ("state.crime", [
        ("crimes_per_1000", "Przestępstwa stwierdzone na 1000 ludności", "Recorded crimes per 1,000", "per_1000", "A", 29, -0.6, 0.04, "nuts2", []),
        ("detection_rate", "Wykrywalność sprawców przestępstw", "Crime detection rate", "pct", "A", 68, 0.3, 0.02, "nuts2", []),
        ("safety_feeling", "Poczucie bezpieczeństwa w okolicy", "Feeling safe in the neighbourhood", "pct", "A", 85, 0.4, 0.02, "pl", []),
    ]),
    ("state.procurement", [
        ("procurement_value", "Wartość udzielonych zamówień publicznych", "Public procurement value", "pln_bn", "A", 140, 10, 0.08, "pl", []),
        ("single_bid_share", "Postępowania z jedną ofertą", "Single-bid procedures", "pct", "A", 44, 0.8, 0.04, "eu", []),
        ("sme_award_share", "Zamówienia udzielone MŚP", "Contracts awarded to SMEs", "pct", "A", 55, 0.4, 0.03, "pl", []),
    ]),
    ("state.administration", [
        ("nik_audits", "Kontrole NIK", "Supreme Audit Office audits", "count", "A", 1900, -40, 0.06, "pl", []),
        ("public_info_requests", "Wnioski o informację publiczną", "Public information requests", "count_th", "A", 90, 4, 0.06, "pl", []),
        ("open_data_sets", "Zbiory na dane.gov.pl", "Datasets on dane.gov.pl", "count_th", "A", 1, 3.2, 0.05, "pl", []),
    ]),
]
