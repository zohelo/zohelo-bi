# Brand kit

The kit every product, page, document and social post starts from. All logo files are outlined SVG (no font dependency) and live in Assets → Logos.

## The mark

Three horizontal bars of decreasing length: a ranked bar chart, the most common chart in the product. It is drawn on a 22-unit square: bars 18, 13 and 8 units long, 3 units thick, fully rounded, left-aligned at x = 2.

The mark was created in the bi.zohelo.com redesign pilot. It is the working mark until an official one exists; replace the files in Assets → Logos if one is commissioned, and keep the names.

## Logo variants

| File | Use |
| --- | --- |
| `zohelo.svg` | Default lockup: `accent` mark + `ink` wordmark. zohelo.com header, documents. |
| `zohelo-bi.svg` | Product lockup for bi.zohelo.com (suffix in `ink-3`). |
| `zohelo-data.svg` | Product lockup for data.zohelo.com. |
| `zohelo-mono.svg` | Single ink (`ink`) for print, fax-like contexts, one-colour embroidery. |
| `zohelo-reversed.svg`, `zohelo-bi-reversed.svg` | On `surface-inverse`: white wordmark, `seq-1` mark. Footers and dark bands. |
| `mark.svg`, `mark-mono.svg` | The mark alone: collapsed sidebar rail, small spaces, watermark on charts exported as PNG. |
| `app-icon.svg` | 512px square, white mark on `accent`, 112px corner radius. PWA icon, social avatars. |
| `favicon.svg` | 32px version of the app icon. |

In the product header the lockup is set live (mark SVG + "zohelo" in Inter Tight 700 17px + product name in Inter 500 13px `ink-3`) so it scales crisply; the files are for everything else.

## Rules

- **Clear space:** at least the height of one bar (3 units) on every side of the mark, and half the wordmark height around a lockup.
- **Minimum size:** mark 16px; lockup 80px wide on screen.
- **Colours:** only the combinations in the files above. Never put the `accent` mark on `surface-inverse` (contrast 2.3:1); use the reversed files.
- **Never:** stretch, rotate, recolour the bars individually, add effects, outline, place on photos, or rebuild the wordmark in another font.

## Backgrounds and surfaces

| Ground | Token | Use |
| --- | --- | --- |
| Page canvas | `canvas` #F6F7F9 | Behind cards in every app page. |
| Surface | `surface` #FFFFFF | Cards, header, sidebar, menus. |
| Sunken | `surface-sunken` #F9FAFB | Inputs, table header rows. |
| Inverse band | `surface-inverse` #111827 | zohelo.com footer, reversed logo, tooltips. |
| Band | `band` #E8EFF8 | Only inside charts for target ranges. |

No gradients, photos or textures behind content. The only decorative graphic is a real chart (see `social-card.svg`): if a page needs a visual, show data.

## Social and sharing image

`social-card.svg` (1200×630): `canvas` ground, lockup top-left, the page claim in Inter Tight 700, one line of context in Inter 500 `ink-2`, and a real chart line in `series-1` with its band. Per-page cards follow the same layout with the page's own title and its main chart.

## Fonts

Inter Tight (600, 700) for display, Inter (400, 500, 600) for text, both from Google Fonts with `display=swap` and a `system-ui` fallback. Polish characters (ą ć ę ł ń ó ś ź ż) are in the latin-ext subset: always load it.
