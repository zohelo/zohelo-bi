import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CHART_TYPES, LIBRARY, VARIANTS } from "@zohelo/visuals";
import { CHART_SAMPLES } from "@zohelo/visuals/samples";
import { dummy } from "../../data/dummy";
import type { Catalog } from "../../data";
import { PageContext } from "../context";
import { GuidePage } from "./Guide";
import { findSection, GUIDE_GROUPS, GUIDE_SECTIONS, neighbours, sectionPath } from "./sections";
import { colorGroups, contrast, contrastGrade, contrastMode, fmtRatio, resolveColor, TOKENS } from "./tokens";
import { typeAnchor, variantAnchor, variantSample } from "./chartKinds";
import { accessibleText, fmtDay, type TextNode } from "./util";
import { sourceUse } from "./MethodologyPage";

describe("sections", () => {
  it("has unique slugs and a reading order with the index first", () => {
    expect(new Set(GUIDE_SECTIONS.map((s) => s.slug)).size).toBe(GUIDE_SECTIONS.length);
    expect(neighbours(null)).toEqual({ prev: undefined, next: "marka" });
    expect(neighbours("marka")).toEqual({ prev: null, next: "kolory-i-typografia" });
    expect(neighbours("metodologia").next).toBeUndefined();
    expect(neighbours("nope")).toEqual({ prev: undefined, next: undefined });
    expect(findSection("menu")?.pl).toBe("Menu boczne");
    expect(sectionPath(null)).toBe("/przewodnik");
    expect(sectionPath("wykresy")).toBe("/przewodnik/wykresy");
  });
  it("puts every section in a sidebar group and keeps groups in reading order", () => {
    const keys = GUIDE_GROUPS.map((g) => g.key);
    for (const s of GUIDE_SECTIONS) expect(keys).toContain(s.group);
    const order = GUIDE_SECTIONS.map((s) => keys.indexOf(s.group));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe("tokens", () => {
  it("computes WCAG contrast from token values", () => {
    expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrast("#fff", "#fff")).toBeCloseTo(1, 5);
    expect(contrast("rgba(0,0,0,.5)", "#fff")).toBeNull();
    // tokens.json states 17.7:1 for ink on surface and 4.8:1 for ink-muted.
    expect(fmtRatio(contrast(resolveColor("{ink}"), resolveColor("{surface}"))!, "pl")).toBe("17,7:1");
    expect(fmtRatio(contrast(resolveColor("{ink-muted}"), resolveColor("{surface}"))!, "en")).toBe("4.8:1");
    expect(contrastGrade(4.5)).toBe("text");
    expect(contrastGrade(3.2)).toBe("graphic");
    expect(contrastGrade(2)).toBe("low");
  });
  it("resolves references", () => {
    expect(resolveColor("{focus}")).toBe(resolveColor("{accent}"));
    expect(resolveColor("{status-revised-fg}")).toBe("#163A69");
  });
  it("puts every colour token in exactly one group", () => {
    const names = colorGroups().flatMap((g) => g.tokens.map((t) => t.name));
    expect(names.sort()).toEqual(TOKENS.color.tokens.map((t) => t.name).sort());
  });
  it("picks the contrast that matters per token", () => {
    expect(contrastMode("canvas")).toBe("ground");
    expect(contrastMode("status-current-bg")).toBe("ground");
    expect(contrastMode("ink-2")).toBe("fg");
    expect(contrastMode("seq-2")).toBe("both");
    expect(contrastMode("band-edge")).toBe("both");
    expect(contrastMode("band")).toBe("ground");
    expect(contrastMode("on-inverse")).toBe("inverse");
  });
});

describe("chart library v2", () => {
  it("has 31 types with unique variant ids, each variant drawn by a library chart type", () => {
    expect(LIBRARY).toHaveLength(31);
    const ids = VARIANTS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of VARIANTS) {
      expect(CHART_TYPES).toContain(v.chart);
      expect(v.id.startsWith(`${v.type}.`)).toBe(true);
    }
  });
  it("shows every variant with a sample of its own chart type and options", () => {
    for (const v of VARIANTS) {
      const s = variantSample(v, CHART_SAMPLES);
      expect(s.type).toBe(v.chart);
      // Placeholders of the library ("" forecast start, 0 target) are filled by the sample's data.
      for (const [k, val] of Object.entries(v.opts ?? {}))
        if (val !== "" && val !== 0) expect(s.opts?.[k as keyof typeof s.opts]).toEqual(val);
    }
    expect(variantAnchor("line.step")).toBe("wariant-line-step");
  });
});

describe("util", () => {
  it("formats load dates", () => {
    expect(fmtDay("2026-10-24T06:00:00Z", "pl")).toBe("24 paź 2026");
    expect(fmtDay("2026-01-05", "en")).toBe("5 Jan 2026");
    expect(fmtDay("soon", "pl")).toBe("soon");
  });
  it("reads text like a screen reader: aria-hidden skipped, hidden text kept", () => {
    const text = (s: string): TextNode => ({ nodeType: 3, textContent: s, childNodes: [] });
    const el = (attrs: Record<string, string>, ...kids: TextNode[]): TextNode => ({
      nodeType: 1,
      textContent: null,
      childNodes: kids,
      getAttribute: (n) => attrs[n] ?? null,
    });
    const tile = el(
      {},
      text("Inflacja"),
      el({ class: "zt-sr" }, text(", ")),
      el({ "aria-hidden": "true" }, text("▼ 0,1 pp")),
      text("spadek"),
    );
    expect(accessibleText(tile)).toBe("Inflacja, spadek");
  });
});

async function render(section: string | null, lang: "pl" | "en" = "pl") {
  const catalog: Catalog = await dummy.catalog();
  const url = new URL(`http://x${sectionPath(section)}`);
  return renderToStaticMarkup(
    <PageContext.Provider value={{ lang, catalog, url, setMeta: () => undefined }}>
      <GuidePage section={section} />
    </PageContext.Provider>,
  );
}

describe("GuidePage", () => {
  it.each([null, ...GUIDE_SECTIONS.map((s) => s.slug)])(
    "renders %s with one h1 and previous/next links (the sidebar lists the guide pages)",
    async (slug) => {
      const html = await render(slug);
      expect(html.match(/<h1/g)?.length).toBe(1);
      expect(html).not.toContain('aria-label="Części przewodnika"');
      expect(html).toContain('aria-label="Poprzednia i następna część"');
      expect(html).not.toContain("Nie ma takiej części");
    },
  );
  it("shows a friendly not-found state for an unknown section", async () => {
    const html = await render("nieznana");
    expect(html).toContain("Nie ma takiej części przewodnika");
    expect(html).not.toContain('aria-current="page"');
    expect(html).toContain('href="/przewodnik/wykresy"');
  });
  it("gives every chart type and variant its own anchor on the chart library page", async () => {
    const html = await render("wykresy", "en");
    for (const t of LIBRARY) expect(html).toContain(`id="${typeAnchor(t.id)}"`);
    for (const v of VARIANTS) expect(html).toContain(`id="${variantAnchor(v.id)}"`);
    expect(html).toContain("Chart library");
  });
  it("lists sources with licences and links every domain dashboard", async () => {
    const cat = await dummy.catalog();
    const html = await render("metodologia");
    for (const s of cat.sources) expect(html).toContain(s.name_pl);
    for (const d of cat.domains.filter((x) => x.level === "domain")) expect(html).toContain(`href="/d/${d.domain_key}"`);
    expect(sourceUse(cat)["eurostat"]).toBeGreaterThan(0);
  });
});
