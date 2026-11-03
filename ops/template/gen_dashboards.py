"""Writes the 12 starter domain dashboards dashboards/domains/<domain>.yaml (format version 3, docs/dashboards.md).

Inputs: ops/template/domain.csv (domains and groups) and ops/template/kpis.py (sample KPIs). Every group becomes a
page; each page gets a KPI row, a main trend (8 columns) with a companion (4), a breakdown row and, on some pages,
an indicator table. Chart types are chosen to suit each KPI (the same rules as v3ChartFit in
packages/semantic/src/dashboardsV3.ts) and spread so that across the 12 dashboards every chart type is used at
least twice. The files are starting points: the Domain expert rewrites pages, sections, KPIs, charts and texts.

Run: python3 ops/template/gen_dashboards.py && bun ops/check-dashboards.ts
"""
import csv
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from kpis import DIMENSIONS, K  # noqa: E402
from gen_data import sources_for  # noqa: E402

OUT = os.path.join(HERE, "..", "..", "dashboards", "domains")

CHART_TYPES = [
    "line-band", "line-highlight", "columns", "small-multiples", "area-share", "ranked-bars", "grouped-bars",
    "dumbbell", "slope", "diverging-bars", "bullet", "waterfall", "stacked-bars", "segmented-bar", "pyramid",
    "histogram", "scatter", "tile-map", "heatmap", "sparkline-table",
]
TREND = ["line-band", "line-highlight", "columns", "small-multiples", "area-share", "heatmap"]
COMPANION = ["bullet", "ranked-bars", "segmented-bar", "slope", "dumbbell", "tile-map", "histogram", "columns"]
BREAKDOWN = [
    "tile-map", "ranked-bars", "grouped-bars", "dumbbell", "slope", "diverging-bars", "stacked-bars", "segmented-bar",
    "pyramid", "histogram", "scatter", "waterfall", "heatmap", "small-multiples", "area-share",
]
NEEDS_SPLIT = {"area-share", "stacked-bars", "segmented-bar", "waterfall"}
NEEDS_CATEGORIES = {"line-highlight", "small-multiples", "ranked-bars", "grouped-bars", "dumbbell", "slope", "diverging-bars"}
INFLATION_BAND = [1.5, 3.5]
# Units whose members add up to a whole (V3_ADDITIVE_UNITS in dashboardsV3.ts): part-of-whole charts need one.
ADDITIVE_UNITS = {"pln_bn", "eur_bn", "persons_th", "persons_mn", "count", "count_th", "twh", "t_th"}

# Layouts: sections of slots (role, span). Every row is an allowed span pattern (12, 8+4, 4+8, 6+6, 4+4+4).
LAYOUTS = [
    [("Trend", [("trend", 8), ("companion", 4)]), ("Struktura i obszary", [("breakdown", 6), ("breakdown", 6)])],
    [("Trend", [("trend", 12)]), ("Porównania", [("breakdown", 4), ("companion", 4), ("breakdown", 4)])],
    [("Trend", [("trend", 8), ("companion", 4)]), ("Struktura i obszary", [("breakdown", 4), ("breakdown", 8)]),
     ("Wskaźniki obszaru", [("table", 12)])],
    [("Trend", [("trend", 8), ("companion", 4)]), ("Struktura i obszary", [("breakdown", 12)])],
    [("Trend", [("trend", 12)]), ("Struktura i obszary", [("breakdown", 6), ("breakdown", 6)]),
     ("Wskaźniki obszaru", [("table", 12)])],
]
SECTION_EN = {"Trend": "Trend", "Struktura i obszary": "Structure and geography", "Porównania": "Comparisons",
              "Wskaźniki obszaru": "Indicators of the area", "Najważniejsze trendy": "Main trends",
              "Wszystkie obszary w liczbach": "Every area in figures"}

