// Dostępność: WCAG 2.2 AA requirements, keyboard, contrast pairs (computed from tokens), and what the
// screen-reader tests found: KPI tiles read as one string, the sidebar landmark, "wkrótce", spoken forms.
// Names and roles follow the template shell: sidebar search combobox, language menu, domain chevrons.

import { useEffect, useRef } from "react";
import { Link } from "../../router";
import { Sr } from "../ui/blocks";
import { contrast, contrastGrade, fmtRatio, resolveColor } from "./tokens";
import { SampleKpi } from "./DashboardPage";
import { DoDont, Example, GSection, Grid, Rules, SpecTable, Tok, useT } from "./parts";
import { accessibleText } from "./util";

const PAIRS: [string, string][] = [
  ["ink", "surface"],
  ["ink-2", "surface"],
  ["ink-3", "surface"],
  ["ink-muted", "surface"],
  ["ink-muted", "canvas"],
  ["accent", "surface"],
  ["accent-strong", "accent-tint"],
  ["on-inverse", "accent"],
  ["on-inverse", "surface-inverse"],
  ["status-current-fg", "status-current-bg"],
  ["status-preliminary-fg", "status-preliminary-bg"],
  ["sample-fg", "sample-bg"],
  ["status-error-fg", "status-error-bg"],
  ["series-1", "surface"],
  ["series-context", "surface"],
  ["series-3", "surface"],
  ["ink", "seq-2"],
  ["on-inverse", "seq-4"],
];

function HeardTile() {
  const { t, lang } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const out = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    // Read after render: the tile is the real component, so the transcript follows any change to it.
    if (ref.current && out.current) out.current.textContent = `„${accessibleText(ref.current)}”`;
  });
  return (
    <Grid cols={2}>
      <Example caption={t("Prawdziwy kafelek KpiTile.", "The real KpiTile component.")}>
        <div className="g-kpiwrap" ref={ref}>
          <SampleKpi />
        </div>
      </Example>
      <div className="g-stack">
        <div className="g-transcript g-transcript--bad">
          <p className="g-verdict g-verdict--bad">{t("Bez pomocy (zapis z testu NVDA)", "Without help (NVDA test transcript)")}</p>
          <p lang="pl">„Inflacja HICPwrz 20262,9 procent wypełniony trójkąt skierowany w dół 0,1 pp m slesz m”</p>
        </div>
        <div className="g-transcript">
          <p className="g-verdict g-verdict--ok">
            {t("Z szablonem (wyliczone z kafelka obok)", "With the template (computed from the tile)")}
          </p>
          <p lang={lang} ref={out} />
        </div>
      </div>
    </Grid>
  );
}

