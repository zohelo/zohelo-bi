import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DraftBadge } from "./blocks";
import { fmtLatest } from "../format";

describe("draft badge (catalog.json kpis[].status, decision O37)", () => {
  it("marks a draft KPI in Polish and English", () => {
    expect(renderToStaticMarkup(<DraftBadge kpis={[{ status: "draft" }]} lang="pl" />)).toContain("wersja robocza");
    expect(renderToStaticMarkup(<DraftBadge kpis={[{ status: "published" }, { status: "draft" }]} lang="en" />)).toContain(">draft<");
  });
  it("shows nothing for published KPIs and on sample data (no status)", () => {
    expect(renderToStaticMarkup(<DraftBadge kpis={[{ status: "published" }, {}, undefined]} lang="pl" />)).toBe("");
  });
});

describe("a latest value as shown", () => {
  it("is … while loading and brak danych when there is none, never a number", () => {
    expect(fmtLatest(undefined, { unit_key: "pct" }, undefined, "pl")).toBe("…");
    expect(fmtLatest(null, { unit_key: "pct" }, undefined, "pl")).toBe("brak danych");
    expect(fmtLatest(null, { unit_key: "pct" }, undefined, "en")).toBe("no data");
  });
});
