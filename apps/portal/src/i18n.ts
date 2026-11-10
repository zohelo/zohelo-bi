// The portal's two languages and the parser for ?lang= and the stored choice. The language state and the
// toggle are in lang.ts and the shell's header tools; each page keeps its own texts in Polish and English.

export type Lang = "pl" | "en";

export function parseLang(value: string | null | undefined): Lang | null {
  const v = value?.trim().toLowerCase();
  return v === "pl" || v === "en" ? v : null;
}
