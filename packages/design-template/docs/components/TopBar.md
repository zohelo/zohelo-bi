The 60px bar above the content in the app shell: breadcrumb on the left, page-level actions on the right.

## Consumer provides
Breadcrumb trail (matches the sidebar position), up to two page actions.

## Rules
- Breadcrumb in `small`, `ink-3` links, current item `ink` weight 500 with `aria-current="page"`, separators `aria-hidden`.
- Actions: one secondary (Udostępnij) and one primary (Pobierz dane). Never more than one primary per page.
- Phone: menu button (44px, `aria-label="Otwórz menu"`) on the left, primary action on the right; breadcrumb and secondary hidden.
- Sticky at `top: 0` with `z-sticky`; bottom border `line`.
