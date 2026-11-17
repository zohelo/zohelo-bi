// Power BI template of the zohelo design template: report theme and page backgrounds, generated from
// tokens.json so a token change reaches Power BI with one run. Usage (repository root):
//   node packages/design-template/powerbi/build.mjs
// Writes zohelo.theme.json, layouts.json and backgrounds/*.svg + *.png (PNG through Playwright's Chromium).
// Layout = the app shell of docs/02-page-layout.md and the dashboard grid of docs/03-dashboard.md, scaled to the
// Power BI page of 1280 x 720.
import console from "node:console";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(here, "..", "tokens.json"), "utf8"));

const colours = Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t.value]));
const colour = (name) => {
  const value = colours[name];
  if (!value) throw new Error(`unknown colour token ${name}`);
  return value.startsWith("{") ? colour(value.slice(1, -1)) : value.toUpperCase();
};
const px = (group, name) => Number.parseFloat(tokens[group].tokens.find((t) => t.name === name).value);
const style = Object.fromEntries(tokens.type.groups.flatMap((g) => g.styles).map((s) => [s.name, s]));
// Power BI sizes text in points; the tokens are CSS pixels (1 px = 0.75 pt).
const pt = (name) => Math.round(Number.parseFloat(style[name].fontSize) * 0.75 * 2) / 2;

// Inter is not among the Power BI service fonts, so text uses Segoe UI, the closest neutral sans that renders the
// same in Desktop, the service and exported PDFs. Weights follow the tokens: 600-700 -> Semibold, 400-500 -> regular.
const FONT = "'Segoe UI', wf_segoe-ui_normal, helvetica, arial, sans-serif";
const FONT_SEMIBOLD = "'Segoe UI Semibold', wf_segoe-ui_semibold, helvetica, arial, sans-serif";
const solid = (name) => ({ solid: { color: colour(name) } });

