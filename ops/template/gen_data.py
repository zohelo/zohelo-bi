"""Writes apps/portal/src/data/dummyCatalog.ts for the zohelo design template (sample data only).

Inputs: ops/template/domain.csv (copy of zohelo-data warehouse/seeds/domain.csv) and ops/template/kpis.py.
Run: python3 ops/template/gen_data.py
"""
import csv
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from kpis import DIMENSIONS, K, UNITS  # noqa: E402

OUT = os.path.join(HERE, "..", "..", "apps", "portal", "src", "data", "dummyCatalog.ts")

SOURCES = [
    ("gus_bdl", "GUS, Bank Danych Lokalnych", "Statistics Poland, Local Data Bank", "cc_by_4"),
    ("gus", "GUS", "Statistics Poland", "cc_by_4"),
    ("eurostat", "Eurostat", "Eurostat", "cc_by_4"),
    ("nbp", "NBP", "National Bank of Poland", "nbp_terms"),
    ("worldbank", "Bank Światowy", "World Bank", "cc_by_4"),
    ("oecd", "OECD", "OECD", "oecd_terms"),
    ("mf", "Ministerstwo Finansów", "Ministry of Finance", "pl_public_info"),
    ("knf", "KNF", "Polish Financial Supervision Authority (KNF)", "pl_public_info"),
    ("rio", "Regionalne izby obrachunkowe", "Regional audit chambers (RIO)", "pl_public_info"),
    ("pfr", "PFR Portal PPK", "PFR Portal PPK", "pfr_terms"),
    ("gpw", "GPW", "Warsaw Stock Exchange (GPW)", "gpw_licence"),
    ("gpw_benchmark", "GPW Benchmark", "GPW Benchmark", "gpw_licence"),
]
LICENCES = [
    ("cc_by_4", "CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/", "Źródło: {source}, licencja CC BY 4.0", True),
    ("nbp_terms", "Warunki NBP", "https://nbp.pl", "Źródło: NBP", True),
    ("oecd_terms", "OECD Terms", "https://www.oecd.org/termsandconditions/", "Source: OECD", True),
    # Finance (Domain expert): reuse of public-sector information (act of 11 Aug 2021); per-publisher terms to confirm.
    ("pl_public_info", "Informacja sektora publicznego", "https://www.gov.pl/web/cyfryzacja/ponowne-wykorzystywanie", "Źródło: {source}", True),
    ("pfr_terms", "Warunki PFR Portal PPK", "https://www.mojeppk.pl/pliki/repozytorium-plikow/materialy-do-pobrania/pdf/Biuletyn-PPK-07-2026.pdf", "Źródło: PFR Portal PPK", False),
    # Market data and benchmarks of GPW / GPW Benchmark need a licence for redistribution (finance research doc).
    ("gpw_licence", "Licencja GPW / GPW Benchmark", "https://www.gpw.pl/pub/GPW/files/PDF/dane_rynkowe/Umowa_Licencyjna_Dane_Rynkowe_zalaczniki_1.10.2026.pdf", "Źródło: {source}, dane licencjonowane", False),
]


# Indicators whose publisher is not the default for their geography (Domain expert spec, economy).
SOURCE_OVERRIDE = {
    "core_inflation": ["nbp"], "inflation_expectations": ["nbp"], "current_account_gdp": ["nbp", "eurostat"],
    "current_account_components": ["nbp"], "niip_gdp": ["nbp", "eurostat"], "cli_oecd": ["oecd"],
    "esi": ["eurostat"], "reer": ["eurostat"], "gdp_contributions": ["gus"], "cpi_contributions": ["gus"],
    # finance (Domain expert spec): national fiscal series from MF, banking and insurance from KNF (NBP for money
    # and rates), market statistics from GPW, PPK from PFR Portal PPK, local-government budgets from MF and RIO.
    "gg_deficit_gdp": ["eurostat", "gus"], "gg_debt_gdp": ["eurostat", "gus"], "pdp_gdp": ["mf"],
    "gg_balance_subsectors": ["gus"], "debt_ratio_drivers": ["eurostat"], "gg_debt_instrument": ["eurostat"],
    "gg_expenditure_cofog": ["eurostat"], "gg_revenue_type": ["eurostat"], "treasury_debt_holders": ["mf"],
    "treasury_fx_share": ["mf"], "treasury_atm": ["mf"], "state_budget_revenue": ["mf"], "wibor_3m": ["gpw_benchmark"],
    "npl_ratio": ["knf"], "bank_capital_ratio": ["knf"], "bank_roe": ["knf"], "market_cap_gpw": ["gpw"],
    "equity_turnover": ["gpw"], "listed_companies": ["gpw"], "ipo_count": ["gpw"], "fund_assets": ["knf"],
    "insurance_premiums": ["knf"], "insurance_claims": ["knf"], "insurance_solvency": ["knf"],
    "insurance_penetration": ["oecd"], "ofe_assets": ["knf"], "ofe_members": ["knf"], "ppk_participation": ["pfr"],
    "ppk_assets": ["pfr"], "ppk_participants": ["pfr"], "zus_pension_avg": ["gus_bdl"],
    # labour (Domain expert spec: docs/domain-labour.md): Eurostat for EU-comparable LFS/SILC series, GUS for national.
    "employment_enterprise": ["gus"], "real_wage_growth": ["gus"],
    "nominal_wage_growth": ["gus"], "median_wage": ["gus"], "extreme_poverty": ["gus"],
    "vacancies_per_unemployed": ["gus"], "job_vacancy_rate": ["gus", "eurostat"],
    "lg_revenue_structure": ["mf"], "lg_expenditure_function": ["mf"], "lg_deficit_units_share": ["rio"],
}


