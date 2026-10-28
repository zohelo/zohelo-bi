import { describe, expect, it } from "vitest";
import { manifest, metric, type SeriesRow } from "@zohelo/semantic";
import { embedCode, embedFilters, embedFooter } from "./embed";

const population = metric("population")!;

const row = (source_system: string, date_key: string, value: number | null): SeriesRow => ({
  series_key: `${source_system}:population`,
  source_system,
  geography_name: "Polska",
  geography_level: "country",
  frequency: "A",
  date_key,
  value,
  unit: "persons",
  breakdown_json: null,
});

describe("embedFilters", () => {
  it("reads the explorer's parameters without defaults when metric is given", () => {
    expect(embedFilters(new URLSearchParams("metric=population&geography_name=Polska|Śląskie"), population)).toEqual({
      geography_name: ["Polska", "Śląskie"],
    });
  });

  it("uses the metric's defaults without parameters", () => {
    const m = manifest.metrics[0]!;
    const expected = Object.fromEntries(Object.entries(m.defaults).map(([c, v]) => [c, [v]]));
    expect(embedFilters(new URLSearchParams(""), m)).toEqual(expected);
  });

  it("drops empty parts and ignores columns that are not filters", () => {
    expect(embedFilters(new URLSearchParams("metric=population&geography_name=|Polska|&series_key=x"), population)).toEqual({
      geography_name: ["Polska"],
    });
  });
});

describe("embedFooter", () => {
  it("names the sources in first-seen order and the latest period with a value", () => {
    expect(embedFooter([row("eurostat", "2020", 1), row("world_bank_wdi", "2023", 2), row("eurostat", "2024", null)])).toEqual({
      sources: ["Eurostat", "World Bank"],
      latest: "2023",
    });
  });

  it("keeps unknown source keys and has no latest without values", () => {
    expect(embedFooter([row("imf_ifs", "2024", null)])).toEqual({ sources: ["imf_ifs"], latest: null });
  });
});

describe("embedCode", () => {
  it("escapes the src and the title", () => {
    expect(embedCode("https://bi.zohelo.com", "?metric=population&a=1", 'GDP "x" & <y>')).toBe(
      '<iframe src="https://bi.zohelo.com/embed?metric=population&amp;a=1" title="GDP &quot;x&quot; &amp; &lt;y&gt;" width="100%" height="420" style="border:0" loading="lazy"></iframe>',
    );
  });
});
