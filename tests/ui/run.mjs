// UI checks for the zohelo design template pages (docs/design-template.md, "Definition of done").
// For every page in tests/ui/pages.json:
//   1. axe-core (WCAG 2.0/2.1/2.2 A + AA and best practice) at 1440, 768 and 390 px: 0 violations.
//   2. Focus ring: Tab through the page; every stop must show a visible ring (outline, or the
//      label:focus-within ring of a search field) and no aria-disabled element may take focus.
//   3. Widths: 1280, 1024, 768 and 390 px with no horizontal page scroll and chart text >= 11px
//      on screen (documentation boards drawn at a fixed 1440px set "fixedWidth").
//   4. Screenshots at 1440 and 390 px into tests/ui/out/ for the eyes-on review.
// Pages are static files ("file") or routes of the built portal ("route"): for routes the runner serves
// apps/portal/dist (build it first with VITE_DATA_MODE=dummy) with an SPA fallback on a local port.
// Exit code 1 on any failure. Usage: bun run test:ui [page …]
/* global console, process, document, getComputedStyle, window, URL */
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const config = JSON.parse(readFileSync(join(here, "pages.json"), "utf8"));
const only = process.argv.slice(2);
const pages = config.pages.filter((p) => only.length === 0 || only.includes(p.name));
const out = join(here, "out");
mkdirSync(out, { recursive: true });

const dist = join(root, "apps/portal/dist");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".json": "application/json",
};
let base = null;
if (pages.some((p) => p.route)) {
  if (!existsSync(join(dist, "index.html"))) throw new Error("apps/portal/dist missing: run `VITE_DATA_MODE=dummy bun run build` first");
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = join(dist, path);
    if (!file.startsWith(dist) || !existsSync(file) || path.endsWith("/")) file = join(dist, "index.html");
    const ext = file.slice(file.lastIndexOf("."));
    res.writeHead(200, { "content-type": TYPES[ext] ?? "application/octet-stream" }).end(readFileSync(file));
  });
  await new Promise((ok) => server.listen(0, ok));
  base = `http://localhost:${server.address().port}`;
  process.on("exit", () => server.close());
}

const failures = [];
const fail = (page, check, detail) => failures.push(`${page} · ${check}: ${detail}`);

async function open(browser, page, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const tab = await ctx.newPage();
  await tab.goto(page.route ? base + page.route : "file://" + join(root, page.file), { waitUntil: page.route ? "networkidle" : "load" });
  if (page.ready) await tab.waitForSelector(page.ready, { timeout: 15000 });
  await tab.waitForTimeout(300);
  return { ctx, tab };
}

// CHROMIUM_PATH lets a machine with a pre-installed Chromium skip "playwright install".
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const page of pages) {
  // 1. axe-core
  for (const width of [1440, 768, 390]) {
    const { ctx, tab } = await open(browser, page, width);
    const result = await new AxeBuilder({ page: tab })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    for (const v of result.violations) fail(page.name, `axe@${width}`, `${v.id} (${v.nodes.length}): ${v.nodes[0].target.join(" ")}`);
    if (width === 1440 || width === 390) await tab.screenshot({ path: join(out, `${page.name}-${width}.png`), fullPage: true });
    await ctx.close();
  }

  // 2. Focus ring on every tab stop (desktop)
  {
    const { ctx, tab } = await open(browser, page, 1440);
    const seen = new Set();
    for (let i = 0; i < (page.maxTabs ?? 120); i++) {
      await tab.keyboard.press("Tab");
      const stop = await tab.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const ownRing = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2;
        const label = el.closest("label");
        const labelRing =
          !!label && getComputedStyle(label).outlineStyle !== "none" && parseFloat(getComputedStyle(label).outlineWidth) >= 2;
        const r = el.getBoundingClientRect();
        const onScreen = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
        const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || el.tagName)
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 40);
        const path = el.tagName + "#" + Array.prototype.indexOf.call(document.querySelectorAll("*"), el);
        return { name, path, ring: ownRing || labelRing, onScreen, disabled: el.getAttribute("aria-disabled") === "true" };
      });
      if (!stop || seen.has(stop.path)) break; // wrapped around to the start
      seen.add(stop.path);
      if (!stop.ring) fail(page.name, "focus", `no visible ring on "${stop.name}"`);
      if (!stop.onScreen) fail(page.name, "focus", `"${stop.name}" takes focus but is not on screen`);
      if (stop.disabled) fail(page.name, "focus", `aria-disabled "${stop.name}" is a tab stop`);
    }
    if (seen.size === 0 && !page.noInteractive) fail(page.name, "focus", "nothing on the page takes keyboard focus");
    await ctx.close();
  }

  // 3. Widths
  for (const width of [1280, 1024, 768, 390]) {
    const { ctx, tab } = await open(browser, page, width);
    const { sw, cw, minText } = await tab.evaluate(() => {
      // Smallest chart text as rendered on screen (font size × SVG scale), visible text only.
      let minText = Infinity;
      document.querySelectorAll("svg text").forEach((t) => {
        const r = t.getBoundingClientRect();
        const svg = t.ownerSVGElement;
        const vb = svg && svg.viewBox && svg.viewBox.baseVal;
        if (!r.width || !r.height || !vb || !vb.width) return;
        const px = parseFloat(getComputedStyle(t).fontSize) * (svg.getBoundingClientRect().width / vb.width);
        minText = Math.min(minText, px);
      });
      return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, minText };
    });
    if (!page.fixedWidth && sw > cw) fail(page.name, `width@${width}`, `page scrolls sideways (${sw}px content in ${cw}px)`);
    if (!page.fixedWidth && minText < (page.minChartText ?? 10.9))
      fail(page.name, `width@${width}`, `chart text ${minText.toFixed(1)}px on screen (minimum 11px)`);
    await ctx.close();
  }
  console.log(`checked ${page.name}`);
}
await browser.close();

if (failures.length) {
  console.log(`\n${failures.length} failure(s):\n` + failures.map((f) => "  ✘ " + f).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`\nAll UI checks passed for ${pages.length} page(s). Screenshots: tests/ui/out/ (look at them).`);
}

process.exit(process.exitCode ?? 0);