# Titles state the finding; {tokens} are filled from the card's data by the portal.
TITLES = {
    "line-band": ("{name}: {value} ({period})", "{name}: {value} ({period})"),
    "line-highlight": ("{name}: {geo} na tle porównania, najwyżej {top}", "{name}: {geo} in comparison, highest {top}"),
    "columns": ("{name} rok po roku: ostatnio {value}", "{name} year by year: latest {value}"),
    "small-multiples": ("{name}: najwyżej {top}, najniżej {bottom}", "{name}: highest {top}, lowest {bottom}"),
    "area-share": ("{name}: największy udział – {top}", "{name}: largest share – {top}"),
    "ranked-bars": ("{name}: najwyżej {top}, najniżej {bottom}", "{name}: highest {top}, lowest {bottom}"),
    "grouped-bars": ("{name}: {from} i {to}, najwyżej {top}", "{name}: {from} and {to}, highest {top}"),
    "dumbbell": ("{name}: największa zmiana {from}–{to} – {top}", "{name}: largest change {from}–{to} – {top}"),
    "slope": ("{name}: {from} → {to}, najbardziej zmienia się {top}", "{name}: {from} → {to}, {top} changes most"),
    "diverging-bars": ("{name}: zmiana od {from}, najwięcej {top}, najmniej {bottom}",
                       "{name}: change since {from}, most {top}, least {bottom}"),
    "bullet": ("{name} i miary pokrewne wobec odniesienia ({period})", "{name} and related measures against the reference ({period})"),
    "waterfall": ("{name}: zmiana {from}–{to}, największy wkład – {top}", "{name}: change {from}–{to}, largest contribution – {top}"),
    "stacked-bars": ("{name}: struktura w latach {from}–{to}, największa część – {top}",
                     "{name}: structure {from}–{to}, largest part – {top}"),
    "segmented-bar": ("{name}: największa część – {top} ({period})", "{name}: largest part – {top} ({period})"),
    "pyramid": ("{name} według płci i wieku: najliczniejsza grupa {top}", "{name} by sex and age: largest group {top}"),
    "histogram": ("{name}: najwięcej województw w przedziale {top}", "{name}: most voivodeships in the {top} range"),
    "scatter": ("{name} wobec wskaźnika „{name_x}”: najwyżej {top}", "{name} against “{name_x}”: highest {top}"),
    "tile-map": ("{name} według województw: najwyżej {top}, najniżej {bottom}", "{name} by voivodeship: highest {top}, lowest {bottom}"),
    "heatmap": ("{name}: najwyższa wartość w {top}", "{name}: highest value in {top}"),
    "sparkline-table": ("Wskaźniki obszaru w ostatnich latach", "Indicators of the area in recent years"),
}


