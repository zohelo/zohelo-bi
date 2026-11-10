# Accessibility

Target: WCAG 2.2 AA on every page in every portal. These are requirements, not suggestions.

## Structure

- One `h1` per page; headings in order. Landmarks: `header`, `nav` (labelled: "Główna", "Ścieżka", "Widoki pulpitu"), `main` with `id="tresc"`, `footer`.
- First focusable element: "Przejdź do treści" skip link.
- Current location: `aria-current="page"` on the active sidebar item, breadcrumb end and page tab.
- Expandable sidebar domains are `button`s with `aria-expanded` and `aria-controls`. Unavailable items ("wkrótce") are not focusable.

## Contrast

- Text 4.5:1 (3:1 at 24px+ or 19px bold). Tokens list their ratio in their usage note; use only the stated pairs.
- Meaningful graphics (chart marks, focus ring, control borders that carry state) 3:1. Light series colours below 3:1 need direct labels or a table.
- Binned colour scales start at `seq-1`; band fills always have dashed edges.

## Keyboard

- Everything works with the keyboard alone, in visual order. Visible focus ring (2px `focus`, 2px offset) on every focusable element; search fields show the ring on the whole field (`label:focus-within`). `outline: none` without a replacement is a defect.
- Phone drawer and dialogs trap focus, close with Esc and on scrim click, and return focus to the button that opened them.
- Segmented controls use `aria-pressed`; menus use `role="menu"` with arrow-key movement; the command palette is a `dialog` with a labelled `listbox`.

## Targets and sizing

- Controls 36px desktop, 44px on phone; anything clickable at least 24×24px (WCAG 2.2).
- Text never below 11px (chart ticks) or 12px (UI). Zoom to 200% without loss of content or sideways scrolling.

## Charts

- `role="img"` + `aria-label` with the finding; table view for every chart; tooltip is never the only access to a value; no information by colour alone.

## Symbols and abbreviations

Screen readers speak symbols literally (▼ "wypełniony trójkąt skierowany w dół", m/m "m slesz m"). Wherever a symbol or statistical abbreviation carries meaning (KPI changes, table deltas), hide it with `aria-hidden="true"` and add the words in a visually hidden `zt-sr` span. Separate adjacent facts in one block (label, period, value) with a visually hidden ", ".

## Language

`lang="pl"` on Polish pages, `lang="en"` on English ones, so screen readers use the right voice.
