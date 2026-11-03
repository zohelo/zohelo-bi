A number to remember: label, period, value, change, context and source.

## Rules
- Value `kpi-value` (proportional figures). Period top-right in `ink-muted`.
- Change: ▲/▼ + value + basis (pp m/m, % r/r) in `ink-2`; never green/red.
- Context gives meaning (target band, EU average). Source + frequency at the bottom.
- Sparkline 88×30 in `series-1`, decorative (`aria-hidden`), hidden on phone.
- 3–5 tiles in the KPI row; 4 per row desktop, 2 below 1280px.
- Never a chart in disguise: no gauges, single bars or progress rings.

## How it sounds (tested with NVDA and VoiceOver)
Without help, a screen reader reads a tile as one run-on string ("Inflacja HICPwrz 20262,9 procent wypełniony trójkąt skierowany w dół 0,1 pp m slesz m"). So:
- Put a visually hidden `, ` (`zt-sr`) between label, period and value so each is a separate phrase.
- Hide the arrow and abbreviations from screen readers (`aria-hidden="true"`) and add the spoken form in `zt-sr`: "spadek o 0,1 punktu procentowego w porównaniu z poprzednim miesiącem". ▼/▲ → spadek o / wzrost o; pp → punktu procentowego; m/m → w porównaniu z poprzednim miesiącem; r/r → w porównaniu z poprzednim rokiem.
