# Analizy: statistics and econometrics for business readers

Owner's request of 2026-11-10: a statistical and econometric part, so that models and analyses can be applied to
the data easily. This document fixes the design; the first version is built (`/analizy`).

## The idea

BI tools give a statistician a toolbox. A business reader does not want a toolbox; they have a question:
is it growing, is it seasonal, what comes next, do these two move together, are the regions converging. So the
unit of this part is a **recipe**: one business question, answered the same way every time.

A recipe returns five things, in this order:

1. **One sentence** with the answer and the number ("Przeciętne wynagrodzenie rośnie średnio o 5,7% rocznie").
2. **The chart** that shows it.
3. **A few facts** in plain words (pace, confidence "wysoka / niska", past error of the forecast).
4. **"Zanim użyjesz tej liczby"**: the cautions that apply to this result, not a generic disclaimer.
5. **"Jak to policzono"**: the method in one paragraph, checkable in a spreadsheet.

No model names in front, no parameters to set, no p-values on screen: a p-value appears as "pewność kierunku:
wysoka". The method is named only in "Jak to policzono".

## Rules that make it "smart" (no AI)

| Rule | Why |
|---|---|
| A trend is a growth rate for levels and a change in points for rates and balances. | A "growth rate of the unemployment rate" misleads. |
| Two indicators are compared on year-on-year changes, never on levels. | Two rising series always correlate; the yearly change also removes the season. |
| A forecast model must beat "same as a year ago" on the series' own past, or the naive method is used. A tie goes to the simpler. | A model is never preferred to common sense without earning it; the reader sees the past error. |
| Every forecast shows an interval and the error it made in past tests. | A single number invites false precision. |
| Seasonality refuses annual data; convergence refuses fewer than five regions or five years; every recipe has a minimum history. | Refusing with a reason is better than a wrong number. |
| Correlation always carries "nie oznacza przyczyny"; leading is reported only when it is clearly stronger than the same-period link. | The two most common misreadings. |

## What is built (version 1)

| Recipe | Needs | Method | Output |
|---|---|---|---|
| Jaki jest trend? | one indicator, one area | least squares on time (log scale for levels) | average change a year, confidence, share of variation explained, latest value against the trend |
| Czy to sezonowe? | monthly or quarterly indicator | classical additive decomposition | strength of the season, highest and lowest month, the series with the season removed |
| Co będzie dalej? | one indicator, one area | damped exponential smoothing (Holt, Holt-Winters) against the seasonal naive method, chosen by rolling-origin test | a year ahead with an 80% interval, the method used, its past error, its edge over the naive method |
| Czy te dwa wskaźniki idą razem? | two indicators of the same frequency | Pearson correlation of yearly changes, cross-correlation by lag | strength and direction of the link, which one leads and by how long |
| Czy regiony się wyrównują? | one indicator across voivodeships or EU countries | sigma convergence (coefficient of variation), beta convergence (growth on starting level) | whether differences shrink, whether the weaker grew faster, half-life of the gap |

Code: `packages/stats` (pure numeric functions, 10 tests against textbook values), `apps/portal/src/tpl/analysis/recipes.ts`
(wording and guardrails, tested on the sample catalogue), `pages/Analysis.tsx`. A result is a link
(`/analizy?r=forecast&i=avg_wage`), so it can be shared; charts copy to Excel like every other chart.

## Next recipes, in order of business value

| # | Recipe | Question | Method | Needs from the data |
|---|---|---|---|---|
| 1 | Realnie, po inflacji | "Ile to jest w cenach stałych?" | deflate a nominal series by CPI | flag "nominal, in zł" per KPI |
| 2 | Co się składa na zmianę | "Co odpowiada za wzrost?" | contributions to change; shift-share for regions | additive breakdowns |
| 3 | Co wpływa na X | "Które czynniki tłumaczą X?" | regression with up to three factors on yearly changes, with checks (few observations, factors that duplicate each other, autocorrelation) | nothing new |
| 4 | Czy coś się zmieniło | "Czy po dacie D jest inaczej?" | before/after comparison of trend and level around a chosen date | nothing new |
| 5 | Kto jest podobny | "Które regiony są jak mój?" | distance on a few standardised indicators, groups of similar regions | powiat data for real use |
| 6 | Jak nierówno | "Jak skupione jest zjawisko?" | Gini and concentration across regions | additive measures by region |
| 7 | Dwa scenariusze | "Co jeśli wzrost będzie o 1 pp niższy?" | simple what-if on a trend or forecast | nothing new |

Deliberately not planned: a free model builder, parameter panels, machine-learning models, automatic "insights"
without a question. They serve analysts, not the business reader, and are the road to another BI tool.

## Where it connects

- **Explorer:** the looks "Z przedziałem ufności" and "Z prognozą" are locked there for lack of data. A forecast from
  this part can feed them: "Pokaż prognozę" on a line chart. Not built yet; it is the first link to add.
- **Dashboards:** a card may state a recipe's sentence (for example the trend) under its title.
- **"Co nowego":** unusual moves already use the same idea (the latest change against the series' own history).
- **Collections and PowerPoint:** an analysis should be pinnable like any view. Not built yet.

## Limits to keep in mind

- All results today run on sample data, so they show the mechanics, not facts.
- Monthly public statistics are revised; a forecast made on first releases will shift. With real data the result
  should carry the data vintage ("dane z dnia …").
- Significance tests assume independent observations; economic series are not. The wording therefore says "pewność
  wysoka / niska", never a probability, and the method note says the test is optimistic.
- Sixteen voivodeships are few observations for a convergence regression; the recipe says so on every result.
