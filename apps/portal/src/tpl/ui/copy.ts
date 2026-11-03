// Copy a chart out of the portal (design system: Chart card, Kopiuj). Two forms:
//   image: the chart with its title and source as a PNG (paste into email, Word, PowerPoint, chat);
//   data: the chart's numbers as an HTML table plus tab-separated text (paste into Excel, Word, email),
//         so the receiving tool gets a real table, not a picture.
// Charts are drawn with CSS custom properties, so the SVG is cloned with every computed paint and font
// property written inline before it is rasterised.

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

/** HTML table (with caption) and tab-separated text of the chart's numbers. */
export function tableClipboard(caption: string, t: CopyTable): { html: string; text: string } {
  const cell = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  const html =
    `<table><caption>${escapeHtml(caption)}</caption><thead><tr>${t.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>` +
    `<tbody>${t.rows.map((r) => `<tr>${r.map((v) => `<td>${escapeHtml(cell(v))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const text = [caption, t.columns.join("\t"), ...t.rows.map((r) => r.map(cell).join("\t"))].join("\n");
  return { html, text };
}

/** Wrap text to lines no wider than `max` px in the canvas font. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
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

/** PNG of the chart SVG with title above and legend and source below, at 2× for sharp pasting. */
export async function chartPng(svg: SVGSVGElement, title: string, source: string, legend: LegendEntry[] = []): Promise<Blob> {
  const box = svg.getBoundingClientRect();
  const w = Math.ceil(box.width);
  const h = Math.ceil(box.height);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineStyles(svg, clone);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((ok, fail) => {
      img.onload = () => ok();
      img.onerror = () => fail(new Error("svg"));
      img.src = url;
    });
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--ink").trim() || "black";
    const ink3 = css.getPropertyValue("--ink-3").trim() || "gray";
    const surface = css.getPropertyValue("--surface").trim() || "white";
    const font = getComputedStyle(document.body).fontFamily;
    const pad = 16;
    const scale = 2;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = `600 16px ${font}`;
    const titleLines = wrap(ctx, title, w);
    const top = pad + titleLines.length * 22 + 8;
    // Legend rows: swatch + label, wrapped to the chart width.
    ctx.font = `12px ${font}`;
    const rows: { x: number; e: LegendEntry }[][] = [[]];
    let x = 0;
    for (const e of legend) {
      const wItem = 14 + ctx.measureText(e.label).width + 16;
      if (x + wItem > w && x > 0) {
        rows.push([]);
        x = 0;
      }
      rows[rows.length - 1]!.push({ x, e });
      x += wItem;
    }
    const legendH = legend.length ? rows.length * 18 + 6 : 0;
    const height = top + h + legendH + 12 + 16 + pad;
    canvas.width = (w + pad * 2) * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);
    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, w + pad * 2, height);
    ctx.fillStyle = ink;
    ctx.font = `600 16px ${font}`;
    titleLines.forEach((l, i) => ctx.fillText(l, pad, pad + 16 + i * 22));
    ctx.drawImage(img, pad, top, w, h);
    ctx.font = `12px ${font}`;
    rows.forEach((row, r) =>
      row.forEach(({ x: lx, e }) => {
        const y = top + h + 8 + r * 18;
        ctx.fillStyle = e.color;
        ctx.fillRect(pad + lx, y + 2, 10, 10);
        ctx.fillStyle = ink;
        ctx.fillText(e.label, pad + lx + 14, y + 11);
      }),
    );
    ctx.fillStyle = ink3;
    ctx.fillText(source, pad, top + h + legendH + 24);
    return await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("png"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Put an image or a table on the clipboard; resolves false where the browser does not allow it. */
export async function copyImage(blob: Blob): Promise<boolean> {
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

export async function copyTable(caption: string, t: CopyTable): Promise<boolean> {
  const { html, text } = tableClipboard(caption, t);
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
