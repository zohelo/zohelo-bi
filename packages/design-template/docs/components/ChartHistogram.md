Histogram: rozkład jednej miary dla wielu jednostek (gminy, powiaty).

Group: Rozkład. Example: "Większość gmin ma niskie bezrobocie" (Liczba gmin według stopy bezrobocia, przedziały co 2 pp, 2025).

## When to use
Rozkład jednej miary dla wielu jednostek (gminy, powiaty).

## Avoid
Odstępy między słupkami jak w wykresie kategorii; nierówne przedziały.

## Colour and marks
Bars `series-1` with 2px gaps only between bins; median as a dashed `ink` line with label.

## Always
Title states the finding; subtitle states measure, unit, frequency and range; `role="img"` with a one-sentence `aria-label`; Wykres | Tabela toggle; source line; phone variant drawn for 340px with 11px text. Draw with `kit/zchart.js` as the visual reference; production charts come from `packages/visuals`.
