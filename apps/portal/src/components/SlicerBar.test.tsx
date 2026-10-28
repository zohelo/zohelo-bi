import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Slicer, SlicerValues } from "@zohelo/semantic";
import { SlicerBar } from "./SlicerBar";

const noop = () => {};
const render = (slicers: Slicer[], values: SlicerValues, geographies: string[] = []) =>
  renderToStaticMarkup(<SlicerBar slicers={slicers} values={values} geographies={geographies} onChange={noop} />);

describe("SlicerBar", () => {
  it("renders nothing without slicers", () => {
    expect(render([], {})).toBe("");
  });

  it("renders the area select with the current value selected", () => {
    const html = render(["geography"], { geography_name: "Śląskie" }, ["Mazowieckie", "Śląskie"]);
    expect(html).toContain('role="group"');
    expect(html).toContain("All areas");
    expect(html).toContain("Mazowieckie");
    expect(html).toContain('<option value="Śląskie" selected="">Śląskie</option>');
    expect(html).not.toContain('aria-label="From"');
  });

  it("renders the controls in slicer order with the period values", () => {
    const html = render(["period", "geography"], { from: "2015" });
    expect(html.indexOf('aria-label="From"')).toBeGreaterThan(-1);
    expect(html.indexOf('aria-label="From"')).toBeLessThan(html.indexOf('aria-label="Area"'));
    expect(html).toMatch(/aria-label="From" value="2015"/);
    expect(html).toMatch(/aria-label="To" value=""/);
  });
});
