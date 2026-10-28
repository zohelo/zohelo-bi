import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FreshnessBadge } from "./FreshnessBadge";

describe("FreshnessBadge", () => {
  it("renders a fresh KPI with its last period and load date", () => {
    const html = renderToStaticMarkup(
      <FreshnessBadge f={{ status: "fresh", lastPeriod: "2025", loadedDate: "2026-01-01", ageDays: 10 }} />,
    );
    expect(html).toContain('class="badge freshness freshness-fresh"');
    expect(html).toContain('title="loaded 2026-01-01"');
    expect(html).toContain(">to 2025<");
  });

  it("marks a stale KPI and keeps the load date in the title", () => {
    const html = renderToStaticMarkup(
      <FreshnessBadge f={{ status: "stale", lastPeriod: "2024-06", loadedDate: "2025-08-01", ageDays: 90 }} />,
    );
    expect(html).toContain("freshness-stale");
    expect(html).toContain('title="loaded 2025-08-01"');
  });

  it("renders 'no data' without a last period and no title without a load date", () => {
    const html = renderToStaticMarkup(<FreshnessBadge f={{ status: "unknown", lastPeriod: null, loadedDate: null, ageDays: null }} />);
    expect(html).toContain("freshness-unknown");
    expect(html).toContain(">no data<");
    expect(html).not.toContain("title=");
  });
});
