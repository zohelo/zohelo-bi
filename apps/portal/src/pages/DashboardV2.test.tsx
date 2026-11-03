import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TileV2 } from "../dashboards";
import type { Lang } from "../i18n";
import { TileV2View } from "./DashboardV2";

// The third tile of dashboards/poland-overview.yaml (zohelo-bi#327).
const SELECTED: TileV2 = {
  title_pl: "$selected: ludność",
  title_en: "$selected: population",
  title_unselected_pl: "Ludność województwa",
  title_unselected_en: "Voivodeship population",
  kpi_key: "population",
  chart: "line",
  view: "rows=source_system&cols=date_key&geography_level=wojewodztwo&geography_name=$selected",
};

const tile = (lang: Lang, selected: string | null) =>
  renderToStaticMarkup(<TileV2View tile={SELECTED} values={{}} selected={selected} onSelect={() => {}} lang={lang} />);

describe("TileV2View before a selection", () => {
  it("shows the unselected title and the click prompt, not 'no data' (PL)", () => {
    const html = tile("pl", null);
    expect(html).toContain("<h2>Ludność województwa</h2>");
    expect(html).toContain("Kliknij województwo na wykresie powyżej.");
    expect(html).not.toContain("Brak danych");
    expect(html).not.toContain("…");
  });

  it("shows the unselected title and the click prompt (EN)", () => {
    const html = tile("en", null);
    expect(html).toContain("<h2>Voivodeship population</h2>");
    expect(html).toContain("Click a voivodeship in the chart above.");
    expect(html).not.toContain("No data");
  });

  it("names the selected area once one is chosen", () => {
    const html = tile("pl", "MAZOWIECKIE");
    expect(html).toContain("<h2>Mazowieckie: ludność</h2>");
    expect(html).not.toContain("Kliknij województwo");
  });
});
