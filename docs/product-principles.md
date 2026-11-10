# Product principles: business first

Owner's direction of 2026-11-09. It complements the vision doc and applies to the explorer, the chart library, dashboards and every later product.

## Who it is for

Business users who are not experienced with analytics tools. It is not built for IT people or BI developers, and it is not marketed to them. We are not building another Power BI, Tableau, Looker, Superset, Metabase or Qlik.

## What "smart" means

"Smart charts" and "smart dashboards" come from programmatic logic in the backend, not from AI:

- data-aware defaults;
- guardrails, such as no summing of averages and no index of a rate;
- automatic findings in titles;
- looks ordered by the business question they answer.

AI is optional on top, never the foundation. What the user gets is simplicity and guidance, while the tool stays robust and powerful.

## Front and back

Value and guidance come first. Full customisation exists, but behind it: the "Dostosuj" pane sits behind the looks, and the looks sit behind the question. Every chart, look and feature has to answer what business question it serves.

## Needs that BI tools miss (owner's consulting experience)

1. **Data into Excel.** Users ask for "export to Excel" because they want immersive analysis in the tool they know, not a file. So we offer copy and paste straight into Excel: the clipboard carries an HTML table with real numbers plus TSV, so it works with Polish decimal commas. Download stays too.
2. **Charts as editable objects.** Users build their own ad hoc presentations. A chart can be copied or exported as SVG and as a native, editable PowerPoint chart with its data behind it. Types that Office cannot draw natively (IBCS variance, Pareto, maps, small multiples) go out as vector shapes.
3. **Many charts at once.** Users can export a whole dashboard or a selection of charts to PowerPoint, with flexible layout, titles and notes. Power BI is weak at this.
4. **The user's own views.** Users can save their views and assemble them into their own board or presentation (a story).

## Consequences for the chart library

- Looks are "outfits for an occasion", and the occasion is a business need: compare with last year, rank, check against a target, see what changed, see the structure, find outliers.
- Each look states the question it answers.
- Locks and guidance are visible, never silent.
