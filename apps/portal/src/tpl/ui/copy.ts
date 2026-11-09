// Copy a chart out of the portal (design system: Chart card, Kopiuj). Forms:
//   image: the card as a PNG — title, subtitle, finding, the chart (every panel of small multiples, or a table),
//          legend and source (paste into email, Word, PowerPoint, chat);
//   vector: the same card as an SVG (copied where the browser allows it, else downloaded as a .svg file);
//   data: numbers as an HTML table plus tab-separated text (paste into Excel, Word, email), with the title,
//         subtitle and source as lines around the table, so the receiving tool gets a real table, not a picture.
// Charts are drawn with CSS custom properties, so each SVG is cloned with every computed paint and font property
// written inline. One layout plan serves both the PNG and the SVG.

export type CopyTable = { columns: string[]; rows: (string | number | null | undefined)[][] };

const STYLE_PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-opacity",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "visibility",
  "display",
];

function inlineStyles(source: Element, target: Element) {
  const cs = getComputedStyle(source);
  const style = STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(";");
  target.setAttribute("style", style);
  for (let i = 0; i < source.children.length; i++) inlineStyles(source.children[i]!, target.children[i]!);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Lines that travel with copied numbers: subtitle above the table, source and notes below; `comma` writes decimal
 * commas (Polish spreadsheets read "2.5" as a date or thousands).
 * `excel` is the form for pasting into a spreadsheet (docs/product-principles.md, need 1): the header row comes
 * first, so the paste is a table straight away; the title and the source follow under a blank row. `unit` is written
 * into the header of every numeric column.
 */
export type TableExtra = { sub?: string; foot?: string[]; comma?: boolean; excel?: boolean; unit?: string };

/** Columns whose every filled cell is a number. */
function numericColumns(t: CopyTable): boolean[] {
  return t.columns.map((_, i) => {
    const vals = t.rows.map((r) => r[i]).filter((v) => v !== null && v !== undefined && v !== "");
    return vals.length > 0 && vals.every((v) => typeof v === "number");
  });
}

/**
 * HTML table and tab-separated text of the chart's numbers.
 * In the HTML every number carries its plain value in Excel's `x:num` attribute, so a Polish Excel stores a number
 * whatever the decimal sign shown, and every text cell is marked as text (`mso-number-format:"\@"`), so a period such
 * as "2024-01" or "1.2024" is not turned into a date. The text form uses the decimal comma when `comma` is set.
 */
export function tableClipboard(caption: string, t: CopyTable, extra: TableExtra = {}): { html: string; text: string } {
  const cell = (v: string | number | null | undefined) =>
    v === null || v === undefined ? "" : typeof v === "number" && extra.comma ? String(v).replace(".", ",") : String(v);
  const numeric = numericColumns(t);
  const heads = t.columns.map((c, i) => (extra.unit && numeric[i] ? `${c} (${extra.unit})` : c));
  const td = (v: string | number | null | undefined) =>
    typeof v === "number"
      ? `<td x:num="${v}" align="right">${escapeHtml(cell(v))}</td>`
      : `<td style='mso-number-format:"\\@"'>${escapeHtml(cell(v))}</td>`;
  const foot = extra.foot ?? [];
  const table =
    `<table>${extra.excel ? "" : `<caption>${escapeHtml(caption)}</caption>`}<thead><tr>${heads.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>` +
    `<tbody>${t.rows.map((r) => `<tr>${r.map(td).join("")}</tr>`).join("")}</tbody></table>`;
  const lines = extra.excel ? [caption, ...(extra.sub ? [extra.sub] : []), ...foot] : foot;
  const body =
    (!extra.excel && extra.sub ? `<p>${escapeHtml(extra.sub)}</p>` : "") +
    table +
    (extra.excel && lines.length ? "<p>&nbsp;</p>" : "") +
    lines.map((f) => `<p>${escapeHtml(f)}</p>`).join("");
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${body}</body></html>`;
  const rows = [heads.join("\t"), ...t.rows.map((r) => r.map(cell).join("\t"))];
  const text = (
    extra.excel
      ? [...rows, ...(lines.length ? ["", ...lines] : [])]
      : [caption, ...(extra.sub ? [extra.sub] : []), ...rows, ...(foot.length ? ["", ...foot] : [])]
  ).join("\n");
  return { html, text };
}

export type LegendEntry = { label: string; color: string };

/** Legend entries as drawn in a card (label + swatch colour), for the copied image. */
export function legendFrom(root: Element | null): LegendEntry[] {
  return [...(root?.querySelectorAll(".zt-legend > span") ?? [])].map((el) => {
    const sw = el.querySelector("i");
    const cs = sw ? getComputedStyle(sw) : null;
    const bg = cs?.backgroundColor;
    const color = bg && bg !== "rgba(0, 0, 0, 0)" ? bg : (cs?.borderColor ?? "gray");
    return { label: el.textContent?.trim() ?? "", color };
  });
}

// ---------- layout plan (shared by PNG and SVG)

/** What a copied card says around its content. */
export type CardText = { title: string; sub?: string; finding?: string; source: string; legend?: LegendEntry[] };

type Op =
  | { k: "text"; x: number; y: number; text: string; size: number; weight: 400 | 600; color: string; anchor?: "start" | "end" }
  | { k: "rect"; x: number; y: number; w: number; h: number; color: string }
  | { k: "line"; x1: number; y1: number; x2: number; y2: number; color: string }
  | { k: "svg"; x: number; y: number; w: number; h: number; svg: string };
type Plan = { w: number; h: number; bg: string; font: string; ops: Op[] };

type Colors = { ink: string; ink2: string; ink3: string; line: string; surface: string; muted: string };

function colors(): Colors {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    ink: v("--ink", "black"),
    ink2: v("--ink-2", "dimgray"),
    ink3: v("--ink-3", "gray"),
    line: v("--line", "lightgray"),
    surface: v("--surface", "white"),
    muted: v("--surface-muted", "whitesmoke"),
  };
}

let measureCtx: CanvasRenderingContext2D | null = null;
function measurer(font: string) {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  return (text: string, size: number, weight: 400 | 600 = 400) => {
    if (!measureCtx) return text.length * size * 0.55;
    measureCtx.font = `${weight} ${size}px ${font}`;
    return measureCtx.measureText(text).width;
  };
}

/** Wrap text to lines no wider than `max` px. */
function wrapText(width: (t: string) => number, text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (width(next) > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** A standalone copy of a chart SVG with its computed styles inline. */
function serialise(svg: SVGSVGElement, w: number, h: number): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineStyles(svg, clone);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  clone.removeAttribute("tabindex");
  return new XMLSerializer().serializeToString(clone);
}

const PAD = 16;

/** Title, subtitle and finding at the top; returns the y where the content starts. */
function header(ops: Op[], t: CardText, w: number, width: ReturnType<typeof measurer>, c: Colors): number {
  let y = PAD;
  for (const l of wrapText((s) => width(s, 16, 600), t.title, w)) {
    ops.push({ k: "text", x: PAD, y: y + 16, text: l, size: 16, weight: 600, color: c.ink });
    y += 22;
  }
  if (t.sub)
    for (const l of wrapText((s) => width(s, 12), t.sub, w)) {
      ops.push({ k: "text", x: PAD, y: y + 13, text: l, size: 12, weight: 400, color: c.ink2 });
      y += 18;
    }
  if (t.finding)
    for (const l of wrapText((s) => width(s, 13), t.finding, w)) {
      ops.push({ k: "text", x: PAD, y: y + 15, text: l, size: 13, weight: 400, color: c.ink });
      y += 19;
    }
  return y + 8;
}

/** Legend rows and the source under the content; returns the total height. */
function footer(ops: Op[], t: CardText, w: number, top: number, width: ReturnType<typeof measurer>, c: Colors): number {
  let y = top + 8;
  let x = 0;
  const legend = t.legend ?? [];
  if (legend.length) {
    for (const e of legend) {
      const wItem = 14 + width(e.label, 12) + 16;
      if (x + wItem > w && x > 0) {
        x = 0;
        y += 18;
      }
      ops.push({ k: "rect", x: PAD + x, y: y + 2, w: 10, h: 10, color: e.color });
      ops.push({ k: "text", x: PAD + x + 14, y: y + 11, text: e.label, size: 12, weight: 400, color: c.ink });
      x += wItem;
    }
    y += 24;
  } else y += 6;
  for (const l of wrapText((s) => width(s, 11), t.source, w)) {
    ops.push({ k: "text", x: PAD, y: y + 11, text: l, size: 11, weight: 400, color: c.ink3 });
    y += 16;
  }
  return y + PAD;
}

/** The card of one or more charts: every `svg.zc-plot` under `root`, placed as on screen, with panel captions. */
export function chartPlan(root: Element, t: CardText, captionSel = ".xp-grid__title", only?: SVGSVGElement[]): Plan | null {
  const svgs = only ?? [...root.querySelectorAll<SVGSVGElement>("svg.zc-plot")];
  if (!svgs.length) return null;
  const font = getComputedStyle(document.body).fontFamily;
  const width = measurer(font);
  const c = colors();
  const rects = svgs.map((s) => s.getBoundingClientRect());
  const caps = [...root.querySelectorAll<HTMLElement>(captionSel)].map((el) => ({ el, r: el.getBoundingClientRect() }));
  const all = [...rects, ...caps.map((x) => x.r)];
  const left = Math.min(...all.map((r) => r.left));
  const topY = Math.min(...all.map((r) => r.top));
  const w = Math.max(320, Math.ceil(Math.max(...all.map((r) => r.right)) - left));
  const h = Math.ceil(Math.max(...all.map((r) => r.bottom)) - topY);
  const ops: Op[] = [];
  const top = header(ops, t, w, width, c);
  for (const { el, r } of caps)
    ops.push({
      k: "text",
      x: PAD + r.left - left,
      y: top + r.top - topY + 14,
      text: el.textContent?.trim() ?? "",
      size: 12,
      weight: 600,
      color: c.ink2,
    });
  svgs.forEach((s, i) => {
    const r = rects[i]!;
    const sw = Math.ceil(r.width);
    const sh = Math.ceil(r.height);
    ops.push({ k: "svg", x: PAD + r.left - left, y: top + r.top - topY, w: sw, h: sh, svg: serialise(s, sw, sh) });
  });
  const height = footer(ops, t, w, top + h, width, c);
  return { w: w + PAD * 2, h: height, bg: c.surface, font, ops };
}

/** A table drawn as a card (matrix, pivot): header row, right-aligned numbers, at most `maxRows` rows. */
export function tablePlan(t: CardText, table: { columns: string[]; rows: string[][]; numeric: boolean[] }, maxRows = 60): Plan {
  const font = getComputedStyle(document.body).fontFamily;
  const width = measurer(font);
  const c = colors();
  const fit = (s: string, max: number, weight: 400 | 600) => {
    if (width(s, 12, weight) <= max) return s;
    let x = s;
    while (x.length > 1 && width(`${x}…`, 12, weight) > max) x = x.slice(0, -1);
    return `${x}…`;
  };
  const rows = table.rows.slice(0, maxRows);
  const colW = table.columns.map((h, j) =>
    Math.min(260, Math.ceil(Math.max(width(h, 12, 600), ...rows.map((r) => width(r[j] ?? "", 12))) + 16)),
  );
  const w = Math.max(
    320,
    colW.reduce((a, b) => a + b, 0),
  );
  const ops: Op[] = [];
  const top = header(ops, { ...t, legend: [] }, w, width, c);
  const RH = 24;
  let x = PAD;
  table.columns.forEach((h, j) => {
    const num = table.numeric[j];
    ops.push({
      k: "text",
      x: num ? x + colW[j]! - 8 : x + 8,
      y: top + 16,
      text: fit(h, colW[j]! - 16, 600),
      size: 12,
      weight: 600,
      color: c.ink2,
      anchor: num ? "end" : "start",
    });
    x += colW[j]!;
  });
  ops.push({ k: "line", x1: PAD, y1: top + RH, x2: PAD + w, y2: top + RH, color: c.ink3 });
  rows.forEach((r, i) => {
    const y = top + RH * (i + 1);
    if (i % 2 === 1) ops.push({ k: "rect", x: PAD, y, w, h: RH, color: c.muted });
    let cx = PAD;
    r.forEach((v, j) => {
      const num = table.numeric[j];
      ops.push({
        k: "text",
        x: num ? cx + colW[j]! - 8 : cx + 8,
        y: y + 16,
        text: fit(v, colW[j]! - 16, 400),
        size: 12,
        weight: 400,
        color: c.ink,
        anchor: num ? "end" : "start",
      });
      cx += colW[j]!;
    });
  });
  let bottom = top + RH * (rows.length + 1);
  ops.push({ k: "line", x1: PAD, y1: bottom, x2: PAD + w, y2: bottom, color: c.line });
  if (table.rows.length > rows.length) {
    const more = table.rows.length - rows.length;
    ops.push({ k: "text", x: PAD, y: bottom + 16, text: `… +${more}`, size: 12, weight: 400, color: c.ink3 });
    bottom += 22;
  }
  const height = footer(ops, t, w, bottom, width, c);
  return { w: w + PAD * 2, h: height, bg: c.surface, font, ops };
}

function loadSvg(svg: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const img = new Image();
  return new Promise<HTMLImageElement>((ok, fail) => {
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error("svg"));
    img.src = url;
  }).finally(() => setTimeout(() => URL.revokeObjectURL(url), 0));
}

/** The plan as a PNG at 2× for sharp pasting (text in the page's own font). */
export async function planPng(plan: Plan): Promise<Blob> {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(plan.w * scale);
  canvas.height = Math.ceil(plan.h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = plan.bg;
  ctx.fillRect(0, 0, plan.w, plan.h);
  const images = await Promise.all(plan.ops.map((o) => (o.k === "svg" ? loadSvg(o.svg) : Promise.resolve(null))));
  plan.ops.forEach((o, i) => {
    if (o.k === "rect") {
      ctx.fillStyle = o.color;
      ctx.fillRect(o.x, o.y, o.w, o.h);
    } else if (o.k === "line") {
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(o.x1, o.y1 + 0.5);
      ctx.lineTo(o.x2, o.y2 + 0.5);
      ctx.stroke();
    } else if (o.k === "text") {
      ctx.fillStyle = o.color;
      ctx.font = `${o.weight} ${o.size}px ${plan.font}`;
      ctx.textAlign = o.anchor === "end" ? "right" : "left";
      ctx.fillText(o.text, o.x, o.y);
    } else if (images[i]) ctx.drawImage(images[i]!, o.x, o.y, o.w, o.h);
  });
  return await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("png"))), "image/png"));
}

/** The plan as one vector SVG document (charts nested as <svg> elements). */
export function planSvg(plan: Plan): string {
  const esc = (s: string) => escapeHtml(s).replace(/'/g, "&#39;");
  const body = plan.ops
    .map((o) => {
      if (o.k === "rect") return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="${esc(o.color)}"/>`;
      if (o.k === "line")
        return `<line x1="${o.x1}" y1="${o.y1 + 0.5}" x2="${o.x2}" y2="${o.y2 + 0.5}" stroke="${esc(o.color)}" stroke-width="1"/>`;
      if (o.k === "text")
        return `<text x="${o.x}" y="${o.y}" font-size="${o.size}" font-weight="${o.weight}" fill="${esc(o.color)}"${o.anchor === "end" ? ' text-anchor="end"' : ""}>${escapeHtml(o.text)}</text>`;
      return o.svg.replace(/^<svg\b/, `<svg x="${o.x}" y="${o.y}"`);
    })
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(plan.w)}" height="${Math.ceil(plan.h)}" viewBox="0 0 ${Math.ceil(plan.w)} ${Math.ceil(plan.h)}" font-family="${esc(plan.font)}">` +
    `<rect width="100%" height="100%" fill="${esc(plan.bg)}"/>${body}</svg>`
  );
}