const RADIUS = px("radius", "radius-xl"); // cards and panels
const theme = {
  $schema:
    "https://raw.githubusercontent.com/microsoft/powerbi-desktop-samples/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.159.json",
  name: "zohelo",
  // Identity colours in fixed order (series-1 is the hero), then context and the ramp ends; never accent.
  dataColors: ["series-1", "series-2", "series-3", "series-4", "series-5", "series-context", "seq-5", "seq-1", "series-reference"].map(
    colour,
  ),
  foreground: colour("ink"),
  foregroundNeutralSecondary: colour("ink-3"),
  foregroundNeutralTertiary: colour("ink-muted"),
  background: colour("surface"),
  backgroundLight: colour("surface-sunken"),
  backgroundNeutral: colour("line"),
  tableAccent: colour("accent"),
  good: colour("change-good-fg"),
  neutral: colour("series-context"),
  bad: colour("change-bad-fg"),
  // Diverging scale: below / at / above the reference (docs/04-chart-library.md, colour by job).
  minimum: colour("div-negative"),
  center: colour("div-mid"),
  maximum: colour("div-positive"),
  null: colour("ink-disabled"),
  hyperlink: colour("accent"),
  visitedHyperlink: colour("accent-strong"),
  textClasses: {
    callout: { fontSize: pt("kpi-value"), fontFace: FONT_SEMIBOLD, color: colour("ink") },
    title: { fontSize: pt("card-title"), fontFace: FONT_SEMIBOLD, color: colour("ink") },
    header: { fontSize: pt("body"), fontFace: FONT_SEMIBOLD, color: colour("ink") },
    label: { fontSize: pt("caption"), fontFace: FONT, color: colour("ink-2") },
  },
  visualStyles: {
    "*": {
      "*": {
        // Every visual is a chart card: surface, 1 px line border, radius-xl, no shadow, 14/16 px padding.
        background: [{ show: true, color: solid("surface"), transparency: 0 }],
        border: [{ show: true, color: solid("line"), width: 1, radius: RADIUS }],
        dropShadow: [{ show: false }],
        padding: [{ top: 12, bottom: 12, left: 14, right: 14 }],
        // Title states the finding; subtitle states measure, unit, frequency and range.
        title: [
          {
            show: true,
            fontColor: solid("ink"),
            fontFamily: FONT_SEMIBOLD,
            fontSize: pt("card-title"),
            alignment: "left",
            titleWrap: true,
          },
        ],
        subTitle: [{ show: true, fontColor: solid("ink-3"), fontFamily: FONT, fontSize: pt("caption") }],
        divider: [{ show: false }],
        visualHeader: [{ show: true, foreground: solid("ink-3"), background: solid("surface"), transparency: 0 }],
        visualTooltip: [
          {
            show: true,
            background: solid("surface-inverse"),
            titleFontColor: solid("on-inverse"),
            valueFontColor: solid("on-inverse"),
            fontFamily: FONT,
            fontSize: pt("caption"),
          },
        ],
        categoryAxis: [
          {
            labelColor: solid("ink-muted"),
            fontFamily: FONT,
            fontSize: pt("chart-text"),
            showAxisTitle: false,
            gridlineShow: false,
          },
        ],
        valueAxis: [
          {
            labelColor: solid("ink-muted"),
            fontFamily: FONT,
            fontSize: pt("chart-text"),
            showAxisTitle: false,
            gridlineShow: true,
            gridlineColor: solid("grid"),
            gridlineThickness: 1,
            gridlineStyle: "solid",
          },
        ],
        legend: [
          {
            show: true,
            position: "Bottom", // "Bottom left" in Power BI: the legend sits under the chart
            labelColor: solid("ink-2"),
            fontFamily: FONT,
            fontSize: pt("caption"),
            showTitle: false,
          },
        ],
        labels: [{ color: solid("ink-2"), fontFamily: FONT, fontSize: pt("chart-text") }],
      },
    },
    page: {
      "*": {
        background: [{ color: solid("canvas"), transparency: 0 }],
        outspace: [{ color: solid("canvas"), transparency: 0 }],
      },
    },
    // Text and navigation sit on the shell, not in cards.
    textbox: { "*": { background: [{ show: false }], border: [{ show: false }], title: [{ show: false }] } },
    image: { "*": { background: [{ show: false }], border: [{ show: false }], title: [{ show: false }] } },
    shape: { "*": { background: [{ show: false }], border: [{ show: false }], title: [{ show: false }] } },
    actionButton: { "*": { background: [{ show: false }], border: [{ show: false }], title: [{ show: false }] } },
    pageNavigator: {
      "*": {
        background: [{ show: false }],
        border: [{ show: false }],
        title: [{ show: false }],
        padding: [{ top: 0, bottom: 0, left: 0, right: 0 }],
      },
    },
    // KPI tile: value in kpi-value, label above it in caption, no coloured change.
    cardVisual: { "*": { title: [{ show: false }] } },
    card: {
      "*": {
        title: [{ show: false }],
        labels: [{ color: solid("ink"), fontFamily: FONT_SEMIBOLD, fontSize: pt("kpi-value") }],
        categoryLabels: [{ show: true, color: solid("ink-3"), fontFamily: FONT, fontSize: pt("caption") }],
      },
    },
    tableEx: {
      "*": {
        grid: [
          {
            gridVertical: false,
            gridHorizontal: true,
            gridHorizontalColor: solid("line-subtle"),
            outlineColor: solid("line"),
            rowPadding: 4,
          },
        ],
        columnHeaders: [
          {
            fontColor: solid("ink"),
            backColor: solid("surface-sunken"),
            fontFamily: FONT_SEMIBOLD,
            fontSize: pt("caption"),
          },
        ],
        values: [
          {
            fontColorPrimary: solid("ink-2"),
            backColorPrimary: solid("surface"),
            fontColorSecondary: solid("ink-2"),
            backColorSecondary: solid("surface"),
            fontFamily: FONT,
            fontSize: pt("small"),
          },
        ],
        total: [{ fontColor: solid("ink"), backColor: solid("surface-sunken"), fontFamily: FONT_SEMIBOLD }],
      },
    },
    pivotTable: {
      "*": {
        grid: [
          {
            gridVertical: false,
            gridHorizontal: true,
            gridHorizontalColor: solid("line-subtle"),
            outlineColor: solid("line"),
            rowPadding: 4,
          },
        ],
        columnHeaders: [
          {
            fontColor: solid("ink"),
            backColor: solid("surface-sunken"),
            fontFamily: FONT_SEMIBOLD,
            fontSize: pt("caption"),
          },
        ],
        rowHeaders: [{ fontColor: solid("ink"), backColor: solid("surface"), fontFamily: FONT, fontSize: pt("small") }],
        values: [
          {
            fontColorPrimary: solid("ink-2"),
            backColorPrimary: solid("surface"),
            fontColorSecondary: solid("ink-2"),
            backColorSecondary: solid("surface"),
            fontFamily: FONT,
            fontSize: pt("small"),
          },
        ],
        subTotals: [{ fontColor: solid("ink"), backColor: solid("surface-sunken"), fontFamily: FONT_SEMIBOLD }],
      },
    },
    slicer: {
      "*": {
        header: [{ fontColor: solid("ink-3"), fontFamily: FONT_SEMIBOLD, textSize: pt("caption") }],
        items: [{ fontColor: solid("ink"), background: solid("surface"), fontFamily: FONT, textSize: pt("small") }],
      },
    },
  },
};

// --- page backgrounds -----------------------------------------------------------------------------------------
const W = 1280;
const H = 720;
const SIDEBAR = 208; // sidebar-w 256 px at the 1440 px reference, scaled to the 1280 px page
const TOP = 48; // header-h 60 px, scaled
const FOOT = 28; // foot-h 48 px of the portal; one line of source text
const GUTTER = 16;
const GAP = 12; // dashboard density: grid gap 12 px
const X0 = SIDEBAR + GUTTER;
const X1 = W - GUTTER;
const COL = (X1 - X0 - 11 * GAP) / 12; // 12-column grid
const span = (from, cols) => ({ x: X0 + from * (COL + GAP), w: cols * COL + (cols - 1) * GAP });
const round = (n) => Math.round(n * 10) / 10;
const slot = (name, from, cols, y, h) => {
  const s = span(from, cols);
  return { name, x: round(s.x), y, w: round(s.w), h };
};

