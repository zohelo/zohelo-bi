// bi.zohelo.com pages for the accessibility check (ops/a11y.mjs, zohelo-data#2499): the template's main routes.
// CI scans the build that production deploys (check.yml builds it in the same data mode as deploy.yml) served by
// `wrangler pages dev` with the read token (ops/a11y.sh, --origin); without --origin the runner serves
// apps/portal/dist alone (SPA fallback, /api answered 503), which is enough for a sample-data build.
// A page is scanned only when its <h1> is shown and no error (role="alert", not-found page) is on it.
// CI builds live (decision O37): /kpi/hicp_annual_rate is a v2 KPI (and a sample one). A published file that is
// not there (404 under /api/published/: topics before they are switched on, a KPI that is not in v2) is "no data"
// by design, not a failed load; other failures still show as role="alert" on the page.
const routes = ["/", "/d", "/d/poland", "/d/labour", "/explore", "/catalogue", "/kpi/hicp_annual_rate", "/analizy", "/przewodnik"];
const notFound = ["Nie ma takiej strony", "Page not found"];

export default {
  root: "apps/portal/dist",
  spa: true,
  api: "/api/",
  ignoreResponses: ["/api/published/"],
  ready: "main h1",
  failText: notFound,
  failSelectors: ['[role="alert"]'],
  pages: [
    ...["pl", "en"].flatMap((lang) => routes.map((path) => ({ path: `${path}?lang=${lang}` }))),
    { path: "/d/a11y-missing?lang=pl", name: "not found (pl)", failText: [] },
    { path: "/d/a11y-missing?lang=en", name: "not found (en)", failText: [] },
  ],
};
