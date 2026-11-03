// Kolory i typografia: every colour token as a swatch (name, value, usage, contrast computed from the value),
// the type scale rendered with the real classes, spacing, radius and shadow scales. Source: tokens.json.

import { colorGroups, contrastMode, contrast, contrastGrade, fmtRatio, referenceOf, resolveColor, TOKENS, type ColorToken } from "./tokens";
import { GSection, Rules, SpecTable, Tok, useT } from "./parts";

const SURFACE = resolveColor("{surface}");
const INK = resolveColor("{ink}");
const INVERSE = resolveColor("{surface-inverse}");

function Swatch({ token }: { token: ColorToken }) {
  const { t, lang } = useT();
  const value = resolveColor(token.value);
  const ref = referenceOf(token.value);
  const onSurface = contrast(value, SURFACE);
  const withInk = contrast(value, INK);
  const mode = contrastMode(token.name);
  const grade = onSurface === null ? null : contrastGrade(onSurface);
  const gradeText =
    grade === "text"
      ? t("tekst i grafika", "text and graphics")
      : grade === "graphic"
        ? t("duży tekst i grafika", "large text and graphics")
        : t("poniżej 3:1, tylko z podpisem", "below 3:1, labels needed");
  return (
    <li className="g-swatch" id={`token-${token.name}`}>
      <span className="g-swatch__chip" style={{ background: `var(--${token.name})` }} aria-hidden="true" />
      <span className="g-swatch__body">
        <span className="g-swatch__name">
          <Tok>{token.name}</Tok>
          <span className="g-swatch__value">{ref ? `→ ${ref} · ${value}` : value}</span>
        </span>
        <span className="g-swatch__usage" lang="en">
          {token.usage}
        </span>
        {onSurface !== null && withInk !== null ? (
          <span className="g-swatch__contrast">
            {mode === "inverse" ? (
              <>
                {t("Na surface-inverse", "On surface-inverse")} <strong>{fmtRatio(contrast(value, INVERSE) ?? 0, lang)}</strong>
              </>
            ) : mode === "ground" ? (
              <>
                {t("Tekst ink na tym tle", "ink text on this ground")} <strong>{fmtRatio(withInk, lang)}</strong>
              </>
            ) : (
              <>
                {t("Na surface", "On surface")} <strong>{fmtRatio(onSurface, lang)}</strong> ({gradeText})
                {mode === "both" ? (
                  <>
                    {" "}
                    · {t("z ink", "with ink")} <strong>{fmtRatio(withInk, lang)}</strong>
                  </>
                ) : null}
              </>
            )}
          </span>
        ) : null}
      </span>
    </li>
  );
}

