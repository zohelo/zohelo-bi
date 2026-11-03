The four non-happy states of a chart card: loading, empty, not applicable, error.

## Rules
- Same height as the chart (min 170px) so the layout doesn't jump.
- Empty and not-applicable states say what to do next. Error states say what failed and offer Spróbuj ponownie; `role="alert"`.
- Loading uses skeleton bars, `aria-busy="true"`.
