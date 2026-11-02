import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Lang } from "../i18n";
import { FilterSelect } from "./FilterSelect";

const render = (chosen: string[], lang?: Lang) =>
  renderToStaticMarkup(
    <FilterSelect
      column="source_system"
      label="Source"
      values={["a", "b", "c"]}
      available={new Set(["a", "b", "c"])}
      chosen={chosen}
      onChange={() => {}}
      lang={lang}
    />,
  );

describe("FilterSelect", () => {
  it("shows All with nothing chosen and no lang", () => {
    expect(render([])).toContain('<span class="filter-value">All</span>');
  });

  it("shows Wszystkie with nothing chosen and lang pl", () => {
    expect(render([], "pl")).toContain('<span class="filter-value">Wszystkie</span>');
  });

  it("summarises two chosen values with +1", () => {
    expect(render(["a", "b"])).toContain("+1");
  });
});
