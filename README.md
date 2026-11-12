# zohelo-bi

The zohelo BI portal on top of [zohelo-data](https://github.com/zohelo/zohelo-data): a home page, domain
dashboards, a data explorer, guided analyses, collections, the indicator catalogue and the design guide, at
**bi.zohelo.com** (sign-in required). The portal is the zohelo design template (`apps/portal/src/tpl`), approved
as zohelo-bi on 2026-11-10; the old portal was removed then.

bi.zohelo.com runs on live data only: the KPIs zohelo-data publishes in contract v2 (about 60 since O37, most of
them marked "wersja robocza" while the owner reviews them there). The 288 synthetic indicators of the template
remain for local development and the UI suite, with "Dane przykładowe: wszystkie wartości są syntetyczne" in every
page's footer.

## Layout

| Path | What |
|---|---|
| `apps/portal` | The portal (React + Vite; pages in `src/tpl`, data providers in `src/data`) and its query API (`functions/api`, Cloudflare Pages Functions over R2 SQL and the published layer). |
| `packages/semantic` | The semantic manifest (metrics the API may query), the published catalogue contract, the dashboard format v3 and yardsticks validators, xlsx export. |
| `packages/visuals` | The chart library (`ZChart`, 48 chart types in four style families); `@zohelo/visuals/samples` holds the documented examples the guide draws. |
| `packages/stats` | Statistics for the analyses (trend, season, forecast, relationship, convergence). |
| `packages/design-template` | Design template files for code: tokens, component styles (`zt-*`), logos, docs. Rules: `docs/design-template.md`. |
| `dashboards` | Domain dashboards as YAML (`domains/<domain>.yaml`, format v3) and the scorecards' official thresholds (`yardsticks.yaml`). Format: `docs/dashboards.md`. |
| `tests/ui`, `tests/screen-reader` | Mandatory UI checks (`bun run test:ui`: axe, focus ring, widths, chart text) and real screen-reader runs (NVDA, VoiceOver). |
| `ops/` | Cloudflare setup (`ensure-platform.ts`), the dashboard check, the API smoke test and the accessibility check used by the workflows; the sample data generator (`template/`). |

More in [docs/architecture.md](docs/architecture.md); the state of the work in [docs/handover-2026-11-04.md](docs/handover-2026-11-04.md).

## Deploying

Pull requests run `.github/workflows/check.yml`: frozen install, lint, format, type check, unit tests, dashboard
check, build, a smoke test of the API against the real lakehouse (read token only, nothing deployed), the
accessibility check and the UI suite. Pushes to `main` run `.github/workflows/deploy.yml`: the same checks,
Cloudflare setup, deploy to bi.zohelo.com, a sign-in check and a release. For a preview, run `deploy.yml` by hand
on a branch (Actions → Deploy portal → Run workflow); it deploys to `<branch>.zohelo-bi.pages.dev`. All hostnames
are behind Cloudflare Access (one-time PIN to the emails in `PORTAL_SIGNIN_ALLOWED_EMAILS`).

Production shows only published data: `main` always builds with the live provider on zohelo-data's published
contract v2 (owner direction of 12 Nov 2026, decision O37); the build refuses sample data (`PORTAL_TARGET=production`
in `vite.config.ts`) and `ops/check-live-build.sh` checks the output. A KPI or file that is not published shows "brak
danych", never sample numbers; a draft KPI shows "wersja robocza". check.yml builds the same way, scans it with its
data and saves live screenshots (artifact `live-screenshots`, `ops/live-screens.sh`). A hand-run preview may choose
sample data (input `data_mode`), marked "Dane przykładowe" on every page. check.yml fails when an action is not pinned to a full SHA.

## Adding or changing a dashboard

Edit `dashboards/domains/<domain>.yaml` (format v3: overview, pages, sections, cards; `docs/dashboards.md`), then
run `bun ops/check-dashboards.ts`. No code changes are needed.

## Local development

`bun install`, then `VITE_DATA_MODE=dummy bun run dev` for the portal on sample data. Live mode needs the API:
`wrangler pages dev` in `apps/portal` with a `.dev.vars` file (see `ops/pages-dev.sh`); without it the pages load
but show errors. Definition of done for every change: `docs/handover-2026-11-04.md`.

## Copyright

Copyright © 2026 Radosław Utkała. All rights reserved.
