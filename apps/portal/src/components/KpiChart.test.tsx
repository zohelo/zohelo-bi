import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The KPI page chart must pass the page language on, so a Polish page gets Polish axes (design review of #347).
vi.mock("./useData", () => ({ useData: () => ({ data: [], loading: false }) }));
vi.mock("./SeriesChart", () => ({ SeriesChart: ({ lang }: { lang?: string }) => <p>{`chart lang ${lang}`}</p> }));

const { KpiChart } = await import("./KpiChart");

describe("KpiChart", () => {
  it("passes the page language to the chart", () => {
    expect(renderToStaticMarkup(<KpiChart kpiKey="population" lang="pl" />)).toContain("chart lang pl");
    expect(renderToStaticMarkup(<KpiChart kpiKey="population" />)).toContain("chart lang en");
  });
});
