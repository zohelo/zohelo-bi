// Design variants of the template (design brief §6 "React, don't specify"): the owner switches between 2–3
// versions of a page in the account panel and picks one. Kept in this browser; a `?wariant=<page>:<value>,…`
// query sets them too (for review links and screenshots). Once a variant is chosen, the others are removed.

import { PERSONAL_EVENT } from "./personal";

export type Variants = {
  /** Home hero background: A gradient mesh, B data lines, C Poland map. */
  homeBg: "A" | "B" | "C";
  /** Home layout: personal rows first, or the featured story beside the ask box. */
  homeLayout: "rows" | "story" | "brief";
};

export const DEFAULT_VARIANTS: Variants = { homeBg: "B", homeLayout: "rows" };

const KEY = "zohelo-bi.variants.v1";

export const VARIANT_OPTIONS: { [K in keyof Variants]: Variants[K][] } = {
  homeBg: ["A", "B", "C"],
  homeLayout: ["rows", "story", "brief"],
};

function valid(v: Partial<Record<string, unknown>>): Partial<Variants> {
  const out: Partial<Variants> = {};
  for (const k of Object.keys(VARIANT_OPTIONS) as (keyof Variants)[]) {
    const x = v[k];
    if ((VARIANT_OPTIONS[k] as unknown[]).includes(x)) (out as Record<string, unknown>)[k] = x;
  }
  return out;
}

/** `?wariant=homeBg:C,homeLayout:story` — used once on load, then stored. */
export function variantsFromSearch(search: string): Partial<Variants> {
  const raw = new URLSearchParams(search).get("wariant");
  if (!raw) return {};
  const pairs = raw.split(",").map((p) => p.split(":"));
  return valid(Object.fromEntries(pairs.filter((p) => p.length === 2)));
}

export function loadVariants(): Variants {
  let stored: Partial<Variants> = {};
  try {
    stored = valid(JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>);
  } catch {
    /* storage blocked */
  }
  return { ...DEFAULT_VARIANTS, ...stored, ...variantsFromSearch(window.location.search) };
}

export function saveVariant<K extends keyof Variants>(key: K, value: Variants[K]) {
  const next = { ...loadVariants(), [key]: value };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: lasts for this page view */
  }
  window.dispatchEvent(new Event(PERSONAL_EVENT));
}
