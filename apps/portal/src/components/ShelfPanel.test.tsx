import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_SHELVES } from "../shelves";
import { ShelfPanel } from "./ShelfPanel";

const columns = [
  { column: "source_system", label: "Source" },
  { column: "frequency", label: "Frequency" },
  { column: "geography_name", label: "Area" },
  { column: "date_key", label: "Period" },
];
const render = (shelves = DEFAULT_SHELVES) => renderToStaticMarkup(<ShelfPanel columns={columns} shelves={shelves} onChange={() => {}} />);
const group = (html: string, heading: string) => html.split(`<h3>${heading}</h3>`)[1]!.split("</div>")[0]!;
const chips = (html: string) => html.match(/class="chip"/g)?.length ?? 0;

describe("ShelfPanel", () => {
  it("renders 2 chips under Rows and 1 under Columns for the default shelves", () => {
    const html = render();
    expect(chips(group(html, "Rows"))).toBe(2);
    expect(chips(group(html, "Columns"))).toBe(1);
    expect(chips(group(html, "Not used"))).toBe(1);
  });

  it("disables the Rows buttons of other chips when Rows is full", () => {
    const html = render();
    expect(html).toMatch(/<button[^>]*aria-label="Frequency: move to Rows"[^>]*disabled=""/);
    expect(html).toMatch(/<button[^>]*aria-label="Period: move to Rows"[^>]*disabled=""/);
    expect(html).not.toMatch(/<button[^>]*aria-label="Frequency: move to Columns"[^>]*disabled=""/);
  });
});
