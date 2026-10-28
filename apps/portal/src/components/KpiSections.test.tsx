import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Citation, DimensionsTable, KpiHeader, SourcesTable } from "./KpiSections";

const header = (headline: Parameters<typeof KpiHeader>[0]["headline"]) =>
  renderToStaticMarkup(
    <KpiHeader name_en="Unemployment rate (LFS)" name_pl="Stopa bezrobocia (BAEL)" unitSymbol="%" headline={headline} />,
  );

describe("KpiHeader", () => {
  it("shows the value and the change", () => {
    const html = header({ period: "2025", value: 3.2, previous_period: "2024", delta: 0.3 });
    expect(html).toContain("3.2 %");
    expect(html).toContain("+0.3 vs 2024");
  });

  it("shows no change line without a delta", () => {
    expect(header({ period: "2025", value: 3.2, delta: null })).not.toContain(" vs ");
  });

  it("says when nothing is published", () => {
    expect(header(null)).toContain("No published value yet.");
  });
});

describe("SourcesTable", () => {
  const rows = [
    {
      source_key: "eurostat",
      name_en: "Eurostat",
      register_id: "GL-001",
      licence_name: "Creative Commons Attribution 4.0",
      licence_url: "https://creativecommons.org/licenses/by/4.0/",
      attribution_text: "Source: <publisher> (illustrative)",
    },
    { source_key: "x", name_en: "X", register_id: "X-1", licence_name: null, licence_url: null, attribution_text: null },
  ];

  it("lists sources with register id and licence link", () => {
    const html = renderToStaticMarkup(<SourcesTable rows={rows} />);
    expect(html).toContain("GL-001");
    expect(html).toContain('href="https://creativecommons.org/licenses/by/4.0/"');
    expect(html).toContain("<td>–</td>");
  });

  it("says when no source is listed", () => {
    expect(renderToStaticMarkup(<SourcesTable rows={[]} />)).toContain("No sources listed.");
  });
});

describe("DimensionsTable", () => {
  it("lists geography first, then the dimensions", () => {
    const html = renderToStaticMarkup(
      <DimensionsTable
        geoLevels={["country", "voivodeship"]}
        dimensions={[{ dimension_key: "currency", member_count: 33, levels: ["currency"] }]}
      />,
    );
    expect(html).toContain("country, voivodeship");
    expect(html).toContain("currency");
    expect(html).toContain(">33<");
  });
});

describe("Citation", () => {
  it("puts the text in a blockquote", () => {
    expect(renderToStaticMarkup(<Citation text="Population, Eurostat" />)).toContain("<blockquote>Population, Eurostat</blockquote>");
  });
});
