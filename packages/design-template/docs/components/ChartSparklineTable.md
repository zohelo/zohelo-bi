Tabela z liniami trendu: przegląd 5–15 wskaźników o różnych jednostkach.

Group: Pojedyncze wartości i przegląd. Example: "Wiele wskaźników na jednym ekranie" (Ostatnia wartość, zmiana i trend 5 lat).

## When to use
Przegląd 5–15 wskaźników o różnych jednostkach.

## Avoid
Różne skale linii trendu sugerujące porównanie; brak jednostek.

## Colour and marks
Sparklines `series-1` 1.5px, each scaled to its own row (say so); values `tabular`.

## Always
Title states the finding; subtitle states measure, unit, frequency and range; `role="img"` with a one-sentence `aria-label`; Wykres | Tabela toggle; source line; phone variant drawn for 340px with 11px text. Draw with `kit/zchart.js` as the visual reference; production charts come from `packages/visuals`.
