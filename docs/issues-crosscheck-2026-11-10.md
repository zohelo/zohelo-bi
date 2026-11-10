# Open issues cross-check, all three repositories (2026-11-10)

Read-only review: nothing was closed or edited. Counts are from the GitHub API on 2026-11-10. Verdicts follow the
audit of the same date (`docs/audit-2026-11-10.md`) and the owner's direction of 2026-11-09
(`docs/product-principles.md`). The backlog was built on 27 October for a plan that the design template has since
overtaken, so a large part of it describes work that is done differently, done already, or no longer the next step.

| Repository | Open issues | Open PRs | Still needed as written | Superseded or done | Park for a later phase |
|---|---|---|---|---|---|
| zohelo-data | 729 | 6 | about 45 | about 15 | about 645 (583 of them generated source onboarding); about 25 small items not classified one by one |
| zohelo-bi | 66 | 6 | 19 | 37 | 10 |
| zohelo (zohelo.com) | 101 | 8 | 22 | 37 | 42 |

## One decision changes most verdicts

The 27 October plan split the products as "zohelo.com tells, zohelo-bi shows". The template now does both: its home
page, "Co nowego", "Polska w skrócie" and the release calendar are the "tells" part. Two front ends for one owner
is not sustainable. **Recommended: the template becomes the one portal; zohelo.com becomes its public address (or a
thin landing page with about, legal and contact).** The verdicts below assume this; if zohelo.com stays a separate
site, the items marked † stay open.

## zohelo-bi (66 issues, 6 PRs)

| Verdict | Issues | Why |
|---|---|---|
| **Close: refers to the old portal on `main`** (18 issues, 5 PRs) | #349–#356 accessibility baseline; #336, #331–#333; #320, #321, #323, #325, #335; #357; PRs #342, #343, #346, #347, #348 | The pages they fix (`/kpi/inflation`, `/d/poland-overview`, the old explorer) are replaced by the template, which passes axe with 0 violations and has Polish formats throughout. Close when the template merges. |
| **Close: done in the template, on sample data** (14) | #30, #31, #63, #64, #65 explorer and visuals; #29, #58, #59, #60 dashboards (format v3, 13 dashboards); #26, #27, #51, #53, #54 catalogue, indicator page, links | Built and tested. What remains is real data, tracked by the source-release issues below, not by these. |
| **Rewrite: direction reversed** (5) | #32, #66, #67, #214, #215 adopt `@zohelo/design` | The template has its own tokens and components (`packages/design-template`). The design system now flows from the template to the other products. Replace with one issue: "design-template is the shared design system". |
| **Keep: still needed** (19) | #70, #94 protect `main`; #33 hardening; #79, #80 independent review and fixes (apply to the template merge); #34, #39, #76 published-layer loader and generated manifest; #345 contract fixtures (becomes contract v2); #40–#44 source releases (Eurostat, WDI, NBP, GUS BDL, GUS DBW); #36 security audit before opening; #20, #21, #22, #24 area containers | This is the path to real data and to a safe merge. |
| **Park: phase 2** (10) | #23, #25, #45, #49 public API and open read routes; #47, #48 compare sources, large cuts; #28, #55, #56, #57 portfolio on demo data | Not before one real slice is live. |
| Routine | PR #358 (Dependabot) | Merge after checks. |

## zohelo, the public site (101 issues, 8 PRs)

| Verdict | Issues | Why |
|---|---|---|
| **Merge now: wrong claims on a live public page** (6 issues, 6 PRs) | #405, #410, #411, #412, #413, #414; PRs #408, #423, #450, #455, #460, #462 | The site is public today and these fix what it says (for example #412: a Eurostat chart credited to the World Bank). The PRs have been open since 2–3 November. |
| **Keep: needed before anything is public** (16) | #34, #80, #81, #132 legal pages and no false claims; #76, #120 protect `main`, delete the Finnhub secret; #106, #112, #129, #131 owner actions (logo, analytics, contact, imprint); #42–#46 source releases †; #461 fixtures (becomes contract v2) | Small, and none depends on the design. |
| **Close: superseded by the template** † (37) | #435–#445, #457, #458 accessibility baseline of the old pages; #448; #346–#350, #398, #416 design process and critique (the direction was chosen in the template); #25, #55, #56, #58, #59, #93, #105, #107, #111, #140 design system v1 and shell; #28, #29, #30, #64, #68, #69 chart of the day, feed, indicators, home | The template already has these as "Co nowego", the release calendar, indicator pages and its own shell. One implementation, not two. |
| **Park: discovery and growth** (42) | #227, #228, #230, #268 journal; #270, #273, #274 research; #282–#284 products; #363–#365 growth; #21, #31, #70–#72 newsletter; #23, #48, #49 calendar page; #95 sharing cards; #24, #50, #51, #418–#420, #422 data and sources pages †; #37, #38, #87, #90, #134 about and portfolio; #19, #20, #22, #26, #33, #39, #52, #60 containers, analytics and site rebuild | The briefs stay as documents. No new product before the first one has real data and real users. |
| Routine | PRs #466, #467 (Dependabot) | Merge after checks. |

