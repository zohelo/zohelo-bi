import { describe, expect, it } from "vitest";
import { dashboards, dashboardsV2, splitDashboards } from "./dashboards";

const v1 = `id: x
title: X
tiles:
  - title: Population
    metric: population
    chart: line
    filters: {}
`;

// The v2 example of docs/dashboards.md with id b-board and title_en Alpha.
const bBoard = `schema: 2
id: b-board
title_pl: Ludność i rynek pracy
title_en: Alpha
description_pl: Liczba ludności Polski i bezrobocie w województwach.
description_en: Poland's population and unemployment by voivodeship.
domain_key: population
slicers: [period]
tiles:
  - title_pl: Ludność Polski
    title_en: Population of Poland
    kpi_key: population
    view: rows=time&geo_level=country&geo=PL
    chart: line
  - title_pl: Stopa bezrobocia według województw
    title_en: Unemployment rate by voivodeship
    kpi_key: unemployment_rate
    view: rows=geo&cols=time&geo_level=voivodeship
    chart: ranking
    note_pl: Ostatni dostępny okres.
    note_en: Latest available period.
`;

const polandOverview = `schema: 2
id: poland-overview
title_pl: Polska
title_en: Zeta
domain_key: population
tiles:
  - title_pl: Ludność Polski
    title_en: Population of Poland
    kpi_key: population
    view: rows=time&geo_level=country&geo=PL
    chart: line
`;

describe("splitDashboards", () => {
  it("splits v1 and v2 files and puts poland-overview first", () => {
    const { v1: one, v2: two } = splitDashboards([
      ["x.yaml", v1],
      ["b-board.yaml", bBoard],
      ["poland-overview.yaml", polandOverview],
    ]);
    expect(one.map((d) => d.id)).toEqual(["x"]);
    expect(two.map((d) => d.id)).toEqual(["poland-overview", "b-board"]);
  });

  it("throws for an invalid v2 file", () => {
    const empty = `schema: 2
id: empty
title_pl: Pusta
title_en: Empty
domain_key: population
tiles: []
`;
    expect(() => splitDashboards([["empty.yaml", empty]])).toThrow("needs 1–12 tiles");
  });
});

describe("bundled dashboards", () => {
  it("has the v1 overview and no v2 files yet", () => {
    expect(dashboards.map((d) => d.id)).toEqual(["overview"]);
    expect(dashboardsV2).toEqual([]);
  });
});
