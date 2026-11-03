The master app layout: sidebar, top bar, page header, tabs, KPI row and chart rows. Every section of bi.zohelo.com and data.zohelo.com starts from it.

## Consumer provides
Sidebar contents for the product, breadcrumb, page title and finding, period options, tabs, KPI tiles and chart cards.

## Rules
- Regions and sizes as in Page layout: sidebar 256 (rail 64 below 1280, drawer below 768), top bar 60, content max 1184 with 32px gutter.
- Reading order: header → KPI row → main trend (8 cols) + companion (4) → breakdown rows (6+6) → table and methodology. Chart rows stack below 1280px.
- The whole sidebar is the `nav` "Główna" (search inside it as `role="search"`); never an `aside`.
- Responsive and phone chart variants are part of the template; the page never scrolls sideways.
- Full-size template and its states: Design canvas boards "Pulpit z menu bocznym" and "Menu boczne: stany i reguły".
