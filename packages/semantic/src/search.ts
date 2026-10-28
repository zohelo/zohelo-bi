// Catalogue search: 'PKB', 'GDP', 'bezrobocie' or a source code like 'P2392'. Accent- and
// case-insensitive, no fuzzy matching. Works on its own small item type; the catalogue page maps
// catalog.json rows to it.

export type SearchItem = { key: string; name_pl: string; name_en: string; synonyms?: string[]; codes?: string[] };
export type SearchHit = { key: string; score: number };

/** Lower case, accents removed (ł → l), whitespace collapsed and trimmed. */
export function normalise(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replaceAll("ł", "l").replace(/\s+/g, " ").trim();
}

function termScore(term: string, q: string): number {
  if (term === q) return 3;
  if (term.startsWith(q)) return 2;
  return term.includes(q) ? 1 : 0;
}

/** Best match per item: 3 equal, 2 prefix, 1 contains; highest score first, then name_en. */
export function search(items: SearchItem[], query: string, limit = 20): SearchHit[] {
  const q = normalise(query);
  if (!q) return [];
  const hits: (SearchHit & { name: string })[] = [];
  for (const item of items) {
    const terms = [item.name_pl, item.name_en, ...(item.synonyms ?? []), ...(item.codes ?? [])];
    const score = Math.max(...terms.map((t) => termScore(normalise(t), q)));
    if (score > 0) hits.push({ key: item.key, score, name: item.name_en });
  }
  hits.sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return hits.slice(0, limit).map(({ key, score }) => ({ key, score }));
}