## zohelo-data (729 issues, 6 PRs)

| Verdict | Issues | Why |
|---|---|---|
| **Fix first: operations** (3) | #894 NBP; #2233 scheduler; #2553 World Bank WDI | NBP has failed at `silver_gold.build` since 2026-11-09 and the alert step failed with it; the scheduler still fails intermittently (three times on 8–9 November). Check WDI after the run in progress. |
| **Close: alerts whose pipelines are green again** (3) | #925 GUS BDL, #926 Eurostat, #1723 MF white list | Last runs succeeded on 9–10 November. |
| **Keep, top priority: the path to real data** (about 30) | #2567 HICP stops at 2025-12; #2509 metrics aggregate across sources, units and levels; #1084, #1130, #1131 published layer and contract tests; #1071, #1099, #1100, #1101, #1202 catalogue and 40 KPIs; #2513, #2515–#2517 and PR #2527 publishing KPIs; #1087, #1200, #1201, #1598, #2294 Gold v1; #1072 generated manifest; #1097, #1096, #1070 release calendar and release-aware schedules; #1076, #1109, #1110, #2217, #2219 data quality; #2556 unit symbols; #2546, #2115, #2512, #2523 ingestion defects; #316–#320 the five KPI source epics | These decide when the template can show real numbers. #2509 and #1097 are exactly two of the gaps the audit found in the live provider. |
| **Keep: hygiene** (about 12) | #1078, #1117, #1566 repository rules; #1079, #1119 status page; #1080, #1121 usage report; #2552, #2564 accessibility runner; #2545 backlog sync; #2445 owner desk; #321–#325 reference source epics | Small and independent. |
| **Close: superseded** (about 12) | #2550 and PR #2566 chart-rendering ADR (the template draws every chart with its own SVG engine; vega is gone); #2448 shared front-end foundation, #2558, #2560 UX programme (decided in the template; rewrite as one issue: "data portal adopts design-template"); #2568, #2569 sprint issues; #2073–#2075 team log, product inbox, weekly status | The sprint process stopped on 3 November; its standing issues are stale. |
| **Park: later phases** (about 60) | #1063, #1081, #1082, #1122–#1125 data-portal pages; #1085, #1195, #1196, #1058 demo warehouse; #1086, #1197, #1198 entity and event models; #2528, #2534, #2537, #2538, #2540–#2542, #2544 and PR #2530 domain and role skills; #2285, #2499 review process; #2565 C4 views; the 18 area containers | Useful, not now. The domain knowledge already lives in the dashboard files of the template. |
| **Hide: generated onboarding of sources not started** (583) | 338 labelled `stage:1-review`, 111 `stage:2-development` (among them 109 "Record public reuse terms…" and 29 "Write the Landing extractor…"), and 134 source epics | Phase 3 work (2027). They are generated from the register, so closing by hand would be undone by the next sync. Change the generator to create stage issues only for sources in the current phase; it then closes these itself. |
| Routine | PRs #2570–#2572 (Dependabot) | Merge after checks. |

## What the backlog should look like after the clean-up

About 100 open issues across the three repositories instead of 896: the real-data path (about 45), the template
merge and hardening (about 20), legal and owner actions (about 15), and containers. Everything else is parked
behind a phase label or regenerated when its phase starts.

Nothing here is executed. Closing roughly 90 issues and 6 pull requests, merging 6, and changing the generator rule, need
the owner's decision.