const HEADER_Y = TOP + 12; // page title + one-sentence finding (text boxes on the canvas, no card)
const BODY_Y = HEADER_Y + 44;
const BOTTOM = H - FOOT - 8;
const layouts = {
  dashboard: {
    purpose: "Domain or topic overview: KPI row, main trend 8 + companion 4, two breakdown cards 6 + 6.",
    slots: [
      ...[0, 3, 6, 9].map((c, i) => slot(`kpi-${i + 1}`, c, 3, BODY_Y, 84)),
      slot("main-trend", 0, 8, BODY_Y + 96, 232),
      slot("companion", 8, 4, BODY_Y + 96, 232),
      slot("breakdown-1", 0, 6, BODY_Y + 340, BOTTOM - (BODY_Y + 340)),
      slot("breakdown-2", 6, 6, BODY_Y + 340, BOTTOM - (BODY_Y + 340)),
    ],
  },
  analysis: {
    purpose: "One question answered by one large chart, with a side panel for the ranking or the drivers.",
    slots: [
      slot("filters", 0, 12, BODY_Y, 40),
      slot("main-chart", 0, 9, BODY_Y + 52, BOTTOM - (BODY_Y + 52)),
      slot("side-panel", 9, 3, BODY_Y + 52, BOTTOM - (BODY_Y + 52)),
    ],
  },
  detail: {
    purpose: "Detail after summary: a filter row and one full-width table or matrix.",
    slots: [slot("filters", 0, 12, BODY_Y, 40), slot("table", 0, 12, BODY_Y + 52, BOTTOM - (BODY_Y + 52))],
  },
};
const SHELL = {
  page: { w: W, h: H },
  sidebar: { x: 0, y: 0, w: SIDEBAR, h: H, brand: { x: 16, y: 12, w: SIDEBAR - 32, h: 32 } },
  navigation: { x: 12, y: 64, w: SIDEBAR - 24, h: H - 64 - FOOT - 16 },
  topbar: { x: SIDEBAR, y: 0, w: W - SIDEBAR, h: TOP },
  header: { x: X0, y: HEADER_Y, w: X1 - X0, h: 40 },
  footer: { x: SIDEBAR, y: H - FOOT, w: W - SIDEBAR, h: FOOT },
  grid: { columns: 12, column: round(COL), gap: GAP, x0: X0, x1: X1 },
};

const rect = (x, y, w, h, fill, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`;
function shellSvg(slots = []) {
  const line = colour("line");
  const parts = [
    rect(0, 0, W, H, colour("canvas")),
    // sidebar: surface with a right border; the brand row and the page navigator sit on it
    rect(0, 0, SIDEBAR, H, colour("surface")),
    rect(SIDEBAR - 1, 0, 1, H, line),
    rect(0, H - FOOT, SIDEBAR, 1, line),
    // top bar and footer: surface with a border towards the canvas
    rect(SIDEBAR, 0, W - SIDEBAR, TOP, colour("surface")),
    rect(SIDEBAR, TOP - 1, W - SIDEBAR, 1, line),
    rect(SIDEBAR, H - FOOT, W - SIDEBAR, FOOT, colour("surface")),
    rect(SIDEBAR, H - FOOT, W - SIDEBAR, 1, line),
    ...slots.map((s) => rect(s.x, s.y, s.w, s.h, colour("surface"), ` rx="${RADIUS}" stroke="${line}" stroke-width="1"`)),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>\n`;
}
function tooltipSvg() {
  const w = 320;
  const h = 240;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${rect(0, 0, w, h, colour("surface"))}${rect(0.5, 0.5, w - 1, h - 1, "none", ` rx="${px("radius", "radius-lg")}" stroke="${colour("line")}"`)}</svg>\n`;
}

const out = join(here, "backgrounds");
mkdirSync(out, { recursive: true });
const svgs = {
  shell: shellSvg(),
  ...Object.fromEntries(Object.entries(layouts).map(([name, l]) => [`layout-${name}`, shellSvg(l.slots)])),
  tooltip: tooltipSvg(),
};
for (const [name, svg] of Object.entries(svgs)) writeFileSync(join(out, `${name}.svg`), svg);
writeFileSync(join(here, "zohelo.theme.json"), JSON.stringify(theme, null, 2) + "\n");
writeFileSync(
  join(here, "layouts.json"),
  JSON.stringify({ unit: "px on a 1280 x 720 Power BI page", shell: SHELL, layouts }, null, 2) + "\n",
);

// PNG copies: Power BI page backgrounds take raster images.
const { chromium } = await import("playwright");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [name, svg] of Object.entries(svgs)) {
  const size = name === "tooltip" ? { width: 320, height: 240 } : { width: W, height: H };
  await page.setViewportSize(size);
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await page.screenshot({ path: join(out, `${name}.png`), clip: { x: 0, y: 0, ...size } });
}
await browser.close();
console.log(`wrote zohelo.theme.json, layouts.json and ${Object.keys(svgs).length} backgrounds`);
