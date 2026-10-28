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

const docs = readFileSync(new URL("../../../docs/dashboards.md", import.meta.url), "utf8");
const example = parse(/```yaml\n(schema: 2\n[\s\S]*?)```/.exec(docs)![1]!) as Record<string, unknown>;
const V2 = "dashboards/population-labour.yaml";
const v2 = (patch: Record<string, unknown>) => validateDashboard({ ...example, ...patch }, V2);
const tileV2 = (patch: Record<string, unknown>) => v2({ tiles: [{ ...(example.tiles as object[])[0], ...patch }] });

describe("validateDashboard, schema 2", () => {
  it("accepts the example of docs/dashboards.md", () => {
    expect(validateDashboard(example, V2)).toEqual([]);
  });

  it("still accepts v1 files", () => {
    expect(validateDashboard(board({}), "f.yaml")).toEqual([]);
  });

  it("rejects an unsupported schema", () => {
    expect(v2({ schema: 3 })).toEqual([`${V2}: unsupported schema 3`]);
  });

  it("rejects an id that is not kebab-case", () => {
    expect(v2({ id: "Population_Labour" })).toEqual([`${V2}: id must be kebab-case`]);
  });

  it("rejects an id that differs from the file name", () => {
    expect(v2({ id: "population" })).toEqual([`${V2}: id must equal the file name`]);
  });

  it("rejects a missing title or domain", () => {
    expect(v2({ title_en: "", domain_key: undefined })).toEqual([`${V2}: needs title_en`, `${V2}: needs domain_key`]);
  });

  it("rejects an unknown slicer", () => {
    expect(v2({ slicers: ["period", "colour"] })).toEqual([`${V2}: unknown slicer colour`]);
  });

  it("needs 1–12 tiles", () => {
    expect(v2({ tiles: [] })).toEqual([`${V2}: needs 1–12 tiles`]);
    const tiles = Array.from({ length: 13 }, () => (example.tiles as object[])[0]);
    expect(v2({ tiles })).toEqual([`${V2}: needs 1–12 tiles`]);
  });

  it("rejects an unknown chart", () => {
    expect(tileV2({ chart: "pie" })).toEqual([`${V2}: tile 1: unknown chart pie`]);
  });

  it("rejects a view starting with '?'", () => {
    expect(tileV2({ view: "?rows=time" })).toEqual([`${V2}: tile 1: view must be URL params without '?'`]);
  });

  it("rejects an empty view", () => {
    expect(tileV2({ view: "" })).toEqual([`${V2}: tile 1: view must be URL params without '?'`]);
  });

  it("rejects a missing kpi_key", () => {
    expect(tileV2({ kpi_key: undefined })).toEqual([`${V2}: tile 1: needs kpi_key`]);
  });

  it("rejects a kpi_key with other characters", () => {
    expect(tileV2({ kpi_key: "GDP-1" })).toEqual([`${V2}: tile 1: kpi_key must match [a-z0-9_]+`]);
  });

  it("rejects selects that is not a boolean", () => {
    expect(tileV2({ selects: "yes" })).toEqual([`${V2}: tile 1: selects must be true or false`]);
  });
});
