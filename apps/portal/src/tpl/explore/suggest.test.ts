import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { applyPatch, parseExplore, shapeOf } from "./exploreState";
import { LOOKS, WARDROBE_TYPES, lookGroups, lookQuestion, stripLooks, visualOverrides, visualVariants } from "./looks";
import { QUESTIONS, QUESTION_ORDER } from "./questions";
import { MAX_LINES, suggestLooks } from "./suggest";

const cat = await dummy.catalog();
const WOJ = cat.geographies.filter((g) => g.level === "voivodeship").map((g) => g.key);

describe("looks by business question (docs/product-principles.md)", () => {
  it("every look names a question the type's bar knows, and the strip is grouped in the type's order", () => {
    for (const t of WARDROBE_TYPES) {
      for (const l of LOOKS[t]) {
        expect(QUESTIONS[l.q], l.id).toBeDefined();
        expect(QUESTION_ORDER[t], l.id).toContain(l.q);
        if (l.qCats) expect(QUESTION_ORDER[t], l.id).toContain(l.qCats);
      }
      const groups = lookGroups(t);
      const order = groups.map((g) => g.q);
      // One group per question, in the declared order, the blank look ("od zera") last.
      expect(new Set(order).size).toBe(order.length);
      expect(order).toEqual(QUESTION_ORDER[t].filter((q) => order.includes(q)));
      expect(order[order.length - 1]).toBe("own");
      expect(groups.flatMap((g) => g.looks)).toEqual(stripLooks(t));
    }
    expect(lookGroups("bar")[0]!.q).toBe("rank");
    expect(lookGroups("line")[0]!.q).toBe("time");
  });

  it("purely visual variants are off the strip and fold into the base look's settings", () => {
    for (const t of WARDROBE_TYPES) for (const v of visualVariants(t)) expect(stripLooks(t)).not.toContain(v);
    expect(visualVariants("line").map((l) => l.id)).toEqual(["line.labelled", "line.smooth", "line.step"]);
    const step = LOOKS.line.find((l) => l.id === "line.step")!;
    const f = visualOverrides(step)!;
    expect(f.base.id).toBe("line.multi");
    expect(f.o.shape).toBe("step");
    const q = parseExplore("?i=avg_wage&geo=PL&t=5y&chart=area&x=t&v=area.smooth", cat);
    expect(q.v).toBeNull();
    expect(Object.keys(q.o).length).toBeGreaterThan(0);
  });

  it("a column look over categories answers 'how much', over time 'how did it change'", () => {
    const simple = LOOKS.column.find((l) => l.id === "column.simple")!;
    expect(lookQuestion(simple, true)).toBe("time");
    expect(lookQuestion(simple, false)).toBe("level");
  });
});

describe("suggestions from the fields in the wells (no AI)", () => {
  const suggest = (search: string) => {
    const q = parseExplore(search, cat);
    return { q, list: suggestLooks(q, shapeOf(q, cat), cat, "pl") };
  };

  it("many series over time: highlight one or split into panels, with the reason", () => {
    const { list } = suggest(`?i=avg_wage&geo=${WOJ.join(",")}&lvl=woj&t=10y&chart=line&x=t&leg=geo`);
    const ids = list.map((s) => s.look.id);
    expect(WOJ.length).toBeGreaterThan(MAX_LINES);
    expect(ids).toContain("line.highlight");
    expect(list[0]!.reason).toContain(String(WOJ.length));
    // One suggestion per question, never the look already worn.
    expect(new Set(list.map((s) => s.question)).size).toBe(list.length);
    expect(ids).not.toContain("line.multi");
    expect(list.length).toBeLessThanOrEqual(3);
  });

  it("several areas: a ranking is offered and wearing it changes the chart", () => {
    const { q, list } = suggest(`?i=avg_wage&geo=${WOJ.slice(0, 6).join(",")}&lvl=woj&t=10y&chart=line&x=t&leg=geo`);
    const rank = list.find((s) => s.question === "rank");
    expect(rank?.look.id).toBe("bar.ranked");
    expect(rank!.label).toContain("Słupkowy");
    const next = applyPatch(q, rank!.patch, cat);
    expect(next.chart).toBe("bars");
  });

  it("one series with several years: the comparison with last year is offered", () => {
    const { list } = suggest("?i=avg_wage&geo=PL&t=10y&chart=line&x=t");
    expect(list.map((s) => s.question)).toContain("py");
  });

  it("nothing is suggested without a measure", () => {
    const q = parseExplore("?", cat);
    expect(suggestLooks({ ...q, i: [] }, shapeOf(q, cat), cat, "pl")).toEqual([]);
  });
});
