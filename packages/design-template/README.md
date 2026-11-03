# @zohelo/design-template

The code side of the **zohelo design template**, the one visual system for bi.zohelo.com, data.zohelo.com and zohelo.com.

The source of truth is the design system on claude.ai ("zohelo design template"): brand book, page layout, dashboard rules, chart library, component guidelines and the development and testing rules. The full-size page templates are on the Design canvas ("bi.zohelo.com redesign"). This package carries the files code needs, copied from there:

| File | What |
| --- | --- |
| `tokens.json` | All tokens with usage notes (colours, type, spacing, radius, shadow, size, breakpoints, z-index). |
| `tokens.css` | The tokens as CSS custom properties plus one class per type style (`.page-title`, `.card-title`, …). Generated from `tokens.json`; do not edit by hand. |
| `zt.css` | Component styles (`zt-btn`, `zt-seg`, `zt-search`, `zt-chip`, `zt-tag`, `zt-card`, `zt-kpi`, `zt-nav-item`, `zt-tabs`, `zt-table`, `zt-menu`, `zt-tooltip`, `zt-state`). Uses tokens only. |
| `logos/` | Outlined SVG logo variants, app icon, favicon, social card. |
| `kit/zchart.js` | Visual reference for all 22 chart types (sample data). Production charts come from `@zohelo/visuals`. |

## Rules (short version)

1. No visual change in code without an approved mockup in the template.
2. Tokens by name only; no hex values, font sizes or radii typed into components.
3. A UI change is done when `bun run test:ui` passes (axe-core 0 violations at 1440/768/390, focus ring on every tab stop, no horizontal scroll at 1280/1024/768/390), the screenshots in `tests/ui/out/` have been looked at, and the Screen reader workflow transcripts show the key announcements. Full table: `docs/design-template.md`.

Changing a token or component: change it in the design system first, then copy the files here in the same pull request.
