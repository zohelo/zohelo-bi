// bi.zohelo.com pages for the accessibility check (ops/a11y.mjs, zohelo-data#2499). The portal reads
// its data from /api, so CI scans `wrangler pages dev` with the read token (ops/a11y.sh, --origin);
// without --origin the runner serves apps/portal/dist alone (SPA fallback, /api answered 503), where
// every page reports its data error: use that only to debug the runner.
// A page is scanned only when its <h1> is shown and no error (role="alert", not-found page) is on it.
const routes = ["/", "/explore", "/catalogue", "/kpi/inflation", "/d/poland-overview", "/d/labour-market", "/d/regional-comparison"];
const notFound = ["Nie znaleziono strony", "Page not found"];

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
