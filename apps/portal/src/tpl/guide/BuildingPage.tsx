// Tworzenie i testy: who does what, the definition of done, commands, and known issues (same list as
// docs/design-template.md).

import { Code, GSection, Grid, Rules, SpecTable, useT } from "./parts";

export function BuildingPage() {
  const { t } = useT();
  return (
    <>
      <GSection id="g-roles" title={t("Kto za co odpowiada", "Who does what")}>
        <Grid cols={3}>
          {[
            {
              h: t("Projektant", "Designer"),
              d: t(
                "Pracuje tylko w szablonie (plansze projektowe i ten system), na danych przykładowych, i odpowiada za to, jak produkt wygląda.",
                "Works only in the template (design boards and this system), with sample data, and owns how it looks.",
              ),
            },
            {
              h: t("Ekspert dziedzinowy", "Domain expert"),
              d: t(
                "Dostarcza treść: które wskaźniki, ich definicje i źródła, który wykres odpowiada na które pytanie.",
                "Supplies the content: which KPIs, their definitions and sources, which charts answer which questions.",
              ),
            },
            {
              h: t("Programista", "Developer"),
              d: t(
                "Buduje z zatwierdzonej makiety. Bez makiety nie ma pracy wizualnej w kodzie; brakujący wzorzec najpierw dodaje projektant tutaj.",
                "Builds from an approved mockup. No visual work in code without one; a missing pattern is added here by the designer first.",
              ),
            },
          ].map((r) => (
            <section key={r.h} className="zt-card g-role" aria-label={r.h}>
              <h3 className="card-title">{r.h}</h3>
              <p>{r.d}</p>
            </section>
          ))}
        </Grid>
        <Rules
          title={t("Budowanie", "Building")}
          items={[
            t(
              "Tokeny po nazwie (zmienne CSS z tokens.json); żadnych wartości hex, rozmiarów pisma ani promieni wpisanych w komponent.",
              "Tokens by name (CSS custom properties from tokens.json); no hex values, font sizes or radii typed into components.",
            ),
            t(
              "Komponenty i typy wykresów zgodnie ze specyfikacją; odstępstwa najpierw trafiają do systemu, potem do kodu.",
              "Components and chart types as specified; deviations go into the system first, then into code.",
            ),
            t(
              "Wykresy z packages/visuals według zasad biblioteki; kit/zchart.js to wzorzec wizualny, nie kod produkcyjny.",
              "Charts from packages/visuals following the library rules; kit/zchart.js is the visual reference, not production code.",
            ),
            t(
              "Każdy wykres ma widok tabeli, jednozdaniowy aria-label, wersję na telefon i linię źródła.",
              "Every chart has a table view, a one-sentence aria-label, a phone variant and a source line.",
            ),
          ]}
        />
      </GSection>

      <GSection
        id="g-dod"
        title={t("Definicja ukończenia", "Definition of done")}
        lead={t(
          "Zmiana interfejsu jest gotowa tylko wtedy, gdy każdy punkt jest prawdą, a dowody są w pull requeście. axe, fokus, szerokości i zrzuty działają w CI przy każdym pull requeście i blokują scalenie.",
          "A UI change is done only when every item is true and the evidence is in the pull request. axe, focus, widths and screenshots run in CI on every pull request and block merging.",
        )}
      >
        <SpecTable
          caption={t("Definicja ukończenia", "Definition of done")}
          head={[t("Sprawdzenie", "Check"), t("Jak", "How"), t("Zaliczone, gdy", "Pass")]}
          rows={[
            [
              t("Makieta istnieje", "Mockup exists"),
              t("Link do planszy projektowej", "Link to the design board"),
              t("Zatwierdzona przez projektanta", "Approved by the designer"),
            ],
            [
              t("Automatyczna dostępność", "Automated accessibility"),
              t(
                "axe-core (WCAG 2.0/2.1/2.2 A+AA i dobre praktyki) na każdej zmienionej stronie przy 1440, 768 i 390 px",
                "axe-core (WCAG 2.0/2.1/2.2 A+AA + best practice) on every changed page at 1440, 768 and 390px",
              ),
              t("0 naruszeń", "0 violations"),
            ],
            [
              t("Pierścień fokusu", "Focus ring"),
              t("Skrypt przechodzi Tabem i sprawdza każdy przystanek", "A script tabs through the page and checks every stop"),
              t("Każdy przystanek widoczny; brak martwych linków", "Every stop visible; no dead links in the tab order"),
            ],
            [
              t("Szerokości", "Widths"),
              "1280, 1024, 768, 390 px",
              t(
                "Brak przewijania w bok; tekst wykresów ≥ 11 px; zrzut każdej",
                "No sideways scroll; chart text ≥ 11px; a screenshot of each",
              ),
            ],
            [
              t("Oczy na ekranie", "Eyes on screen"),
              t("Osoba lub agent ogląda zrzuty 1440 i 390", "A person or agent looks at the 1440 and 390 screenshots"),
              t("Bez nakładania, uciętego tekstu, kolizji, pustych miejsc", "No overlaps, clipped text, collisions, empty space"),
            ],
            [
              t("Zasady wykresów", "Chart rules"),
              t(
                "Walidator palety dla nowych kolorów; sprawdzenie z biblioteką",
                "Palette validator for new colours; check against the library",
              ),
              t("Walidator przechodzi; brak antywzorców", "Validator passes; no anti-pattern"),
            ],
            [
              t("Prawdziwe czytniki ekranu", "Real screen readers"),
              "NVDA + Chromium, VoiceOver + WebKit (Guidepup)",
              t(
                "Kluczowe komunikaty obecne (nazwy, role, stany, opisy wykresów)",
                "Key announcements present (names, roles, states, chart descriptions)",
              ),
            ],
            [
              t("Regresja wizualna", "Visual regression"),
              t("Porównanie zrzutów z zatwierdzoną makietą", "Screenshot comparison against the approved mockup"),
              t("Różnice wyjaśnione", "Differences explained"),
            ],
            [
              t("Audyt z ludźmi", "Human audit"),
              t("Płatny audyt z użytkownikami czytników ekranu", "Paid audit with screen-reader users"),
              t("Przed publicznym startem i raz w roku", "Before public launch and once a year"),
            ],
          ]}
        />
        <p className="g-p">
          {t(
            "Czego testy automatyczne nie powiedzą: axe-core znajduje około jednej trzeciej problemów dostępności; nie widzi ukrytego pierścienia fokusu, mylącej kolejności czytania ani wykresu, którego nikt nie rozumie. Dlatego oglądanie i audyt z ludźmi są częścią definicji.",
            "What automated tests cannot tell you: axe-core finds about a third of accessibility problems; it does not see a hidden focus ring, a confusing reading order or a chart nobody can understand. That is why eyes-on review and the human audit are part of done.",
          )}
        </p>
      </GSection>

      <GSection id="g-commands" title={t("Polecenia", "Commands")}>
        <Grid cols={2}>
          <div className="g-stack">
            <h3 className="g-h3">{t("Sprawdzenia przed commitem", "Checks before a commit")}</h3>
            <Code label={t("Polecenia sprawdzeń", "Check commands")}>
              {"bun run check\nbun run lint\nbun run test\nnpx prettier --check ."}
            </Code>
            <h3 className="g-h3">{t("Testy UI (axe, fokus, szerokości)", "UI tests (axe, focus, widths)")}</h3>
            <Code label={t("Polecenie testów UI", "UI test command")}>{"bun run test:ui"}</Code>
          </div>
          <div className="g-stack">
            <h3 className="g-h3">{t("Portal na danych przykładowych", "Portal on sample data")}</h3>
            <Code label={t("Budowanie i podgląd", "Build and preview")}>
              {"cd apps/portal\nVITE_DATA_MODE=dummy npx vite build\nnpx vite preview --port 4173"}
            </Code>
            <h3 className="g-h3">{t("Czytniki ekranu (lokalnie)", "Screen readers (local)")}</h3>
            <Code label={t("Polecenia czytników ekranu", "Screen-reader commands")}>
              {"cd tests/screen-reader\nnpm run nvda       # Windows\nnpm run voiceover  # macOS"}
            </Code>
            <h3 className="g-h3">{t("Walidator palety", "Palette validator")}</h3>
            <Code label={t("Polecenie walidatora palety", "Palette validator command")}>
              {'node <dataviz skill>/scripts/validate_palette.js "<hex,…>" --mode light'}
            </Code>
          </div>
        </Grid>
      </GSection>

      <GSection id="g-issues" title={t("Znane problemy", "Known issues")}>
        <Rules
          items={[
            t(
              "Czytnik ekranu: w automatyzacji NVDA nic nie mówi na długiej planszy dokumentacji wykresów (strona bez elementów z fokusem); VoiceOver ją czyta. Test NVDA dla tej planszy jest oznaczony fixme do wyjaśnienia. Wszystkie ścieżki dashboardu przechodzą na obu czytnikach.",
              "Screen reader: under automation NVDA speaks nothing on the long Charts documentation board (no focusable element); VoiceOver reads it. The NVDA check for that board is marked fixme until investigated. All dashboard flows pass on both readers.",
            ),
            t(
              "Czytnik ekranu: w automatyzacji VoiceOver milknie po wniosku dashboardu dziedziny w portalu szablonu (/d/economy/prices); NVDA czyta dalej do wykresu i przełącznika Wykres | Tabela. Test VoiceOver tej ścieżki jest oznaczony fixme do wyjaśnienia.",
              "Screen reader: under automation VoiceOver goes silent after the lead of a template domain dashboard (/d/economy/prices); NVDA reads on to the chart and its Chart | Table toggle. The VoiceOver check for that flow is marked fixme until investigated.",
            ),
            t(
              "Konta są zapowiedziane, nie zbudowane: „Zaloguj się” otwiera tylko informację (dostęp bez logowania zostaje; zapisane widoki, powiadomienia i plany dla zespołów później). Strona główna jest przeprojektowywana osobno.",
              "Accounts are announced, not built: “Zaloguj się” (Sign in) only opens a notice (free access without signing in stays; saved views, alerts and team plans later). The home page is being redesigned separately.",
            ),
            t(
              "Biblioteka wykresów jest w budowie: typy bez próbki pokazują w przewodniku „Przykład w przygotowaniu”, a karty wykresów rysują zastępczy wykres, dopóki ZChart go nie zastąpi.",
              "The chart library is being built: types without a sample show “Example in preparation” in the guide, and chart cards draw a placeholder until ZChart replaces it.",
            ),
            t("Ciemny motyw nie jest zaprojektowany: nie wdrażamy go.", "The dark theme is not designed: do not ship one."),
            t(
              "Znak to znak roboczy z pilotażu; oficjalny logotyp jeszcze nie istnieje.",
              "The mark is the working mark from the pilot; there is no official logo yet.",
            ),
            t("Otwarte: powłoka strony startowej data.zohelo.com.", "Open: the shell of the data.zohelo.com landing page."),
          ]}
        />
      </GSection>
    </>
  );
}