def sources_for(key, geo, group):
    if key in SOURCE_OVERRIDE:
        return SOURCE_OVERRIDE[key]
    if group.startswith("finance.fx_gold") or group.startswith("finance.money_banking"):
        return ["nbp"]
    if geo == "eu":
        return ["eurostat", "worldbank"] if key.startswith(("gdp", "unemployment", "hicp")) else ["eurostat"]
    if geo == "nuts2":
        return ["gus_bdl", "eurostat"] if key in ("unemployment_lfs", "population_total", "gdp_per_capita_pps") else ["gus_bdl"]
    return ["gus"]


def main():
    domains = []
    with open(os.path.join(HERE, "domain.csv"), newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            domains.append({
                "domain_key": r["domain_key"], "level": r["level"], "parent_key": r["parent_key"] or None,
                "name_en": r["name_en"], "name_pl": r["name_pl"], "csa_code": r["csa_code"], "sort": int(r["sort"]),
            })
    group_keys = {d["domain_key"] for d in domains if d["level"] == "group"}
    kpis = []
    for group, items in K:
        assert group in group_keys, group
        for (key, pl, en, unit, freq, base, trend, noise, geo, dims) in items:
            assert unit in UNITS, unit
            for d in dims:
                assert d in DIMENSIONS, d
            kpis.append({
                "kpi_key": key, "name_pl": pl, "name_en": en, "unit_key": unit, "frequency": freq,
                "group_key": group, "domain_key": group.split(".")[0], "geo": geo, "dims": dims,
                "base": base, "trend": trend, "noise": noise, "sources": sources_for(key, geo, group),
            })
    keys = [k["kpi_key"] for k in kpis]
    assert len(keys) == len(set(keys)), "duplicate kpi keys"
    units = [{"unit_key": k, "symbol": v[0], "name_pl": v[1], "name_en": v[2], "is_rate": v[3]} for k, v in UNITS.items()]
    dims = [{"dimension_key": k, "name_pl": v[0], "name_en": v[1], "members": [{"key": m[0], "name_pl": m[1], "name_en": m[2]} for m in v[2]]}
            for k, v in DIMENSIONS.items()]
    sources = [{"source_key": s[0], "name_pl": s[1], "name_en": s[2], "licence_key": s[3], "register_id": s[0]} for s in SOURCES]
    licences = [{"licence_key": l[0], "name": l[1], "url": l[2], "attribution_text": l[3], "commercial_ok": l[4]} for l in LICENCES]
    body = (
        "// GENERATED by ops/template/gen_data.py from ops/template/{domain.csv,kpis.py}. Do not edit by hand.\n"
        "// Sample data for the zohelo design template: names are plausible, every value is synthetic.\n\n"
        "import type { DummyDimension, DummyKpi } from \"./types\";\n"
        "import type { CatalogDomain, CatalogLicence, CatalogSource, CatalogUnit } from \"@zohelo/semantic\";\n\n"
        f"export const DOMAINS: CatalogDomain[] = {json.dumps(domains, ensure_ascii=False, indent=1)};\n\n"
        f"export const UNITS: CatalogUnit[] = {json.dumps(units, ensure_ascii=False, indent=1)};\n\n"
        f"export const DIMENSIONS: DummyDimension[] = {json.dumps(dims, ensure_ascii=False, indent=1)};\n\n"
        f"export const SOURCES: CatalogSource[] = {json.dumps(sources, ensure_ascii=False, indent=1)};\n\n"
        f"export const LICENCES: CatalogLicence[] = {json.dumps(licences, ensure_ascii=False, indent=1)};\n\n"
        f"export const KPIS: DummyKpi[] = {json.dumps(kpis, ensure_ascii=False, indent=1)};\n"
    )
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(body)
    print(f"{len(domains)} domains, {len(kpis)} KPIs -> {os.path.relpath(OUT)}")


if __name__ == "__main__":
    main()