export function ColorTypePage() {
  const { t } = useT();
  const groups = colorGroups();
  return (
    <>
      <GSection
        id="g-colors"
        title={t("Kolory", "Colours")}
        lead={t(
          "Tokeny używamy tylko po nazwie (var(--ink-2)). Wartość szesnastkowa w kodzie produktu to błąd. Kontrast jest wyliczany z wartości tokenu wzorem WCAG 2.x i zaokrąglany w dół. Opisy użycia pochodzą wprost z tokens.json (po angielsku).",
          "Use tokens by name only (var(--ink-2)). A hex value in product code is a defect. Contrast is computed from the token value with the WCAG 2.x formula and rounded down.",
        )}
      >
        <Rules
          items={[
            t("Tekst 4,5:1; duży tekst (24 px, 19 px pogrubiony) i grafika niosąca znaczenie 3:1.", "Text 4.5:1; large text (24px, 19px bold) and meaningful graphics 3:1."),
            t("Kolory danych (series, seq, div) tylko w wykresach: nigdy na przyciskach, linkach ani w tekście.", "Data colours (series, seq, div) only in charts: never on buttons, links or text."),
            t("Kolory statusu tylko w etykietach statusu; nigdy w wykresach ani dla oceny wartości.", "Status colours only in status tags; never in charts or to judge a value."),
            t("Ciemnego motywu jeszcze nie ma: nie wdrażamy go, dopóki nie zostanie zaprojektowany i sprawdzony tutaj.", "There is no dark theme yet: do not ship one until it is designed and validated here."),
          ]}
        />
        {groups.map((g) => (
          <div key={g.key} className="g-colorgroup">
            <h3 className="g-h3">{t(g.pl, g.en)}</h3>
            <p className="g-muted">{t(g.notePl, g.noteEn)}</p>
            <ul className="g-swatches">
              {g.tokens.map((tok) => (
                <Swatch key={tok.name} token={tok} />
              ))}
            </ul>
          </div>
        ))}
      </GSection>

      <GSection
        id="g-type"
        title={t("Skala pisma", "Type scale")}
        lead={t(
          "Inter Tight dla tytułów i dużych liczb, Inter dla reszty. Duże liczby mają cyfry proporcjonalne; kolumny liczb tabular-nums. Próbki poniżej są złożone prawdziwymi klasami z tokens.css.",
          "Inter Tight for titles and big numbers, Inter for everything else. Hero numbers use proportional figures; columns of numbers use tabular-nums. The samples below are set with the real classes from tokens.css.",
        )}
      >
        {TOKENS.type.groups.map((grp) => (
          <div key={grp.name} className="g-typegroup">
            <h3 className="g-h3">{grp.name === "Display" ? t("Tytuły i liczby (Inter Tight)", "Display (Inter Tight)") : t("Tekst (Inter)", "Text (Inter)")}</h3>
            <ul className="g-typelist">
              {grp.styles.map((s) => (
                <li key={s.name} className="g-typerow">
                  <div className="g-typerow__meta">
                    <Tok>{s.name}</Tok>
                    <span className="g-muted">
                      {s.fontSize.replace("px", "")}/{s.lineHeight.replace("px", "")} · {s.fontWeight}
                      {s.letterSpacing ? ` · ${s.letterSpacing}` : ""}
                    </span>
                    <span className="g-typerow__usage" lang="en">
                      {s.usage}
                    </span>
                  </div>
                  <p className={`g-typerow__sample ${s.name}${s.name === "tabular" ? " tnum" : ""}`}>{s.sample}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </GSection>

      <GSection
        id="g-space"
        title={t("Odstępy", "Spacing")}
        lead={t(
          "Podstawa 4 px. Siatka treści 12 kolumn, odstęp 16 px; margines strony 32 px na desktopie, 16 px na telefonie. Karty mają wypełnienie 18–20 px.",
          "4px base. Content grid of 12 columns with a 16px gap; page gutter 32px on desktop, 16px on phone. Cards pad 18–20px.",
        )}
      >
        <ul className="g-scale">
          {TOKENS.spacing.tokens.map((s) => (
            <li key={s.name} className="g-scale__row">
              <Tok>{s.name}</Tok>
              <span className="g-scale__value">{s.value}</span>
              <span className="g-scale__bar" style={{ width: `var(--${s.name})` }} aria-hidden="true" />
              <span className="g-scale__usage" lang="en">
                {s.usage}
              </span>
            </li>
          ))}
        </ul>
      </GSection>

      <GSection
        id="g-radius"
        title={t("Promienie i cienie", "Radii and shadows")}
        lead={t(
          "Karty radius-xl z obramowaniem 1 px line i bez cienia. Kontrolki radius-md. Etykiety i chipy radius-pill. Cienie tylko na warstwach pływających.",
          "Cards radius-xl with a 1px line border and no shadow. Controls radius-md. Tags and chips radius-pill. Shadows only on floating layers.",
        )}
      >
        <ul className="g-radii">
          {TOKENS.radius.tokens.map((r) => (
            <li key={r.name} className="g-radius">
              <span className="g-radius__box" style={{ borderRadius: `var(--${r.name})` }} aria-hidden="true" />
              <Tok>{r.name}</Tok>
              <span className="g-muted">{r.value}</span>
              <span className="g-radius__usage" lang="en">
                {r.usage}
              </span>
            </li>
          ))}
        </ul>
        <ul className="g-radii">
          {TOKENS.shadow.tokens.map((r) => (
            <li key={r.name} className="g-radius">
              <span className="g-radius__box g-radius__box--shadow" style={{ boxShadow: `var(--${r.name})` }} aria-hidden="true" />
              <Tok>{r.name}</Tok>
              <span className="g-radius__usage" lang="en">
                {r.usage}
              </span>
            </li>
          ))}
        </ul>
      </GSection>

      <GSection id="g-sizes" title={t("Rozmiary i progi szerokości", "Sizes and breakpoints")}>
        <SpecTable
          caption={t("Rozmiary i progi szerokości", "Sizes and breakpoints")}
          head={[t("Token", "Token"), t("Wartość", "Value"), t("Użycie", "Use")]}
          rows={[...TOKENS.size.tokens, ...TOKENS.breakpoint.tokens].map((s) => [<Tok key="n">{s.name}</Tok>, s.value, <span key="u" lang="en">{s.usage}</span>])}
        />
      </GSection>
    </>
  );
}
