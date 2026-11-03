// Treści i liczby: voice, titles as findings, numbers, units, periods and spoken forms, with correct and
// incorrect examples. Spoken forms are produced by the same fmtChange the portal uses.

import { usePage } from "../context";
import { fmtChange, fmtNumber } from "../format";
import { DoDont, GSection, Rules, SpecTable, useT } from "./parts";

export function ContentPage() {
  const { t, pl } = useT();
  const { catalog } = usePage();
  const spoken = [
    { v: 2.9, p: 3.0, unit: "pct", basis: "m/m" as const },
    { v: 5.4, p: 4.9, unit: "pct", basis: "r/r" as const },
    { v: 7480, p: 7120, unit: "pln", basis: "r/r" as const },
    { v: 4.26, p: 4.26, unit: "rate_fx", basis: "m/m" as const },
  ].map((x) => fmtChange(x.v, x.p, x.unit, x.basis, catalog, "pl"));
  const n = (v: number, d = 1) => fmtNumber(v, "pl", d);

  return (
    <>
      <GSection
        id="g-voice"
        title={t("Głos", "Voice")}
        lead={t(
          "Teksty w produkcie są po polsku (angielski przez PL | EN). Piszemy jak staranny statystyk rozmawiający z ciekawym dorosłym: prosto, dokładnie, bez zachwytów.",
          "Product copy is Polish (English via PL | EN). Write as a careful statistician talking to a curious adult: plain, exact, no hype.",
        )}
      >
        <Rules
          items={[
            t(
              "Wielka litera tylko na początku zdania („Pobierz dane”, nie „Pobierz Dane”). Bez wykrzykników i emoji.",
              "Sentence case everywhere (“Pobierz dane”, not “Pobierz Dane”). No exclamation marks, no emoji.",
            ),
            t(
              "Na kontrolkach bezosobowo lub tryb rozkazujący: „Pobierz dane”, „Pokaż tabelę”, „Przejdź do treści”.",
              "On controls impersonal or plain imperatives: “Pobierz dane”, “Pokaż tabelę”, “Przejdź do treści”.",
            ),
            t(
              "To, czego jeszcze nie ma, to „wkrótce”. Dane syntetyczne zawsze mają etykietę „Dane przykładowe”.",
              "Coming soon is “wkrótce”. Synthetic data is always labelled “Dane przykładowe”.",
            ),
          ]}
        />
      </GSection>

      <GSection id="g-titles" title={t("Tytuł mówi wniosek", "Titles state the finding")}>
        <DoDont
          ok={
            <p className="g-quote" lang="pl">
              <strong>Inflacja w paśmie celu od 2024</strong>
              <br />
              <span className="g-ink3">HICP r/r, %, miesięcznie, 2016–2026</span>
            </p>
          }
          bad={
            <p className="g-quote" lang="pl">
              <strong>Wykres inflacji</strong>
              <br />
              <span className="g-ink3">Dane</span>
            </p>
          }
          okNote={t(
            "Tytuł: wniosek. Podtytuł: miara, jednostka, częstotliwość, zakres.",
            "Title: the finding. Subtitle: measure, unit, frequency, range.",
          )}
          badNote={t("Tytuł opisuje typ wykresu; podtytuł nic nie mówi.", "The title names the chart type; the subtitle says nothing.")}
        />
        <DoDont
          ok={
            <p className="g-quote" lang="pl">
              Inflacja wróciła do pasma celu NBP.
            </p>
          }
          bad={
            <p className="g-quote" lang="pl">
              Tu znajdziesz dane o inflacji.
            </p>
          }
          okNote={t("Lead strony to wniosek.", "The page lead is a finding.")}
          badNote={t(
            "Lead opisuje stronę zamiast mówić, co z niej wynika.",
            "The lead describes the page instead of saying what it shows.",
          )}
        />
      </GSection>

      <GSection
        id="g-numbers"
        title={t("Liczby, jednostki i okresy", "Numbers, units and periods")}
        lead={t(
          "Przykłady po polsku; formatowanie robi format.ts (fmtNumber, fmtValue, fmtPeriod), nie ręcznie.",
          "Examples in Polish; format.ts does the formatting (fmtNumber, fmtValue, fmtPeriod), never by hand.",
        )}
      >
        <SpecTable
          caption={t("Poprawne i błędne zapisy liczb", "Correct and incorrect number formats")}
          head={[t("Reguła", "Rule"), t("Tak", "Do"), t("Nie", "Don't")]}
          rows={[
            [t("Przecinek dziesiętny", "Decimal comma"), `${n(2.9)}%`, "2.9%"],
            [t("Spacja tysięcy", "Space for thousands"), n(37490, 0), "37490 · 37,490"],
            [
              t("Jednostka po liczbie ze spacją, oprócz %", "Unit after the number with a space, except %"),
              `${n(4.26, 2)} zł · 845 mld € · ${n(2.9)}%`,
              "4,26zł · €845 mld · 2,9 %",
            ],
            [t("Punkty procentowe to „pp”", "Percentage points are “pp”"), `▼ ${n(0.1)} pp m/m`, `▼ ${n(0.1)}% m/m`],
            [t("Miesiące skrótem, małą literą", "Months abbreviated, lowercase"), "wrz 2026", "Wrzesień 2026 · 09/2026"],
            [t("Zakres z półpauzą", "Ranges with an en dash"), "2016–2026", "2016-2026 · 2016 do 2026"],
            [
              t("Zaokrąglenie do tego, co wspiera źródło", "Round to what the source supports"),
              `${n(5.4)}% · ${n(4.2634, 2)} zł · 37,57 mln`,
              "5,4271% · 4,2634 zł · 37 571 223",
            ],
            [
              t("Każda liczba ma okres i źródło obok", "Every number has a period and source next to it"),
              `${n(2.9)}% · wrz 2026 · Eurostat`,
              `${n(2.9)}%`,
            ],
          ].map((r) => [
            r[0],
            <span key="ok" lang="pl" className="g-num">
              {r[1]}
            </span>,
            <span key="bad" lang="pl" className="g-num g-num--bad">
              {r[2]}
            </span>,
          ])}
        />
      </GSection>

      <GSection
        id="g-spoken"
        title={t("Formy mówione", "Spoken forms")}
        lead={t(
          "Czytnik ekranu czyta symbole dosłownie: ▼ to „wypełniony trójkąt skierowany w dół”, m/m to „m slesz m”. Tam, gdzie symbol niesie znaczenie, ukrywamy go (aria-hidden) i dodajemy słowa w ukrytym tekście zt-sr. Poniższe formy wylicza ta sama funkcja fmtChange, której używają kafelki.",
          "Screen readers speak symbols literally: ▼ is “black down-pointing triangle”, m/m is “m slash m”. Where a symbol carries meaning, hide it (aria-hidden) and add the words in a visually hidden zt-sr span. The forms below come from the same fmtChange the tiles use.",
        )}
      >
        <SpecTable
          caption={t("Pokazane i mówione formy zmian", "Shown and spoken forms of changes")}
          head={[t("Na ekranie", "On screen"), t("Słyszy czytnik ekranu", "Screen reader hears")]}
          rows={spoken.map((s) => [
            <span key="s" lang="pl" className="g-num">
              {s.shown}
            </span>,
            <span key="p" lang="pl">
              {s.spoken}
            </span>,
          ])}
        />
        <SpecTable
          caption={t("Słownik form mówionych", "Spoken-form glossary")}
          head={[t("Symbol", "Symbol"), t("Mówimy", "Say")]}
          rows={[
            ["▲ / ▼", pl ? "wzrost o / spadek o" : "wzrost o / spadek o (up / down)"],
            ["pp", "punktu procentowego"],
            ["m/m", "w porównaniu z poprzednim miesiącem"],
            ["k/k", "w porównaniu z poprzednim kwartałem"],
            ["r/r", "w porównaniu z poprzednim rokiem"],
            ["%", "procent"],
          ].map(([a, b]) => [
            <span key="a" className="g-num">
              {a}
            </span>,
            <span key="b" lang="pl">
              {b}
            </span>,
          ])}
        />
      </GSection>
    </>
  );
}