def load():
    domains, groups = [], {}
    with open(os.path.join(HERE, "domain.csv"), newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["level"] == "domain":
                domains.append(r)
            elif r["level"] == "group":
                groups.setdefault(r["parent_key"], []).append(r)
    domains.sort(key=lambda r: int(r["sort"]))
    for g in groups.values():
        g.sort(key=lambda r: int(r["sort"]))
    kpis = {}
    for group, items in K:
        for (key, pl, en, unit, freq, _b, _t, _n, geo, dims) in items:
            kpis[key] = {"key": key, "pl": pl, "en": en, "unit": unit, "freq": freq, "geo": geo, "dims": dims,
                         "group": group, "sources": sources_for(key, geo, group)}
    return domains, groups, kpis


def areas(k):
    """Number of geographies besides PL and EU27 (voivodeships, countries)."""
    return (16 if k["geo"] == "nuts2" else 0, 9 if k["geo"] in ("eu", "nuts2") else 0)


def fits(chart, k, split=None, compare=None):
    voiv, countries = areas(k)
    if split is not None and split not in k["dims"]:
        return False
    if chart == "heatmap" and k["freq"] != "M":
        return False
    if chart == "pyramid" and not ("sex" in k["dims"] and "age" in k["dims"]):
        return False
    if chart in ("tile-map", "histogram") and voiv < 8:
        return False
    if chart in NEEDS_SPLIT and (split is None or k["unit"] not in ADDITIVE_UNITS):
        return False
    if chart in NEEDS_CATEGORIES and split is None and voiv + countries < 2:
        return False
    if chart == "scatter":
        return bool(compare) and voiv + countries >= 5
    if chart == "bullet" and not compare and split is None and voiv + countries < 2:
        return False
    return True


def pick_split(chart, k):
    """The dimension a chart splits by: needed for part-of-whole charts, used by comparisons of PL-only KPIs."""
    dims = [d for d in k["dims"] if d != "age" or chart != "pyramid"]
    if chart in NEEDS_SPLIT or (chart in NEEDS_CATEGORIES | {"bullet"} and sum(areas(k)) == 0):
        # Prefer 3–4 parts (a 2-part whole says little), then any dimension of at most 4 parts.
        small = sorted((d for d in dims if len(DIMENSIONS[d][2]) - 1 <= 4), key=lambda d: -(len(DIMENSIONS[d][2]) - 1))
        return small[0] if small else (dims[0] if dims else None)
    return None


def pick_compare(chart, k, page_kpis, domain_kpis):
    if chart == "scatter":
        for o in page_kpis + domain_kpis:
            if o["key"] != k["key"] and sum(areas(o)) >= 5 and (areas(o)[0] and areas(k)[0] or not areas(k)[0]):
                return [o["key"]]
        return None
    if chart == "bullet":
        same = [o["key"] for o in page_kpis if o["key"] != k["key"] and o["unit"] == k["unit"]]
        return same or None
    return None


class Chooser:
    def __init__(self, kpis):
        self.usage = {c: 0 for c in CHART_TYPES}
        all_k = list(kpis.values())
        self.fit_count = {}
        for c in CHART_TYPES:
            n = 0
            for k in all_k:
                if fits(c, k, pick_split(c, k), ["x"] if c in ("scatter",) else None):
                    n += 1
            self.fit_count[c] = n

    def choose(self, role, preferred, page_kpis, domain_kpis, used_on_page):
        types = {"trend": TREND, "companion": COMPANION, "breakdown": BREAKDOWN}[role]
        best = self._best(types, preferred, page_kpis, domain_kpis, used_on_page)
        if best is None or best[0] >= 100:  # nothing fits, or only a repeat: fall back to any type that fits
            alt = self._best([c for c in CHART_TYPES if c != "sparkline-table"], preferred, page_kpis, domain_kpis, used_on_page)
            if best is None or (alt is not None and alt[0] < best[0]):
                best = alt
        _, c, k, split, compare = best
        self.usage[c] += 1
        used_on_page[c] = k["key"]
        return c, k, split, compare

    def _best(self, types, preferred, page_kpis, domain_kpis, used_on_page):
        best = None
        for rank, k in enumerate(preferred):
            for c in types:
                split = pick_split(c, k)
                compare = pick_compare(c, k, page_kpis, domain_kpis)
                if not fits(c, k, split, compare):
                    continue
                score = self.usage[c] * 10 + self.fit_count[c] / 40 + rank * 4
                score += 100 if c in used_on_page else 0
                score += 6 * sum(1 for (_, kk) in used_on_page.items() if kk == k["key"])
                if best is None or score < best[0]:
                    best = (score, c, k, split, compare)
        return best


def card(chart, k, span, split, compare, kpis):
    name_x = kpis[compare[0]] if chart == "scatter" else None
    t_pl, t_en = TITLES[chart]
    if chart == "bullet" and not compare:
        t_pl, t_en = "{name}: najwyżej {top} ({period})", "{name}: highest {top} ({period})"
    fmt = lambda t, n, nx: t.replace("{name}", n).replace("{name_x}", nx or "")  # noqa: E731
    c = {"kpi": k["key"], "chart": chart,
         "title_pl": fmt(t_pl, k["pl"], name_x["pl"] if name_x else None),
         "title_en": fmt(t_en, k["en"], name_x["en"] if name_x else None),
         "span": span}
    if split:
        c["split"] = split
    if compare:
        c["compare"] = compare
    inflation = k["unit"] == "pct" and any(w in k["key"] for w in ("inflation", "hicp", "cpi"))
    if chart in ("line-band", "line-highlight", "small-multiples", "area-share"):
        c["period"] = "10y"
    if chart == "heatmap":
        c["period"] = "5y"
    if chart in ("grouped-bars", "dumbbell", "slope", "diverging-bars", "waterfall", "stacked-bars"):
        c["period"] = "10y"
    if chart in ("line-band", "bullet") and inflation:
        c["band"] = INFLATION_BAND
    if chart == "line-band":
        c["annotate"] = "max"
        if k["geo"] in ("eu", "nuts2") and not inflation:
            c["reference"] = "EU27"
    if chart == "ranked-bars" and not split:
        c["reference"] = "PL" if k["geo"] == "nuts2" else "EU27"
    if chart == "bullet" and not inflation and k["geo"] in ("eu", "nuts2"):
        c["reference"] = "EU27"
    return c


def page_filters(page_kpis):
    f = ["period"]
    if any(k["geo"] != "pl" for k in page_kpis):
        f.append("geography")
    if any(k["geo"] == "nuts2" for k in page_kpis):
        f.append("geo_level")
    if any(len(k["sources"]) > 1 for k in page_kpis):
        f.append("source")
    dims = []
    for k in page_kpis:
        for d in k["dims"]:
            if d not in dims:
                dims.append(d)
    return f + dims[:2]


def build(domains, groups, kpis):
    chooser = Chooser(kpis)
    out = {}
    for di, d in enumerate(domains):
        dkey = d["domain_key"]
        gs = groups[dkey]
        domain_kpis = [k for k in kpis.values() if k["group"].split(".")[0] == dkey]
        pages = []
        for gi, g in enumerate(gs):
            pk = [k for k in kpis.values() if k["group"] == g["domain_key"]]
            layout = LAYOUTS[(di * 3 + gi) % len(LAYOUTS)]
            used = {}
            sections = []
            for si, (title, slots) in enumerate(layout):
                cards = []
                for role, span in slots:
                    if role == "table":
                        cards.append({"kpi": pk[0]["key"], "chart": "sparkline-table", "compare": [k["key"] for k in pk[1:]],
                                      "title_pl": TITLES["sparkline-table"][0], "title_en": TITLES["sparkline-table"][1],
                                      "span": 12, "period": "5y"})
                        chooser.usage["sparkline-table"] += 1
                        continue
                    order = pk if role != "breakdown" else pk[1:] + pk[:1]
                    c, k, split, compare = chooser.choose(role, order, pk, domain_kpis, used)
                    cards.append(card(c, k, span, split, compare, kpis))
                sections.append({"title_pl": title, "title_en": SECTION_EN[title], "cards": cards})
            suffix = g["domain_key"].split(".", 1)[1]
            pages.append({
                "id": suffix, "group_key": g["domain_key"], "title_pl": g["name_pl"], "title_en": g["name_en"],
                "lead_pl": f"{g['name_pl']}: najważniejsze wskaźniki obszaru na danych przykładowych; tytuły i wykresy to szablon dla eksperta dziedziny.",
                "lead_en": f"{g['name_en']}: the key indicators of this area on sample data; titles and charts are a template for the domain expert.",
                "filters": page_filters(pk), "kpis": [k["key"] for k in pk], "sections": sections,
            })
        heads = [next(k for k in kpis.values() if k["group"] == g["domain_key"]) for g in gs]
        ov_used = {}
        main = chooser.choose("trend", heads[:1], heads, domain_kpis, ov_used)
        comp = chooser.choose("companion", heads[1:] + heads[:1], heads, domain_kpis, ov_used)
        overview = {
            "lead_pl": f"{d['name_pl']}: {len(gs)} obszarów i {len(domain_kpis)} wskaźników w jednym miejscu (dane przykładowe).",
            "lead_en": f"{d['name_en']}: {len(gs)} areas and {len(domain_kpis)} indicators in one place (sample data).",
            "filters": ["period"] + (["geography"] if any(k["geo"] != "pl" for k in heads[:2]) else []),
            "kpis": [k["key"] for k in heads[:4]],
            "sections": [
                {"title_pl": "Najważniejsze trendy", "title_en": SECTION_EN["Najważniejsze trendy"],
                 "cards": [card(main[0], main[1], 8, main[2], main[3], kpis), card(comp[0], comp[1], 4, comp[2], comp[3], kpis)]},
                {"title_pl": "Wszystkie obszary w liczbach", "title_en": SECTION_EN["Wszystkie obszary w liczbach"],
                 "cards": [{"kpi": heads[0]["key"], "chart": "sparkline-table", "compare": [k["key"] for k in heads[1:8]],
                            "title_pl": "Najważniejszy wskaźnik każdego obszaru", "title_en": "The main indicator of every area",
                            "span": 12, "period": "5y"}]},
            ],
        }
        chooser.usage["sparkline-table"] += 1
        out[dkey] = {
            "schema": 3, "id": dkey, "domain_key": dkey, "title_pl": d["name_pl"], "title_en": d["name_en"],
            "description_pl": f"Pulpit dziedziny {d['name_pl']}: przegląd i {len(gs)} stron obszarów.",
            "description_en": f"Dashboard of the {d['name_en']} domain: overview and {len(gs)} area pages.",
            "overview": overview, "pages": pages,
        }
    return out, chooser.usage


# --- YAML writer (prettier-stable: double-quoted strings, flow lists of scalars, block maps) ----------------

def scalar(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return json.dumps(v)
    if isinstance(v, str) and v and all(ch.isalnum() or ch in "_-." for ch in v) and not v[0].isdigit() and v not in ("true", "false", "null", "yes", "no"):
        return v
    return json.dumps(v, ensure_ascii=False)


def emit(v, indent=0):
    pad = " " * indent
    lines = []
    if isinstance(v, dict):
        for key, val in v.items():
            if isinstance(val, dict):
                lines.append(f"{pad}{key}:")
                lines += emit(val, indent + 2)
            elif isinstance(val, list) and val and isinstance(val[0], dict):
                lines.append(f"{pad}{key}:")
                for item in val:
                    sub = emit(item, indent + 4)
                    sub[0] = f"{pad}  - " + sub[0].lstrip()
                    lines += sub
            elif isinstance(val, list):
                lines.append(f"{pad}{key}: [{', '.join(scalar(x) for x in val)}]")
            else:
                lines.append(f"{pad}{key}: {scalar(val)}")
    return lines


HEADER = """# GENERATED STARTER by ops/template/gen_dashboards.py; dashboard format version 3 (docs/dashboards.md).
# Domain dashboard {key}: the overview page and one page per domain group.
# TEMPLATE PLACEHOLDERS: chart choices, titles and leads were generated for sample data. The Domain expert
# rewrites this file (pages, sections, KPIs, charts, dimensions, filters); edit it by hand from then on.
# Check with: bun ops/check-dashboards.ts
"""


def main():
    domains, groups, kpis = load()
    out, usage = build(domains, groups, kpis)
    os.makedirs(OUT, exist_ok=True)
    for key, d in out.items():
        with open(os.path.join(OUT, f"{key}.yaml"), "w", encoding="utf-8") as f:
            f.write(HEADER.format(key=key) + "\n".join(emit(d)) + "\n")
    low = [c for c, n in usage.items() if n < 2]
    assert not low, f"chart types used fewer than twice: {low}"
    print(f"{len(out)} dashboards -> {os.path.relpath(OUT)}")
    print("chart use: " + ", ".join(f"{c} {n}" for c, n in sorted(usage.items(), key=lambda x: -x[1])))


if __name__ == "__main__":
    main()
