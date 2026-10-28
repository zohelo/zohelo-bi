import { describe, expect, it } from "vitest";
import { MAX_PANELS, cutPanels, panelsMessage } from "./index";

const twenty = Array.from({ length: 20 }, (_, i) => ({ geography_name: `M${String(i).padStart(2, "0")}`, value: i }));

describe("cutPanels", () => {
  it("keeps the first 16 panels and their rows", () => {
    const cut = cutPanels(twenty, "geography_name");
    expect(MAX_PANELS).toBe(16);
    expect(cut.panels.length).toBe(16);
    expect(cut.hidden).toBe(4);
    expect(cut.rows.map((r) => r.geography_name)).toEqual(cut.panels);
    expect(cut.panels).not.toContain("M16");
  });

  it("sorts with Polish collation and names a null member", () => {
    const rows = [{ g: "Łódzkie" }, { g: null }, { g: "Lubuskie" }, { g: "Łódzkie" }];
    const cut = cutPanels(rows, "g");
    expect(cut.panels.indexOf("Lubuskie")).toBeLessThan(cut.panels.indexOf("Łódzkie"));
    expect(cut.panels).toContain("∅");
    expect(cut.rows).toEqual(rows);
  });
});

describe("panelsMessage", () => {
  it("is null when nothing is hidden", () => {
    const cut = cutPanels([{ g: "a" }, { g: "b" }, { g: "c" }], "g");
    expect(cut.hidden).toBe(0);
    expect(panelsMessage(cut)).toBeNull();
  });

  it("says how many panels are shown", () => {
    expect(panelsMessage(cutPanels(twenty, "geography_name"))).toBe("Showing 16 of 20 panels. Narrow a filter to see the rest.");
  });
});
