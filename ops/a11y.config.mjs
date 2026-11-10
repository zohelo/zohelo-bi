// bi.zohelo.com pages for the accessibility check (ops/a11y.mjs, zohelo-data#2499): the template's main routes.
// CI scans the build that production deploys (check.yml builds it in the same data mode as deploy.yml) served by
// `wrangler pages dev` with the read token (ops/a11y.sh, --origin); without --origin the runner serves
// apps/portal/dist alone (SPA fallback, /api answered 503), which is enough for a sample-data build.
// A page is scanned only when its <h1> is shown and no error (role="alert", not-found page) is on it.
// /kpi/inflation is an old-portal address: on sample data it is redirected to the sample indicator (tpl/legacy.ts).
const routes = ["/", "/d", "/d/poland", "/d/labour", "/explore", "/catalogue", "/kpi/inflation", "/analizy", "/przewodnik"];
const notFound = ["Nie ma takiej strony", "Page not found"];

export default {
  root: "apps/portal/dist",
  spa: true,
  api: "/api/",
  ready: "main h1",
  failText: notFound,
  failSelectors: ['[role="alert"]'],
  pages: [
    ...["pl", "en"].flatMap((lang) => routes.map((path) => ({ path: `${path}?lang=${lang}` }))),
    { path: "/d/a11y-missing?lang=pl", name: "not found (pl)", failText: [] },
    { path: "/d/a11y-missing?lang=en", name: "not found (en)", failText: [] },
  ],
};
