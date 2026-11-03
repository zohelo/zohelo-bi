// Guide index: what the template is, who uses which part, a card per section (in the sidebar groups), the
// definition of done.

import { Link } from "../../router";
import { GSection, Rules, SpecTable, useT } from "./parts";
import { GUIDE_GROUPS, GUIDE_SECTIONS, sectionPath } from "./sections";

export function IndexPage() {
  const { t, pl } = useT();
  return (
    <>
      <GSection
        id="g-what"
        title={t("Czym jest szablon", "What the template is")}
        lead={t(
          "Szablon zohelo działa jak firmowy szablon prezentacji: zestaw marki, układy wzorcowe, system pulpitu, biblioteka wykresów, komponenty oraz zasady ich budowy i testowania. Używamy tego, co tu jest; nie wymyślamy nowego wyglądu dla każdego produktu.",
          "The zohelo template works like a company presentation template: a brand kit, master layouts, a dashboard system, a chart library, components and the rules for building and testing them. Use what is here; do not invent a new look per product.",
        )}
      >
        <ol className="g-principles">
          {[
            [
              t("Najpierw liczba, potem dowód.", "The number first, then the evidence."),
              t(
                "Strona zaczyna się od tego, po co przyszedł czytelnik, a potem pokazuje, jak to zmierzono i skąd pochodzi.",
                "A page leads with what the reader came for, then shows how it was measured and where it came from.",
              ),
            ],
            [
              t("Jeden akcent, wiele kolorów danych.", "One accent, many data colours."),
              t(
                "accent to jedyny kolor interfejsu. Kolory danych występują tylko w wykresach.",
                "accent is the only UI colour. Data colours appear only in charts.",
              ),
            ],
            [
              t("Neutralnie, bez oceniania.", "Neutral, not judgemental."),
              t(
                "Zmiany pokazuje strzałka i tekst ink-2. Zielony i czerwony nie mówią, że coś jest dobre lub złe.",
                "Changes are an arrow and ink-2 text. Green and red never say good or bad.",
              ),
            ],
            [
              t("Każdą wartość da się odczytać bez koloru, najechania i myszy.", "Every value reads without colour, hover or a mouse."),
              t(
                "Legendy, podpisy bezpośrednie, przełącznik Wykres | Tabela, klawiatura.",
                "Legends, direct labels, a Chart | Table toggle, keyboard.",
              ),
            ],
            [
              t("Ten sam szkielet wszędzie.", "Same skeleton everywhere."),
              t(
                "Powłoka aplikacji dla bi i data, powłoka serwisu dla zohelo.com, te same tokeny i komponenty.",
                "App shell for bi and data, site shell for zohelo.com, the same tokens and components.",
              ),
            ],
            [
              t("Najpierw projekt, potem kod.", "Design before code."),
              t("Żadnej pracy wizualnej w kodzie bez makiety w szablonie.", "No visual work in code without a mockup in the template."),
            ],
          ].map(([h, d], i) => (
            <li key={i}>
              <strong>{h}</strong> <span>{d}</span>
            </li>
          ))}
        </ol>
      </GSection>

      <GSection id="g-who" title={t("Kto korzysta z której części", "Who uses which part")}>
        <SpecTable
          caption={t("Kto korzysta z której części przewodnika", "Who uses which part of the guide")}
          head={[t("Rola", "Role"), t("Zaczyna od", "Starts with"), t("Odpowiada za", "Owns")]}
          rows={[
            [
              t("Projektant", "Designer"),
              <>
                <Link to="/przewodnik/marka">{t("Marka", "Brand")}</Link>,{" "}
                <Link to="/przewodnik/kolory-i-typografia">{t("Kolory i typografia", "Colour and type")}</Link>,{" "}
                <Link to="/przewodnik/uklad">{t("Układ strony", "Page layout")}</Link>
              </>,
              t(
                "Jak produkt wygląda; makiety w szablonie, dane przykładowe.",
                "How the product looks; mockups in the template, sample data.",
              ),
            ],
            [
              t("Ekspert dziedzinowy", "Domain expert"),
              <>
                <Link to="/przewodnik/tresci">{t("Treści i liczby", "Content and numbers")}</Link>,{" "}
                <Link to="/przewodnik/wykresy">{t("Biblioteka wykresów", "Chart library")}</Link>,{" "}
                <Link to="/przewodnik/metodologia">{t("Metodologia", "Methodology")}</Link>
              </>,
              t(
                "Które wskaźniki, ich definicje i źródła, który wykres odpowiada na które pytanie.",
                "Which KPIs, their definitions and sources, which chart answers which question.",
              ),
            ],
            [
              t("Programista", "Developer"),
              <>
                <Link to="/przewodnik/komponenty">{t("Komponenty", "Components")}</Link>,{" "}
                <Link to="/przewodnik/dostepnosc">{t("Dostępność", "Accessibility")}</Link>,{" "}
                <Link to="/przewodnik/tworzenie-i-testy">{t("Tworzenie i testy", "Building and testing")}</Link>
              </>,
              t(
                "Budowa z zatwierdzonej makiety, tokeny i komponenty bez zmian, testy.",
                "Building from an approved mockup, tokens and components as specified, tests.",
              ),
            ],
          ]}
        />
      </GSection>

      <GSection
        id="g-sections"
        title={t("Części przewodnika", "Guide pages")}
        lead={t("Te same grupy co w menu bocznym pod pozycją Przewodnik.", "The same groups as in the sidebar, under Guide.")}
      >
        {GUIDE_GROUPS.map((g) => (
          <div key={g.key} className="g-stack">
            <h3 className="g-h3">{pl ? g.pl : g.en}</h3>
            <ol className="g-cards">
              {GUIDE_SECTIONS.filter((s) => s.group === g.key).map((s) => (
                <li key={s.slug}>
                  <Link to={sectionPath(s.slug)} className="zt-card g-cardlink">
                    <span className="g-cardlink__n" aria-hidden="true">
                      {String(GUIDE_SECTIONS.indexOf(s) + 1).padStart(2, "0")}
                    </span>
                    <span className="g-cardlink__name">{pl ? s.pl : s.en}</span>
                    <span className="g-cardlink__sum">{pl ? s.sumPl : s.sumEn}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </GSection>

      <GSection
        id="g-done"
        title={t("Definicja ukończenia w skrócie", "Definition of done in short")}
        lead={
          <>
            {t(
              "Zmiana interfejsu jest gotowa dopiero, gdy wszystko poniżej jest prawdą. Pełna tabela: ",
              "A UI change is done only when everything below is true. Full table: ",
            )}
            <Link to="/przewodnik/tworzenie-i-testy">{t("Tworzenie i testy", "Building and testing")}</Link>.
          </>
        }
      >
        <Rules
          items={[
            t("Jest zatwierdzona makieta w szablonie.", "An approved mockup exists in the template."),
            t("axe-core przy 1440, 768 i 390 px: 0 naruszeń.", "axe-core at 1440, 768 and 390px: 0 violations."),
            t("Każdy przystanek tabulatora ma widoczny pierścień fokusu.", "Every tab stop shows a visible focus ring."),
            t(
              "Brak przewijania strony w bok przy 1280, 1024, 768 i 390 px; tekst wykresów co najmniej 11 px.",
              "No sideways page scroll at 1280, 1024, 768 and 390px; chart text 11px or more.",
            ),
            t(
              "Ktoś obejrzał zrzuty 1440 i 390 px i poprawił błędy.",
              "Someone looked at the 1440 and 390 screenshots and fixed the defects.",
            ),
            t(
              "Wykresy zgodne z biblioteką; nowe kolory przeszły walidator palety.",
              "Charts follow the library; new colours pass the palette validator.",
            ),
            t(
              "Kluczowe ścieżki sprawdzone czytnikiem ekranu (NVDA, VoiceOver).",
              "Key flows checked with a screen reader (NVDA, VoiceOver).",
            ),
          ]}
        />
      </GSection>
    </>
  );
}
