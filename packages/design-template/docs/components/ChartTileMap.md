Kartogram kafelkowy: wartości dla regionów, gdy kształt mapy nie jest ważny; każdy region równie widoczny.

Group: Zależność i przestrzeń. Example: "Najwyższe bezrobocie na wschodzie" (Stopa bezrobocia rejestrowanego, %, 2025, 16 województw).

## When to use
Wartości dla regionów, gdy kształt mapy nie jest ważny; każdy region równie widoczny.

## Avoid
Mapa choropletyczna z liczbami bezwzględnymi (użyj wartości na mieszkańca).

## Colour and marks
4-class ordinal ramp `seq-1`, `seq-2`, `seq-4`, `seq-5`; ink text on the light two, white on the dark two.

## Always
Title states the finding; subtitle states measure, unit, frequency and range; `role="img"` with a one-sentence `aria-label`; Wykres | Tabela toggle; source line; phone variant drawn for 340px with 11px text. Draw with `kit/zchart.js` as the visual reference; production charts come from `packages/visuals`.
