Published layer contract v2 fixtures (zohelo-data docs/published.md, "Published layer contract v2").

- `topics.json`: copied byte for byte from zohelo-data `warehouse/published/fixtures/v2/topics.json` at commit
  3a666251e14eef6722aa409661ddae425e0cf578.
- `catalog.json`, `latest.json`, `kpi/<kpi_key>/series.json`, `calendar.json`: **hand-written from the contract**,
  because zohelo-data has no v2 fixtures for them yet (on origin/main at the commit above only `fixtures/v2/topics.json`
  exists; the contract says `schemas/v2/` and `fixtures/v2/` come with the Stage B implementation tasks). Three
  KPIs (monthly `hicp_annual_rate` with a COICOP breakdown and EU countries, quarterly `unemployment_lfs` from two
  sources with a sex breakdown and voivodeships only in `gus_bdl`, annual `population_total` with a null), values
  illustrative, `generated_at` 2026-01-01T00:00:00Z marks them as examples. Replace them with copies of zohelo-data's
  fixtures once those are published, and keep the tests passing.
