import { describe, expect, it } from "vitest";
import { mergeView, slicerParams, slicerValues, tileExploreHref } from "./index";

describe("slicerValues", () => {
  const params = new URLSearchParams("geography_name=Mazowieckie&from=2015&to=&x=1");

  it("keeps the non-empty parameters of the given slicers", () => {
    expect(slicerValues(params, ["geography", "period"])).toEqual({ geography_name: "Mazowieckie", from: "2015" });
    expect(slicerValues(params, ["period"])).toEqual({ from: "2015" });
  });

  it("trims values and drops blanks", () => {
    expect(slicerValues(new URLSearchParams("from=%202015%20&to=%20"), ["period"])).toEqual({ from: "2015" });
  });
});

describe("slicerParams", () => {
  it("drops empty values and keeps the order", () => {
    expect(slicerParams({ to: "2020", geography_name: "", from: "2015" }).toString()).toBe("to=2020&from=2015");
  });
});

describe("mergeView", () => {
  it("overrides the tile's own parameter once and keeps the rest", () => {
    const merged = new URLSearchParams(mergeView("rows=date_key&geography_name=Polska", { geography_name: "Śląskie" }));
    expect(merged.get("rows")).toBe("date_key");
    expect(merged.getAll("geography_name")).toEqual(["Śląskie"]);
  });

  it("returns the view unchanged without values", () => {
    expect(mergeView("rows=date_key&geography_name=Polska", {})).toBe("rows=date_key&geography_name=Polska");
  });
});

describe("tileExploreHref", () => {
  it("links to the explorer with the metric first", () => {
    expect(tileExploreHref({ kpi_key: "population", view: "rows=date_key" }, { from: "2015" })).toBe(
      "/explore?metric=population&rows=date_key&from=2015",
    );
  });
});
