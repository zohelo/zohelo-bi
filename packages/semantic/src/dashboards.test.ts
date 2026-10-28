/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { validateDashboard } from "./index";

const overview: unknown = parse(readFileSync(new URL("../../../dashboards/overview.yaml", import.meta.url), "utf8"));
const tile = { title: "t", metric: "population", chart: "line", filters: { geography_name: ["Polska"] } };
const board = (t: object) => ({ id: "x", title: "x", tiles: [{ ...tile, ...t }] });

describe("validateDashboard", () => {
  it("accepts the overview dashboard", () => {
    expect(validateDashboard(overview, "dashboards/overview.yaml")).toEqual([]);
  });

  it("reports an unknown metric", () => {
    expect(validateDashboard(board({ metric: "nope" }), "f.yaml")).toEqual(["f.yaml: unknown metric nope"]);
  });

  it("reports a bad chart", () => {
    expect(validateDashboard(board({ chart: "pie" }), "f.yaml")).toEqual(["f.yaml: unknown chart pie"]);
  });

  it("reports a filter column that is not a dimension", () => {
    expect(validateDashboard(board({ filters: { colour: ["red"] } }), "f.yaml")).toEqual(["f.yaml: population has no dimension colour"]);
  });
});
