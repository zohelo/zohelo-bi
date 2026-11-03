Left navigation of the app shell (bi.zohelo.com, data.zohelo.com, tools): brand, search, primary nav, domains, personal items, methodology and language.

## Consumer provides
The product's lockup, the list of primary items, domains (only those with data, plus a count of coming-soon domains), the current page, and the user's saved items.

## Anatomy
- Brand row 60px: live lockup + collapse button (`aria-label="Zwiń menu"`, `aria-expanded`, `aria-controls`).
- Search field with Ctrl K hint (opens the command palette).
- Primary items: Przegląd, Eksplorator, Katalog wskaźników.
- "DZIEDZINY" (`label-caps`): domains with data; the active domain expanded to its pages. Domains are `button`s with `aria-expanded`; pages are links.
- One row "Wkrótce: N dziedzin" collecting empty domains.
- "MOJE": Zapisane widoki, Obserwowane, with counts.
- Footer: Metodologia i źródła, sample-data badge, PL | EN.

## Rules
- Width `sidebar-w` 256px; `rail-w` 64px below 1280px (icons only, tooltip + `aria-label` on each); drawer `drawer-w` 308px below 768px over `scrim`, focus trapped, Esc closes.
- At most 2 levels (domain → page). Deeper navigation uses page tabs.
- Active page: `accent-tint` fill, 3px `accent` inset bar, `aria-current="page"`, weight 600; parent domain weight 600.
- Item height `control-h` 36px (44px on phone), icon 18px, labels never truncated in the expanded state (shorten the label instead).
- Unavailable pages: `aria-disabled="true"`, `tabindex="-1"`, "wkrótce" in `ink-muted`, with a visually hidden ", " before it so it is not read as one word with the label.
- The whole sidebar is the `nav` landmark "Główna" (search inside as `role="search"`). Not an `aside`: VoiceOver announces that as a complementary region.
- The nav scrolls on its own; brand row and footer stay fixed.

## Don't
- Don't list empty domains one by one; don't use colour alone for the active item; don't put actions (Pobierz, Udostępnij) in the sidebar.
