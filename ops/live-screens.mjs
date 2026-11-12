// Screenshots of the portal on live data (ops/live-screens.sh in CI; locally against any origin that serves the
// portal and /api/published/v2/…). Reads catalog.json from the origin as the portal does, picks the indicator page
// (--kpi, else the first draft KPI so the "wersja robocza" badge shows, else the first KPI), and saves the home page
// and that page at 1440 px (device scale 1, full page) plus summary.json: KPI and draft counts, whether EUR/PLN is
// published, and every same-origin request that failed. Exits 1 when a page shows sample data or does not load.
//
//   node ops/live-screens.mjs --origin http://localhost:8790 [--out live-screens] [--kpi gdp_real_growth]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import console from "node:console";
import process from "node:process";
import { URL } from "node:url";

import { chromium } from "playwright";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const origin = opt("--origin", "http://localhost:8790").replace(/\/+$/, "");
const out = opt("--out", "live-screens");
mkdirSync(out, { recursive: true });

const catalogResponse = await globalThis.fetch(`${origin}/api/published/v2/catalog`);
if (!catalogResponse.ok) {
  console.error(`catalog.json: HTTP ${catalogResponse.status} from ${origin}/api/published/v2/catalog: ${await catalogResponse.text()}`);
  for (const rel of ["v2/latest", "v2/calendar", "v2/kpi/gdp_real_growth/series", "catalog"]) {
    const r = await globalThis.fetch(`${origin}/api/published/${rel}`);
    console.error(`/api/published/${rel}: HTTP ${r.status}${r.ok ? "" : ` ${await r.text()}`}`);
  }
  process.exit(1);
}
const catalog = await catalogResponse.json();
const kpis = catalog.kpis ?? [];
const drafts = kpis.filter((k) => k.status === "draft");
const kpi = opt("--kpi", "") || (drafts[0] ?? kpis[0])?.kpi_key;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const failed = [];
const problems = [];
const errors = [];
page.on("response", (r) => {
  const u = new URL(r.url());
  if (u.origin === origin && r.status() >= 400) failed.push(`${r.status()} ${u.pathname}`);
});
page.on("pageerror", (e) => errors.push(String(e)));
// API timing, to tell a slow published layer from a page that never settles.
const started = new Map();
const timings = [];
page.on("request", (r) => {
  const u = new URL(r.url());
  if (u.origin === origin && u.pathname.startsWith("/api/")) started.set(r, Date.now());
});
const finish = (r) => {
  const t = started.get(r);
  if (t === undefined) return;
  started.delete(r);
  timings.push({ path: new URL(r.url()).pathname, ms: Date.now() - t });
};
page.on("requestfinished", finish);
page.on("requestfailed", finish);

const shots = [
  { name: "home-pl-1440.png", path: "/?lang=pl" },
  { name: `kpi-${kpi}-pl-1440.png`, path: `/kpi/${kpi}?lang=pl` },
];
for (const s of shots) {
  const t0 = Date.now();
  await page.goto(origin + s.path, { waitUntil: "load", timeout: 90_000 });
  await page.waitForLoadState("networkidle", { timeout: 90_000 }).catch(() => problems.push(`${s.path}: network not idle after 90 s`));
  console.log(
    `${s.path}: settled in ${Date.now() - t0} ms; API requests still open: ${[...started.keys()].map((r) => new URL(r.url()).pathname).join(", ") || "none"}`,
  );
  await page.locator("main h1").first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  // The shell is one window high (sticky sidebar and footer): grow the window to the content, then shoot it whole.
  const height = await page.evaluate(() =>
    Math.max(...[...globalThis.document.querySelectorAll("body, main, .t-main, .t-body")].map((e) => e.scrollHeight)),
  );
  await page.setViewportSize({ width: 1440, height: Math.min(Math.max(height + 120, 900), 8000) });
  await page.waitForTimeout(500);
  const text = await page.locator("body").innerText();
  if (/Dane przykładowe|wszystkie wartości są syntetyczne/.test(text)) problems.push(`${s.path}: shows sample data`);
  await page.screenshot({ path: join(out, s.name), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  console.log(`saved ${join(out, s.name)}`);
}
await browser.close();

const summary = {
  origin,
  generated_at: catalog.generated_at,
  kpis: kpis.length,
  drafts: drafts.length,
  published: kpis.length - drafts.length,
  eurpln_published: kpis.some((k) => k.kpi_key === "eurpln"),
  indicator_page: kpi,
  failed_requests: [...new Set(failed)],
  api_requests: timings.length,
  slowest_api: [...timings].sort((a, b) => b.ms - a.ms).slice(0, 10),
  page_errors: errors,
  problems,
};
writeFileSync(join(out, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
if (process.env.GITHUB_STEP_SUMMARY)
  writeFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### Live screenshots\n\n${summary.kpis} KPIs in catalog.json (${summary.drafts} draft, ${summary.published} published); EUR/PLN published: ${summary.eurpln_published}; indicator page: ${kpi}; failed requests: ${summary.failed_requests.join(", ") || "none"}\n`,
    { flag: "a" },
  );
if (problems.length || errors.length) process.exit(1);
