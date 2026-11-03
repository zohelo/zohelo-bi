# Shared brief: zohelo design template portal (read fully before starting)

## What we are building
A production-quality bi.zohelo.com (React 19 + Vite, Cloudflare Pages) that runs entirely on **sample (dummy)
data** and follows the **zohelo design template** exactly. It becomes the real bi.zohelo.com later by switching
the data provider to live data, so write production code, not mockup code. The owner (Radek) will judge it by
opening it in a browser; quality bar: looks and behaves like a finished product, Polish-first copy.

## Read first (in this repo)
- `packages/design-template/docs/README.md` and `01`–`07` sections: brand book, page layout, dashboard rules,
  chart library, accessibility, development and testing, portals. `docs/components/*.md`: per-component rules.
- `packages/design-template/tokens.css` (tokens as CSS vars; use `var(--name)` only, never hex in components)
  and `zt.css` (component classes `zt-*`). `apps/portal/src/tpl/shell.css` (shell/grid classes `t-*`).
- `apps/portal/src/data/types.ts` (DataProvider: `data.catalog()`, `data.series(kpi, query)`,
  `data.latest(kpi, geo)`), `apps/portal/src/data/dummy.ts`, `dummyCatalog.ts` (12 domains, 61 groups, 183 KPIs,
  geographies PL + 16 voivodeships PL02…PL32 + EU countries, dimensions sex/age/sector/nace/coicop/urban/level/fuel/mode).
- `apps/portal/src/tpl/`: `TplApp.tsx`, `routes.ts`, `context.tsx` (`usePage()` gives lang, catalog, url;
  `useMeta(title, crumbs, actions)` sets breadcrumb/top-bar actions/document title), `format.ts`
  (fmtValue, fmtPeriod, fmtChange with spoken form, freqLabel, basisFor), `chartData.ts` (toZSeries, zUnit,
  geoName, memberName, sourceName, kpiName), `ui/blocks.tsx` (PageHeader, PageTabs, Segmented, Sr, KpiTile,
  ChartCard, ChartState, ActionMenu, StatusTag, Sparkline), `ui/TableView.tsx`, `ui/icons.tsx`,
  `pages/Overview.tsx` (a finished example page: copy its patterns).
- Chart library contract: `packages/visuals/src/z/types.ts` (`ZChart`, `ZChartData`, `CHART_TYPES`,
  `toTable`, `legendItems`). Until the chart agent delivers, `ZChart` is a placeholder; code against the contract.

## Hard rules (from the design template; violations are defects)
- Tokens only; no hex/px font sizes outside tokens except layout sizes. Inter / Inter Tight via tokens.
- Every chart sits in `ChartCard`: title states the finding, subtitle = measure, unit, frequency, range;
  Wykres | Tabela toggle; table view via `toTable` + `TableView`; legend for 2+ series; source line.
- Neutral deltas (arrow + ink text), never green/red for good/bad. Symbols get spoken forms (`Sr`, fmtChange).
- Keyboard: everything reachable, visible focus ring (zt.css handles `:focus-visible`; never `outline:none`
  without `label:focus-within`), real `<button>`/`<a>`/`<input>` + labels, `aria-pressed` on toggles,
  `aria-current="page"` for current nav, disclosure = button with aria-expanded/controls.
- One h1 per page (PageHeader), headings in order (h2 sections, h3 cards).
- Responsive: no horizontal page scroll at 1280/1024/768/390; controls 44px below 768px; chart text ≥ 11px on
  screen at every width; wide tables scroll inside `.zt-table-wrap` with `tabIndex=0 role=region aria-label`.
- Polish copy first, English second (`lang === "pl" ? … : …`); decimal comma via format.ts; sentence case.
- Sample data is labelled ("Dane przykładowe") where the shell doesn't already show it.
- No new npm dependencies.

## Engineering rules
- Work ONLY in your worktree and ONLY in the files/folders your task owns (listed in your task). If you need a
  change elsewhere (shared blocks, shell, data layer), do not make it: describe it in your final report.
- Own CSS goes in your own file next to your components (e.g. `tpl/pages/explore.css`) imported by your
  component; reuse `zt-*`/`t-*` classes first.
- Tests: vitest unit tests for logic you add (`*.test.ts(x)` next to the file). Keep `bun run check`,
  `bun run lint`, `bun run test` and `npx prettier --check .` green in your worktree before you finish.
- Look at your work: build with `cd apps/portal && VITE_DATA_MODE=dummy npx vite build`, serve
  `npx vite preview --port <your port> --strictPort`, screenshot with Playwright (global install:
  `NODE_PATH=$(npm root -g) node script.cjs`; Chromium is pre-installed, do NOT run playwright install) at 1440
  and 390 px, look at the screenshots and fix what you see. Run axe if useful (`npm root -g`/@axe-core is not
  global; the repo has `@axe-core/playwright` in node_modules: use it from the repo root).
- Commit in your worktree branch with messages ending:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01HeAqK4mAC37Jigyx4d2cAK`. Do NOT push, merge or deploy.
- Never print secrets. Never work around a permission refusal; report it.

## Final report (under 250 words)
What you built (files), how to see it (routes), test results, anything you could not do, and exact change
requests for files you do not own.
