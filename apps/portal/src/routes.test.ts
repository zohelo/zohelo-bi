import { describe, expect, it } from "vitest";
import { pageFor } from "./routes";

const ids = ["overview"];

describe("pageFor", () => {
  it("maps / and /d/<id> to the dashboard", () => {
    expect(pageFor("/", ids)).toEqual({ kind: "dashboard", id: "overview" });
    expect(pageFor("/d/overview", ids)).toEqual({ kind: "dashboard", id: "overview" });
  });

  it("maps the explorer and the catalogue, ignoring trailing slashes", () => {
    expect(pageFor("/explore/", ids)).toEqual({ kind: "explore" });
    expect(pageFor("/catalogue", ids)).toEqual({ kind: "catalogue" });
  });

  it("returns the KPI page for /kpi/<kpi_key>", () => {
    expect(pageFor("/kpi/fx_rate", ids)).toEqual({ kind: "kpi", key: "fx_rate" });
    expect(pageFor("/kpi/unemployment_rate/", ids)).toEqual({ kind: "kpi", key: "unemployment_rate" });
  });

  it("returns not-found for unknown paths", () => {
    for (const p of ["/d/nope", "/explore/x", "/kpi/Bad-Key", "/kpi/", "/kpi/a/b"]) expect(pageFor(p, ids)).toEqual({ kind: "not-found" });
  });

  it("returns not-found for / without dashboards", () => {
    expect(pageFor("/", [])).toEqual({ kind: "not-found" });
  });
});
