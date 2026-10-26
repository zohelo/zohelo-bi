# zohelo-bi architecture

```
zohelo-data (GitHub Actions)                 zohelo-bi (Cloudflare)
  Landing → Bronze → Silver → Gold   ──►  R2 Data Catalog (Iceberg) ◄── R2 SQL
                                                                         ▲
  browser ── Access sign-in ── Pages: portal (static) + /api (Functions) ─┘
```

- **Data**: Gold tables in the lakehouse catalog, written by zohelo-data. zohelo-bi only reads,
  with the read-only catalog token (`STORAGE_LAKEHOUSE_CATALOG_READ_TOKEN`).
- **API** (`apps/portal/functions/api`): same origin as the portal, so one Access app covers
  both. Only metrics and columns in the semantic manifest can be queried; filter values are
  validated and quoted. Responses are cached at the edge for an hour.
- **Semantic manifest** (`packages/semantic`): metric id → table, unit, dimensions, defaults.
  The portal, the API and the dashboard check all read it. Next step: zohelo-data publishes it
  from `warehouse/semantic_models`, and this package fetches it at build time.
- **Visuals** (`packages/visuals`): spec builders (`lineSpec`, `barSpec`) plus a `Chart`
  component. No portal logic, so zohelo.com can use them.
- **Dashboards**: YAML, validated against the manifest in CI. Cross-filtering through `$selected`.
- **Access**: a Cloudflare Access app over `bi.zohelo.com`, `zohelo-bi.pages.dev` and every
  preview subdomain; sign-in by one-time PIN to the allowed emails. GitHub sign-in can replace
  the PIN once a GitHub OAuth app exists for the organisation.
- **Credentials**: organisation-level only (see the infrastructure doc). Workflows map them
  onto the names the tools read, in one block.

## Not yet

- DuckDB-WASM explorer over published Parquet (for large or ad-hoc cuts R2 SQL caps at 20,000 rows here).
- Maps; drill from country to voivodeship to powiat.
- Generated manifest; more metrics as Gold v1 grows.
- Lazy loading of the chart library (the bundle is ~390 kB gzipped, mostly Vega).
