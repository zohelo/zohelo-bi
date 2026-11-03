// Reads packages/design-template/tokens.json for the guide: colour groups, references resolved, and
// WCAG 2.x contrast ratios computed from the values (the page shows the number, not a claim).

import tokensJson from "@zohelo/design-template/tokens.json";

export type ColorToken = { name: string; value: string; usage: string };
export type TypeStyle = {
  name: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
  sample: string;
  usage: string;
};
export type ScaleToken = { name: string; value: string; usage: string };

type TokensFile = {
  color: { tokens: ColorToken[] };
  type: { families: Record<string, string>; groups: { name: string; family: string; styles: TypeStyle[] }[] };
  spacing: { tokens: ScaleToken[] };
  radius: { tokens: ScaleToken[] };
  shadow: { tokens: ScaleToken[] };
  size: { tokens: ScaleToken[] };
  breakpoint: { tokens: ScaleToken[] };
};

export const TOKENS = tokensJson as unknown as TokensFile;

/** "{accent}" → the referenced token's value (one or more levels). */
export function resolveColor(value: string, tokens: ColorToken[] = TOKENS.color.tokens, depth = 0): string {
  const ref = /^\{([a-z0-9-]+)\}$/.exec(value);
  if (!ref || depth > 5) return value;
  const t = tokens.find((x) => x.name === ref[1]);
  return t ? resolveColor(t.value, tokens, depth + 1) : value;
}

/** The token a reference points to ("{accent}" → "accent"), or null. */
export function referenceOf(value: string): string | null {
  return /^\{([a-z0-9-]+)\}$/.exec(value)?.[1] ?? null;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of #RGB / #RRGGBB, or null for anything else (rgba, references). */
export function luminance(hex: string): number | null {
  let h = hex.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(h)) h = [...h].map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!);
}

/** WCAG contrast ratio of two colours, or null when either is not an opaque hex colour. */
export function contrast(a: string, b: string): number | null {
  const la = luminance(a),
    lb = luminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** What a ratio is good for: text (4.5:1), large text and graphics (3:1), or neither. */
export function contrastGrade(ratio: number): "text" | "graphic" | "low" {
  return ratio >= 4.5 ? "text" : ratio >= 3 ? "graphic" : "low";
}

/** Rounded down to one decimal so a shown 4.5 is never really 4.49. */
export function fmtRatio(ratio: number, lang: "pl" | "en"): string {
  const v = Math.floor(ratio * 10) / 10;
  return `${v.toLocaleString(lang === "pl" ? "pl-PL" : "en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}:1`;
}

export type ColorGroup = { key: string; pl: string; en: string; notePl: string; noteEn: string; tokens: ColorToken[] };

const GROUPS: { key: string; pl: string; en: string; notePl: string; noteEn: string; test: (n: string) => boolean }[] = [
  {
    key: "neutral",
    pl: "Tła i linie",
    en: "Grounds and lines",
    notePl: "Powierzchnie, na których leży treść, i linie, które je dzielą.",
    noteEn: "The surfaces content sits on and the lines between them.",
    test: (n) => /^(canvas|surface|line|grid|scrim)/.test(n),
  },
  {
    key: "ink",
    pl: "Tekst",
    en: "Text",
    notePl: "Cztery poziomy tekstu i kolor na ciemnym tle; ink-disabled tylko dla ikon.",
    noteEn: "Four text levels and text on dark grounds; ink-disabled for icons only.",
    test: (n) => /^(ink|on-inverse)/.test(n),
  },
  {
    key: "accent",
    pl: "Akcent",
    en: "Accent",
    notePl: "Jedyny kolor interfejsu: przyciski główne, linki, fokus, aktywne menu. Nie jest kolorem danych.",
    noteEn: "The only UI colour: primary buttons, links, focus, active nav. Never a data colour.",
    test: (n) => /^(accent|focus)/.test(n),
  },
  {
    key: "series",
    pl: "Dane: serie i odniesienia",
    en: "Data: series and references",
    notePl: "Tylko w wykresach. Kolejność stała, kolor idzie za obiektem (Polska to zawsze series-1).",
    noteEn: "Charts only. Fixed order; colour follows the entity (Poland is always series-1).",
    test: (n) => /^(series|band)/.test(n),
  },
  {
    key: "seq",
    pl: "Dane: skala sekwencyjna i rozbieżna",
    en: "Data: sequential and diverging scales",
    notePl: "Wielkość (jeden odcień, od jasnego do ciemnego) i biegunowość wokół zera.",
    noteEn: "Magnitude (one hue, light to dark) and polarity around zero.",
    test: (n) => /^(seq|div)/.test(n),
  },
  {
    key: "status",
    pl: "Statusy danych",
    en: "Data status",
    notePl: "Zarezerwowane dla etykiet statusu i plakietki danych przykładowych. Nigdy w wykresach ani dla wartości.",
    noteEn: "Reserved for status tags and the sample-data badge. Never in charts or for values.",
    test: (n) => /^(status|sample)/.test(n),
  },
];

/** Colour tokens in display groups; every token lands in exactly one group (the first that matches). */
export function colorGroups(tokens: ColorToken[] = TOKENS.color.tokens): ColorGroup[] {
  const used = new Set<string>();
  return GROUPS.map(({ test, ...g }) => {
    const list = tokens.filter((t) => !used.has(t.name) && test(t.name));
    list.forEach((t) => used.add(t.name));
    return { ...g, tokens: list };
  });
}

/** Which contrast matters: grounds carry ink text, text colours sit on surface, data colours both. */
export function contrastMode(name: string): "ground" | "fg" | "both" | "inverse" {
  if (name === "on-inverse" || name === "surface-inverse") return "inverse";
  if (/^(canvas|surface|line|grid)/.test(name) && name !== "surface-inverse") return "ground";
  if (/-(bg|line)$/.test(name) || /^(band$|div-mid|accent-tint)/.test(name)) return "ground";
  if (/^(ink|on-inverse|accent|focus|status-.*-(fg|dot)|sample-fg)/.test(name)) return "fg";
  return "both";
}