export function AccessibilityPage() {
  const { t, lang } = useT();
  return (
    <>
      <GSection
        id="g-target"
        title={t("Wymagania", "Requirements")}
        lead={t(
          "Cel: WCAG 2.2 AA na każdej stronie w każdym portalu. To wymagania, nie sugestie.",
          "Target: WCAG 2.2 AA on every page in every portal. These are requirements, not suggestions.",
        )}
      >
        <Grid cols={2}>
          <Rules
            title={t("Struktura", "Structure")}
            items={[
              t("Jedno h1 na stronę, nagłówki po kolei.", "One h1 per page; headings in order."),
              <>
                {t("Landmarki:", "Landmarks:")} <Tok>header</Tok>, <Tok>nav</Tok>{" "}
                {t(
                  "(z nazwami: „Główna”, „Ścieżka”, „Sekcje strony”, „Strony dziedziny”),",
                  "(labelled: “Główna”, “Ścieżka”, “Sekcje strony”, “Strony dziedziny”),",
                )}{" "}
                <Tok>main</Tok> {t("z", "with")} <Tok>id=&quot;tresc&quot;</Tok>, <Tok>footer</Tok>.
              </>,
              t("Pierwszy element z fokusem: link „Przejdź do treści”.", "First focusable element: the “Przejdź do treści” skip link."),
              <>
                <Tok>aria-current=&quot;page&quot;</Tok>{" "}
                {t("na aktywnym elemencie menu i końcu ścieżki;", "on the active sidebar item and the breadcrumb end;")}{" "}
                <Tok>aria-current=&quot;location&quot;</Tok>{" "}
                {t("na przycisku czytanej sekcji dashboardu.", "on the button of the dashboard section being read.")}
              </>,
              <>
                {t(
                  "Dashboardy, Przewodnik i strzałka obok każdej dziedziny to przyciski z",
                  "Dashboards, Guide and the chevron next to each domain are buttons with",
                )}{" "}
                <Tok>aria-expanded</Tok> {t("i", "and")} <Tok>aria-controls</Tok>
                {t(
                  "; nazwa dziedziny to link do jej przeglądu, a strzałka ma nazwę „Rozwiń: <dziedzina>” / „Zwiń: <dziedzina>”.",
                  "; the domain name is a link to its overview, and the chevron is named “Rozwiń: <domain>” / “Zwiń: <domain>” (Expand / Collapse).",
                )}
              </>,
              <>
                {t("Wyszukiwarka w menu to", "The sidebar search is a")} <Tok>combobox</Tok> {t("z listą", "with a")} <Tok>listbox</Tok>{" "}
                {t("„Wyniki wyszukiwania”; menu języka to", "“Wyniki wyszukiwania”; the language menu is a")} <Tok>menu</Tok>{" "}
                {t("z", "with")} <Tok>menuitemradio</Tok>
                {t(", a każda pozycja ma atrybut lang swojego języka.", ", each item carrying the lang attribute of its language.")}
              </>,
            ]}
          />
          <Rules
            title={t("Cele i rozmiary", "Targets and sizing")}
            items={[
              t(
                "Kontrolki 36 px na desktopie, 44 px na telefonie; wszystko klikalne co najmniej 24×24 px.",
                "Controls 36px desktop, 44px on phone; anything clickable at least 24×24px.",
              ),
              t(
                "Tekst nigdy poniżej 11 px (podziałki wykresów) ani 12 px (interfejs).",
                "Text never below 11px (chart ticks) or 12px (UI).",
              ),
              t(
                "Powiększenie do 200% bez utraty treści i bez przewijania w bok.",
                "Zoom to 200% without loss of content or sideways scrolling.",
              ),
              <>
                <Tok>lang=&quot;pl&quot;</Tok> {t("na stronach polskich,", "on Polish pages,")} <Tok>lang=&quot;en&quot;</Tok>{" "}
                {t("na angielskich: czytnik używa właściwego głosu.", "on English ones, so readers use the right voice.")}
              </>,
              t(
                'Wykres: role="img" + aria-label z wnioskiem; tabela dla każdego wykresu; dymek nigdy jedynym dostępem; nic tylko kolorem.',
                'Charts: role="img" + aria-label with the finding; a table view for every chart; the tooltip never the only access; nothing by colour alone.',
              ),
            ]}
          />
        </Grid>
      </GSection>

      <GSection
        id="g-keyboard"
        title={t("Klawiatura", "Keyboard")}
        lead={t(
          "Wszystko działa z samej klawiatury, w kolejności wizualnej. Widoczny pierścień fokusu (2 px focus, odsunięty o 2 px) na każdym elemencie. outline: none bez zamiennika to błąd. Spróbuj Tab na tej stronie.",
          "Everything works with the keyboard alone, in visual order. A visible focus ring (2px focus, 2px offset) on every focusable element. outline: none without a replacement is a defect. Try Tab on this page.",
        )}
      >
        <SpecTable
          caption={t("Klawisze", "Keys")}
          head={[t("Klawisz", "Key"), t("Działanie", "Does")]}
          rows={[
            ["Tab / Shift+Tab", t("Następny / poprzedni element w kolejności wizualnej.", "Next / previous element in visual order.")],
            [
              "Enter",
              t(
                "Otwiera link, uruchamia przycisk, wybiera element menu, otwiera wybrany wynik wyszukiwania.",
                "Follows a link, activates a button, picks a menu item, opens the chosen search hit.",
              ),
            ],
            [
              t("Spacja", "Space"),
              t("Uruchamia przycisk i przełącznik (aria-pressed).", "Activates a button and a toggle (aria-pressed)."),
            ],
            [
              "↑ ↓",
              t(
                'Ruch w menu akcji i menu języka (role="menu") oraz w wynikach wyszukiwarki w menu bocznym.',
                'Moves within an action menu and the language menu (role="menu") and through the sidebar search results.',
              ),
            ],
            [
              "Esc",
              t(
                "Zamyka menu, panel konta i panel menu na telefonie; fokus wraca do przycisku, który je otworzył. W wyszukiwarce czyści pole.",
                "Closes menus, the account panel and the phone drawer; focus returns to the button that opened them. In the search field it clears the field.",
              ),
            ],
            [
              "Ctrl K",
              t(
                "Przenosi fokus do wyszukiwarki w menu bocznym (w pasku ikon otwiera jej panel).",
                "Focuses the sidebar search (in the icon rail it opens its panel).",
              ),
            ],
          ].map(([k, d]) => [
            <kbd className="zt-kbd" key="k">
              {k}
            </kbd>,
            d,
          ])}
        />
        <Example
          caption={t(
            "Pole wyszukiwania pokazuje pierścień na całym polu (label:focus-within), bo samo pole tekstowe go nie ma.",
            "A search field shows the ring on the whole field (label:focus-within) because the input itself has none.",
          )}
        >
          <div className="g-row">
            <button type="button" className="zt-btn">
              {t("Przycisk z fokusem", "Button with focus")}
            </button>
            <label className="zt-search g-grow">
              <input
                type="search"
                aria-label={t("Pole z pierścieniem na etykiecie", "Field ringed on its label")}
                placeholder={t("Kliknij lub Tab", "Click or Tab")}
              />
            </label>
          </div>
        </Example>
      </GSection>

      <GSection
        id="g-contrast"
        title={t("Kontrast", "Contrast")}
        lead={t(
          "Tekst 4,5:1 (3:1 od 24 px lub 19 px pogrubionego). Grafika niosąca znaczenie (znaczniki wykresu, pierścień fokusu, obramowania niosące stan) 3:1. Używamy tylko par z tej tabeli; liczby wylicza strona z wartości tokenów.",
          "Text 4.5:1 (3:1 at 24px+ or 19px bold). Meaningful graphics (chart marks, focus ring, borders carrying state) 3:1. Use only the pairs in this table; the page computes the ratios from the token values.",
        )}
      >
        <SpecTable
          caption={t("Pary kolorów i ich kontrast", "Colour pairs and their contrast")}
          head={[t("Pierwszy plan", "Foreground"), t("Tło", "Background"), t("Kontrast", "Ratio"), t("Do czego wystarcza", "Good for")]}
          numeric={[false, false, true, false]}
          rows={PAIRS.map(([fg, bg]) => {
            const r = contrast(resolveColor(`{${fg}}`), resolveColor(`{${bg}}`)) ?? 0;
            const g = contrastGrade(r);
            return [
              <span className="g-pair" key="f">
                <i style={{ background: `var(--${fg})` }} aria-hidden="true" />
                <Tok>{fg}</Tok>
              </span>,
              <span className="g-pair" key="b">
                <i style={{ background: `var(--${bg})` }} aria-hidden="true" />
                <Tok>{bg}</Tok>
              </span>,
              fmtRatio(r, lang),
              g === "text"
                ? t("tekst", "text")
                : g === "graphic"
                  ? t("duży tekst, grafika", "large text, graphics")
                  : t("tylko z podpisem lub tabelą", "only with labels or a table"),
            ];
          })}
        />
        <Rules
          items={[
            t(
              "Jasne kolory serii poniżej 3:1 potrzebują podpisów bezpośrednich lub tabeli.",
              "Light series colours below 3:1 need direct labels or a table.",
            ),
            t(
              "Skale w klasach zaczynają się od seq-1; wypełnienie pasma zawsze ma przerywane krawędzie.",
              "Binned scales start at seq-1; band fills always have dashed edges.",
            ),
          ]}
        />
      </GSection>

      <GSection
        id="g-sr"
        title={t("Co pokazały testy z czytnikami ekranu", "What the screen-reader tests found")}
        lead={t(
          "Kluczowe ścieżki sprawdzamy NVDA (Windows, Chromium) i VoiceOver (macOS, WebKit). Te wnioski są już wbudowane w komponenty.",
          "Key flows are checked with NVDA (Windows, Chromium) and VoiceOver (macOS, WebKit). These findings are built into the components.",
        )}
      >
        <h3 className="g-h3">{t("1. Kafelek KPI czytany jednym ciągiem", "1. KPI tiles read as one string")}</h3>
        <p className="g-p">
          {t(
            "Bez pomocy czytnik skleja etykietę, okres i wartość i czyta symbole dosłownie. Szablon wstawia ukryty przecinek między fakty, ukrywa strzałkę i skróty (aria-hidden) i dodaje formę mówioną w zt-sr.",
            "Without help a reader runs label, period and value together and speaks symbols literally. The template adds a hidden comma between facts, hides the arrow and abbreviations (aria-hidden) and adds the spoken form in zt-sr.",
          )}
        </p>
        <HeardTile />

        <h3 className="g-h3">{t("2. Menu boczne to nav, nie aside", "2. The sidebar is a nav, not an aside")}</h3>
        <DoDont
          ok={<code className="g-tok">&lt;nav aria-label=&quot;Główna&quot;&gt;… &lt;div role=&quot;search&quot;&gt;</code>}
          bad={<code className="g-tok">&lt;aside&gt;</code>}
          okNote={t(
            "Czytnik ogłasza „nawigacja Główna”; wyszukiwarka jest w środku jako region wyszukiwania.",
            "Readers announce “Główna navigation”; search sits inside as a search region.",
          )}
          badNote={t(
            "VoiceOver ogłasza aside jako region uzupełniający, a menu nie jest uzupełnieniem.",
            "VoiceOver announces an aside as a complementary region, and the menu is not complementary.",
          )}
        />

        <h3 className="g-h3">{t("3. „wkrótce” nie zlewa się z nazwą", "3. “wkrótce” does not merge with the label")}</h3>
        <Grid cols={2}>
          <Example
            ground="surface"
            caption={t(
              "Niedostępny element: aria-disabled, tabindex=-1, ukryty przecinek przed „wkrótce”.",
              "Unavailable item: aria-disabled, tabindex=-1, a hidden comma before “wkrótce”.",
            )}
          >
            <div className="zt-nav-item" aria-disabled="true" role="link" tabIndex={-1}>
              <span className="t-grow">
                {t("Zdrowie", "Health")}
                <Sr>, </Sr>
              </span>
              <span className="g-soon">{t("wkrótce", "soon")}</span>
            </div>
          </Example>
          <Rules
            items={[
              t(
                "Bez przecinka NVDA czytało „Zdrowiewkrótce” jako jedno słowo.",
                "Without the comma NVDA read “Zdrowiewkrótce” as one word.",
              ),
              t(
                "Niedostępne elementy nie przyjmują fokusu; „wkrótce” w ink-muted (4,8:1), ikona w ink-disabled.",
                "Unavailable items take no focus; “wkrótce” in ink-muted (4.8:1), icon in ink-disabled.",
              ),
            ]}
          />
        </Grid>

        <h3 className="g-h3">{t("4. Zasada form mówionych", "4. The spoken-form rule")}</h3>
        <Rules
          items={[
            t(
              "Wszędzie, gdzie symbol lub skrót statystyczny niesie znaczenie (zmiany w KPI, delty w tabelach), ukrywamy go i dodajemy słowa.",
              "Wherever a symbol or statistical abbreviation carries meaning (KPI changes, table deltas), hide it and add the words.",
            ),
            t(
              "▼/▲ → spadek o / wzrost o; pp → punktu procentowego; m/m → w porównaniu z poprzednim miesiącem; r/r → w porównaniu z poprzednim rokiem.",
              "▼/▲ → spadek o / wzrost o; pp → punktu procentowego; m/m → w porównaniu z poprzednim miesiącem; r/r → w porównaniu z poprzednim rokiem.",
            ),
            <>
              {t(
                "Formy mówione robi fmtChange w format.ts. Więcej przykładów w",
                "fmtChange in format.ts produces the spoken forms. More examples in",
              )}{" "}
              <Link to="/przewodnik/tresci#g-spoken">{t("Treściach i liczbach", "Content and numbers")}</Link>.
            </>,
          ]}
        />
      </GSection>
    </>
  );
}
