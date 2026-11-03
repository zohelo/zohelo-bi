Wkłady do wzrostu: składniki, które sumują się do wskaźnika głównego (PKB, CPI), w kolejnych okresach; wkłady w punktach procentowych.

Group: Zmiana w czasie. Example: "Wzrost PKB niosą konsumpcja i inwestycje" (Wkład do wzrostu realnego PKB r/r, punkty procentowe, kwartalnie, 3 kw. 2021–2 kw. 2026). The standard chart of NBP, ECB and ONS for GDP growth by demand component or CPI inflation by group (food, energy, core).

## When to use
Składniki, które sumują się do wskaźnika głównego, w kolejnych okresach (kilkanaście–kilkadziesiąt kwartałów lub miesięcy); wkłady w pp, także ujemne. Suma (wskaźnik główny) podpisana.

## Avoid
Więcej niż ~7 składników; składniki, które się nie sumują do całości; jeden okres (użyj wykresu kaskadowego); udziały w % (użyj obszaru 100%).

## Colour and marks
Components in `series-1` … `series-5` in fixed order (a 6th and later fold into "Pozostałe" in `series-context`). Per period one column: positive parts stack up from zero, negative parts stack down from zero, 2px surface gap between segments, 2px rounded data ends. The total is an `ink` dot with a 1.5px white ring on every column; the latest total is labelled (12px, weight 600). The zero line is `series-reference`, drawn above the columns. Sub-annual periods are labelled by year under their columns.

## Interaction and table
Hover and keyboard (arrows, Home, End) read one period: every component and the total, signed, in pp ("+1,6 pp", "−0,9 pp"). The table view has one row per period, one column per component (also those folded into "Pozostałe") and the total, signed, headers with ", pp". The legend lists the components (squares) and the total (dot).

## Always
Title states the finding; subtitle states measure, unit, frequency and range; `role="img"` with a one-sentence `aria-label`; Wykres | Tabela toggle; source line; phone variant with 11px text. Draw with `kit/zchart.js` as the visual reference; production charts come from `packages/visuals`.