/** PNG of one chart SVG with title above and legend and source below (dashboard cards). */
export async function chartPng(svg: SVGSVGElement, title: string, source: string, legend: LegendEntry[] = []): Promise<Blob> {
  const plan = chartPlan(svg.parentElement ?? svg, { title, source, legend }, ".xp-grid__title", [svg]);
  if (!plan) throw new Error("svg");
  return planPng(plan);
}

// ---------- clipboard and files

/** Put an image on the clipboard; resolves false where the browser does not allow it. */
export async function copyImage(blob: Blob): Promise<boolean> {
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** SVG to the clipboard where the browser supports it (Chromium), else a .svg download. */
export async function copySvg(svg: string, fileName: string): Promise<"copied" | "downloaded"> {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const supports =
    typeof ClipboardItem === "undefined" ? undefined : (ClipboardItem as unknown as { supports?: (t: string) => boolean }).supports;
  if (supports?.call(ClipboardItem, "image/svg+xml")) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/svg+xml": blob, "text/plain": new Blob([svg], { type: "text/plain" }) }),
      ]);
      return "copied";
    } catch {
      /* fall through to the download */
    }
  }
  downloadBlob(fileName, blob);
  return "downloaded";
}

export async function copyTable(caption: string, t: CopyTable, extra: TableExtra = {}): Promise<boolean> {
  const { html, text } = tableClipboard(caption, t, extra);
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) }),
    ]);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}
