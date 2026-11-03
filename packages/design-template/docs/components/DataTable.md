Tables for the chart table view, rankings, variables and the catalogue.

## Rules
- Real `table` with `caption`, `th scope`; numbers right-aligned with `tabular-nums`.
- Header row `surface-sunken`, `caption`-size `ink-3`; row separators `line-subtle`; no zebra stripes.
- The highlighted entity (Polska) in weight 600, not colour.
- Wide tables scroll inside `zt-table-wrap`, never the page.
- In templates rendered with loops, use div grids with `role="table"/"row"/"cell"` (template engines break `table` loops).
