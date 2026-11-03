// Small formatting helpers of the guide (dates of data loads in Polish-first form).

const MONTHS_PL = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-24T06:00:00Z" → "24 paź 2026" / "24 Oct 2026"; anything else is returned as given. */
export function fmtDay(iso: string | undefined, lang: "pl" | "en"): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return iso ?? "–";
  const month = (lang === "pl" ? MONTHS_PL : MONTHS_EN)[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : iso!;
}

/** The minimal DOM surface accessibleText reads (Node in the browser; plain objects in tests). */
export type TextNode = {
  nodeType: number;
  textContent: string | null;
  childNodes: ArrayLike<TextNode>;
  getAttribute?: (name: string) => string | null;
};

/**
 * Text a screen reader reads from an element in browse mode, approximated: text nodes in order, subtrees
 * with aria-hidden="true" skipped, visually hidden (zt-sr) text kept. Whitespace collapsed.
 */
export function accessibleText(node: TextNode): string {
  const walk = (n: TextNode): string => {
    if (n.nodeType === 3) return n.textContent ?? "";
    if (n.nodeType !== 1) return "";
    if (n.getAttribute?.("aria-hidden") === "true") return "";
    return Array.from(n.childNodes).map(walk).join("");
  };
  return walk(node).replace(/\s+/g, " ").trim();
}
