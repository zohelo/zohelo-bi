// Komponenty: each shared component live, with its usage rules. Built from ui/blocks.tsx and zt-* classes.

import { useId, useState } from "react";
import { usePage } from "../context";
import { ActionMenu, Segmented, StatusTag } from "../ui/blocks";
import { Icon } from "../ui/icons";
import { DoDont, Example, GSection, Grid, Rules, Tok, useT } from "./parts";
import { LiveHicpCard, StatesDemo } from "./live";
import { SampleKpi } from "./DashboardPage";

function FilterButton({ name, options, initial }: { name: string; options: string[]; initial: string }) {
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="g-filterwrap">
      <button type="button" className="zt-filter" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span>{name}:</span> <strong>{value}</strong>
        <Icon name="chevronDown" size={14} />
      </button>
      {open ? (
        <fieldset id={id} className="zt-menu g-filterpop">
          <legend className="zt-sr">{name}</legend>
          {options.map((o) => (
            <label key={o} className="g-filteropt">
              <input
                type="radio"
                name={id}
                checked={o === value}
                onChange={() => {
                  setValue(o);
                  setOpen(false);
                }}
              />
              {o}
            </label>
          ))}
        </fieldset>
      ) : null}
    </div>
  );
}

const COMPARE = [
  { key: "CZ", pl: "Czechy", en: "Czechia", color: "var(--series-2)" },
  { key: "HU", pl: "Węgry", en: "Hungary", color: "var(--series-3)" },
  { key: "DE", pl: "Niemcy", en: "Germany", color: "var(--series-4)" },
];

export function ComponentsPage() {
  const { t, pl } = useT();
  const { lang } = usePage();
  const [view, setView] = useState<"chart" | "table">("chart");
  const [compare, setCompare] = useState(COMPARE.map((c) => c.key));
  const [toggles, setToggles] = useState<Record<string, boolean>>({ M: true, Q: false, A: false });
  const [picked, setPicked] = useState("");
  const focusSearch = () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));

  return (
    <>
      <GSection
        id="g-buttons"
        title={t("Przyciski", "Buttons")}
        lead={t("Przyciski wywołują akcje; linki prowadzą do stron.", "Buttons trigger actions; links navigate.")}
      >
        <Grid cols={2}>
          <Example
            caption={t(
              "Główny, drugorzędny, tekstowy, ikonowy (z aria-label) i nieaktywny.",
              "Primary, secondary, ghost, icon (with aria-label) and disabled.",
            )}
          >
            <div className="g-row">
              <button type="button" className="zt-btn zt-btn--primary">
                {t("Pobierz dane", "Download data")}
              </button>
              <button type="button" className="zt-btn">
                {t("Rozumiem", "Got it")}
              </button>
              <button type="button" className="zt-btn zt-btn--ghost">
                {t("Wyczyść", "Clear")}
              </button>
              <button
                type="button"
                className="zt-btn zt-btn--icon"
                aria-label={t("Więcej akcji", "More actions")}
                title={t("Więcej akcji", "More actions")}
              >
                <Icon name="more" />
              </button>
              <button type="button" className="zt-btn" disabled>
                {t("Zapisz widok", "Save view")}
              </button>
            </div>
            <p className="g-muted g-small">{t("Zapisz widok: najpierw wybierz wskaźnik.", "Save view: choose an indicator first.")}</p>
          </Example>
          <Rules
            items={[
              <>
                <strong>{t("Główny", "Primary")}</strong> (<Tok>accent</Tok>):{" "}
                {t(
                  "jedna główna akcja na widok lub okno; na stronach to „Pobierz dane” w nagłówku strony, nigdy w górnym pasku.",
                  "the one main action in a view or dialog; on pages it is “Pobierz dane” (Download data) in the page header, never in the top bar.",
                )}
              </>,
              <>
                <strong>{t("Drugorzędny", "Secondary")}</strong> ({t("obramowanie", "border")} <Tok>line-strong</Tok>):{" "}
                {t("każda inna akcja.", "every other action.")}
              </>,
              <>
                <strong>{t("Tekstowy", "Ghost")}</strong>: {t("lekkie akcje w wierszu (Wyczyść).", "low-weight actions in a row (Clear).")}
              </>,
              <>
                <strong>{t("Ikonowy", "Icon")}</strong> 36×36:{" "}
                {t("tylko z aria-label i dymkiem.", "only with an aria-label and a tooltip.")}
              </>,
              t(
                "Wysokość 36 px (44 px na telefonie), radius-md, etykieta mówi wynik („Pobierz dane”, nie „OK”).",
                "Height 36px (44px on phone), radius-md, the label states the result (“Download data”, not “OK”).",
              ),
              t(
                "Nieaktywny przycisk wyjaśnia obok dlaczego albo go nie pokazujemy.",
                "A disabled button explains why nearby, or is not shown.",
              ),
            ]}
          />
        </Grid>
      </GSection>

      <GSection id="g-segmented" title={t("Przełącznik segmentowy", "Segmented control")}>
        <Grid cols={2}>
          <Example
            caption={t(
              "Wybrany: wypełnienie ink, biały tekst. Wersja mała 30 px w kartach wykresów.",
              "Selected: ink fill, white text. Small 30px variant inside chart cards.",
            )}
          >
            <div className="g-stack">
              <Segmented
                label={t("Widok wykresu inflacji", "Inflation chart view")}
                value={view}
                onChange={setView}
                options={[
                  { value: "chart", label: t("Wykres", "Chart") },
                  { value: "table", label: t("Tabela", "Table") },
                ]}
              />
              <Segmented
                small
                label={t("Widok wykresu inflacji, mała wersja", "Inflation chart view, small")}
                value={view}
                onChange={setView}
                options={[
                  { value: "chart", label: t("Wykres", "Chart") },
                  { value: "table", label: t("Tabela", "Table") },
                ]}
              />
            </div>
          </Example>
          <Rules
            items={[
              <>
                <Tok>role=&quot;group&quot;</Tok> {t("z konkretnym", "with a specific")} <Tok>aria-label</Tok>{" "}
                {t("(„Widok wykresu inflacji”, nie „Widok”); każda opcja to", "(“Inflation chart view”, not “View”); each option is a")}{" "}
                <Tok>button</Tok> {t("z", "with")} <Tok>aria-pressed</Tok>.
              </>,
              t(
                "2–5 opcji, krótkie etykiety, bez zawijania. 44 px na telefonie.",
                "2–5 options, short labels, no wrapping. 44px on phone.",
              ),
            ]}
          />
        </Grid>
      </GSection>

      <GSection id="g-search" title={t("Wyszukiwarka", "Search field")}>
        <Grid cols={2}>
          <Example
            caption={t(
              "Kompaktowa (36 px, surface-sunken, w menu bocznym) i duża (52 px, surface, w katalogu). Fokus obrysowuje całe pole (focus-within).",
              "Compact (36px, surface-sunken, in the sidebar) and large (52px, surface, in the catalogue). Focus rings the whole field (focus-within).",
            )}
          >
            <div className="g-stack">
              <label className="zt-search">
                <Icon name="search" size={16} />
                <input
                  type="search"
                  aria-label={t("Szukaj wskaźnika", "Search indicators")}
                  placeholder={t("np. inflacja", "e.g. inflation")}
                />
                <kbd className="zt-kbd">Ctrl K</kbd>
              </label>
              <label className="zt-search g-search-lg">
                <Icon name="search" />
                <input
                  type="search"
                  aria-label={t("Szukaj w katalogu wskaźników", "Search the indicator catalogue")}
                  placeholder={t("np. stopa bezrobocia w województwach", "e.g. unemployment rate by voivodeship")}
                />
              </label>
            </div>
          </Example>
          <Rules
            items={[
              t("Całe pole to label; samo pole tekstowe nie ma obrysu.", "The whole field is the label; the input itself has no outline."),
              t(
                "Podpowiedź to prawdziwy przykład; aria-label mówi, czego szukamy.",
                "The placeholder gives a real example; the aria-label names what is searched.",
              ),
              t(
                "Kompaktowa w menu bocznym: wpisuje się wprost w nią, a wyniki pojawiają się tuż pod polem (zobacz niżej). Duża na górze katalogu filtruje listę wskaźników.",
                "Compact in the sidebar: typed into directly, with matches right under the field (see below). Large at the top of the catalogue, filtering the indicator list.",
              ),
            ]}
          />
        </Grid>
      </GSection>

      <GSection id="g-filterbar" title={t("Filtry i chipy", "Filters and chips")}>
        <Example
          caption={t(
            "Filtr pokazuje nazwę i bieżącą wartość. Chip porównania ma próbkę koloru serii i przycisk usuwania 24 px. Chipy przełączane mają aria-pressed.",
            "A filter shows its name and current value. A comparison chip carries the series swatch and a 24px remove button. Toggle chips use aria-pressed.",
          )}
        >
          <div className="g-stack">
            <div className="g-row">
              <FilterButton
                name={t("Poziom", "Level")}
                options={[t("kraje", "countries"), t("województwa", "voivodeships")]}
                initial={t("kraje", "countries")}
              />
              <FilterButton
                name={t("Obszar", "Area")}
                options={[t("Polska", "Poland"), t("Polska + 3 kraje", "Poland + 3 countries"), t("UE-27", "EU-27")]}
                initial={t("Polska + 3 kraje", "Poland + 3 countries")}
              />
              <FilterButton
                name={t("Częstotliwość", "Frequency")}
                options={[t("miesięcznie", "monthly"), t("kwartalnie", "quarterly"), t("rocznie", "annual")]}
                initial={t("miesięcznie", "monthly")}
              />
            </div>
            <div className="g-row" role="group" aria-label={t("Porównywane kraje", "Compared countries")}>
              <span className="zt-chip">
                <i style={{ background: "var(--series-1)" }} aria-hidden="true" />
                {t("Polska", "Poland")}
              </span>
              {COMPARE.filter((c) => compare.includes(c.key)).map((c) => (
                <span key={c.key} className="zt-chip">
                  <i style={{ background: c.color }} aria-hidden="true" />
                  {pl ? c.pl : c.en}
                  <button
                    type="button"
                    aria-label={`${t("Usuń", "Remove")} ${pl ? c.pl : c.en}`}
                    onClick={() => setCompare(compare.filter((k) => k !== c.key))}
                  >
                    ×
                  </button>
                </span>
              ))}
              {compare.length < COMPARE.length ? (
                <button type="button" className="zt-btn zt-btn--ghost" onClick={() => setCompare(COMPARE.map((c) => c.key))}>
                  {t("Przywróć kraje", "Restore countries")}
                </button>
              ) : null}
            </div>
            <div className="g-row" role="group" aria-label={t("Częstotliwość w katalogu", "Frequency in the catalogue")}>
              {(["M", "Q", "A"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className="zt-chip zt-chip--toggle"
                  aria-pressed={toggles[f]}
                  onClick={() => setToggles({ ...toggles, [f]: !toggles[f] })}
                >
                  {{ M: t("Miesięczne", "Monthly"), Q: t("Kwartalne", "Quarterly"), A: t("Roczne", "Annual") }[f]}
                </button>
              ))}
            </div>
          </div>
        </Example>
        <Rules
          items={[
            t(
              "Jeden wiersz pod wnioskiem strony (poza przyklejonym nagłówkiem); filtry działają na każdą kartę i trafiają do adresu URL.",
              "One row under the page lead (outside the sticky header); filters apply to every card and go into the URL.",
            ),
            t(
              "Okresu nie ma wśród filtrów strony: każdy wykres w czasie ma własną listę okresu w karcie (Domyślny okres, 1 rok, 5 lat, 10 lat, Cały okres).",
              "Period is not a page filter: each time chart has its own period select in its card (Domyślny okres, 1 rok, 5 lat, 10 lat, Cały okres).",
            ),
            t("Karta, której filtr nie dotyczy, mówi to w podtytule.", "A card a filter does not apply to says so in its subtitle."),
            <>
              {t("Przycisk usuwania chipa ma", "The chip remove button has")} <Tok>aria-label=&quot;Usuń &lt;nazwa&gt;&quot;</Tok>.
            </>,
          ]}
        />
      </GSection>

      <GSection id="g-tags" title={t("Etykiety statusu", "Status tags")}>
        <Grid cols={2}>
          <Example ground="surface">
            <div className="g-row">
              <StatusTag kind="current">{t("Aktualne", "Current")}</StatusTag>
              <StatusTag kind="preliminary">{t("Wstępne", "Preliminary")}</StatusTag>
              <StatusTag kind="revised">{t("Zrewidowane", "Revised")}</StatusTag>
              <StatusTag kind="sample">{t("Dane przykładowe", "Sample data")}</StatusTag>
            </div>
            <p className="g-small g-ink3">
              {t(
                "Ostatni odczyt wrz 2026, pobrany 24 paź 2026. Następny: 17 lis 2026.",
                "Last reading Sep 2026, loaded 24 Oct 2026. Next: 17 Nov 2026.",
              )}
            </p>
          </Example>
          <Rules
            items={[
              t(
                "Zawsze słowo i kropka; sam kolor nigdy nie niesie stanu.",
                "Always a word plus the dot; colour alone never carries the state.",
              ),
              t(
                "Kolory status-* i sample-* są zarezerwowane: nigdy w wykresach ani dla wartości.",
                "status-* and sample-* colours are reserved: never in charts or for values.",
              ),
              t("Obok etykiety jedna linia szczegółów.", "Next to the tag, one line of detail."),
              t(
                "„Dane przykładowe” obowiązkowo, dopóki wartości są syntetyczne: raz, w stopce okna.",
                "“Sample data” is mandatory while values are synthetic: once, in the window footer.",
              ),
            ]}
          />
        </Grid>
      </GSection>

      <GSection id="g-kpitile" title={t("Kafelek KPI", "KPI tile")}>
        <Grid cols={2}>
          <Example>
            <div className="g-kpiwrap">
              <SampleKpi />
            </div>
          </Example>
          <Rules
            items={[
              t("Etykieta, okres, wartość, neutralna zmiana, kontekst, źródło.", "Label, period, value, neutral change, context, source."),
              t(
                "3–5 kafelków w wierszu KPI; 4 w rzędzie na desktopie, 2 poniżej 1280 px.",
                "3–5 tiles in the KPI row; 4 per row on desktop, 2 below 1280px.",
              ),
              t(
                "Ukryte przecinki między etykietą, okresem i wartością; strzałka i skróty ukryte, forma mówiona w zt-sr.",
                "Hidden commas between label, period and value; arrow and abbreviations hidden, spoken form in zt-sr.",
              ),
            ]}
          />
        </Grid>
      </GSection>

      <GSection id="g-chartcard" title={t("Karta wykresu", "Chart card")}>
        <div className="g-cardexample">
          <LiveHicpCard />
        </div>
        <Rules
          items={[
            t(
              "surface, obramowanie 1 px line, radius-xl, wypełnienie 18/20 px, bez cienia.",
              "surface, 1px line border, radius-xl, padding 18/20px, no shadow.",
            ),
            t(
              "Szerokość 12, 8, 6 lub 4 kolumny; ta sama wysokość co sąsiedzi w wierszu.",
              "Spans 12, 8, 6 or 4 columns; same height as its row neighbours.",
            ),
            t(
              "Tytuł to wniosek, podtytuł to miara; legenda dla 2+ serii; linia źródła z datą danych.",
              "Title is the finding, subtitle the measure; legend for 2+ series; source line with data date.",
            ),
            t(
              "Narzędzia w prawym górnym rogu: lista okresu (tylko wykresy w czasie), Wykres | Tabela, menu ⋯ z prawdziwymi akcjami.",
              "Tools top-right: the period select (time charts only), Chart | Table, the ⋯ menu with real actions.",
            ),
          ]}
        />
      </GSection>

      <GSection id="g-actionmenu" title={t("Menu akcji", "Action menu")}>
        <Grid cols={2}>
          <Example
            caption={t(
              "Otwórz przyciskiem ⋯; strzałki przesuwają, Enter wybiera, Esc zamyka i wraca na przycisk.",
              "Open with ⋯; arrows move, Enter selects, Esc closes and returns to the button.",
            )}
          >
            <div className="g-menudemo">
              <ActionMenu
                label={t("Więcej akcji: przykładowy wykres", "More actions: sample chart")}
                items={[
                  { label: t("Pobierz CSV", "Download CSV"), onSelect: () => setPicked(t("Pobierz CSV", "Download CSV")) },
                  {
                    label: t("Strona wskaźnika", "Indicator page"),
                    onSelect: () => setPicked(t("Strona wskaźnika", "Indicator page")),
                  },
                ]}
              />
              <p role="status" className="g-small g-ink3">
                {picked ? `${t("Wybrano", "Selected")}: ${picked}` : t("Nic jeszcze nie wybrano.", "Nothing selected yet.")}
              </p>
            </div>
          </Example>
          <Rules
            items={[
              <>
                {t("Przycisk ikonowy", "Icon button")} <Tok>aria-label=&quot;Więcej akcji&quot;</Tok>, <Tok>aria-expanded</Tok>;{" "}
                {t("menu", "menu")} <Tok>role=&quot;menu&quot;</Tok> {t("z elementami", "with")} <Tok>menuitem</Tok>.
              </>,
              t(
                "Tylko akcje, które działają, w stałej kolejności: eksport · kontekst (w karcie wykresu: Pobierz CSV, Strona wskaźnika). Bez „Kopiuj link” i pozycji na zapas.",
                "Only actions that work, in a fixed order: export · context (in a chart card: Download CSV, Indicator page). No “Copy link” and no placeholder items.",
              ),
              t("radius-lg, shadow-menu, elementy 34 px.", "radius-lg, shadow-menu, items 34px."),
            ]}
          />
        </Grid>
      </GSection>

      <GSection id="g-table" title={t("Tabela", "Table")}>
        <Grid cols={2}>
          <div
            className="zt-table-wrap"
            tabIndex={0}
            role="region"
            aria-label={t("Przykład tabeli: stopa bezrobocia", "Table example: unemployment rate")}
          >
            <table className="zt-table">
              <caption className="g-tablecap">
                {t("Stopa bezrobocia (BAEL), %, 2015 i 2025 (dane przykładowe)", "Unemployment rate (LFS), %, 2015 and 2025 (sample data)")}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t("Kraj", "Country")}</th>
                  <th scope="col" className="num">
                    2015
                  </th>
                  <th scope="col" className="num">
                    2025
                  </th>
                  <th scope="col" className="num">
                    {t("Zmiana", "Change")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  [t("Polska", "Poland"), 7.5, 2.9],
                  [t("Czechy", "Czechia"), 5.1, 2.8],
                  [t("Słowacja", "Slovakia"), 11.5, 5.4],
                  [t("Niemcy", "Germany"), 4.6, 3.4],
                ].map(([name, a, b], i) => {
                  const n = (v: number) =>
                    v.toLocaleString(lang === "pl" ? "pl-PL" : "en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                  const d = (b as number) - (a as number);
                  return (
                    <tr key={i} className={i === 0 ? "g-hero-row" : undefined}>
                      <th scope="row" className="g-table__rowhead">
                        {name}
                      </th>
                      <td className="num">{n(a as number)}</td>
                      <td className="num">{n(b as number)}</td>
                      <td className="num">
                        <span aria-hidden="true">
                          {d < 0 ? "▼" : "▲"} {n(Math.abs(d))} pp
                        </span>
                        <span className="zt-sr">
                          {d < 0 ? t("spadek o", "down") : t("wzrost o", "up")} {n(Math.abs(d))}{" "}
                          {t("punktu procentowego", "percentage points")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Rules
            items={[
              <>
                {t("Prawdziwa", "A real")} <Tok>table</Tok> {t("z", "with")} <Tok>caption</Tok> {t("i", "and")} <Tok>th scope</Tok>;{" "}
                {t("liczby do prawej, tabular-nums.", "numbers right-aligned, tabular-nums.")}
              </>,
              t(
                "Nagłówek surface-sunken w rozmiarze caption ink-3; separatory line-subtle; bez pasków zebry.",
                "Header row surface-sunken, caption size ink-3; line-subtle separators; no zebra stripes.",
              ),
              t("Wyróżniony obiekt (Polska) wagą 600, nie kolorem.", "The highlighted entity (Poland) in weight 600, not colour."),
              t(
                "Szeroka tabela przewija się w zt-table-wrap (tabIndex=0, role=region, aria-label), nigdy cała strona.",
                "A wide table scrolls inside zt-table-wrap (tabIndex=0, role=region, aria-label), never the page.",
              ),
            ]}
          />
        </Grid>
      </GSection>

      <GSection id="g-states" title={t("Stany wykresu", "Chart states")}>
        <StatesDemo />
      </GSection>

      <GSection id="g-sidesearch" title={t("Wyszukiwarka w menu", "Sidebar search")}>
        <Grid cols={2}>
          <div className="g-stack">
            <Rules
              items={[
                t(
                  "Pisze się wprost w polu menu bocznego; dopasowania pojawiają się na liście tuż pod nim, w grupach: Dashboardy (najwyżej 4), Wskaźniki, Przewodnik. Każde słowo musi pasować, polskie znaki są obojętne.",
                  "Typed straight into the sidebar field; matches appear in a list right under it, in groups: Dashboards (at most 4), Indicators, Guide. Every word must match; Polish accents do not matter.",
                ),
                <>
                  {t("Pole to", "The field is a")} <Tok>combobox</Tok> {t("z", "with")} <Tok>aria-controls</Tok> {t("na", "pointing to a")}{" "}
                  <Tok>listbox</Tok> {t("„Wyniki wyszukiwania”;", "“Wyniki wyszukiwania” (Search results);")}{" "}
                  <Tok>aria-activedescendant</Tok> {t("wskazuje wybrany wynik.", "marks the chosen hit.")}
                </>,
                t(
                  "↑↓ przesuwa, Enter otwiera, Esc czyści pole. Ctrl K przenosi fokus do pola z każdego miejsca.",
                  "↑↓ moves, Enter opens, Esc clears the field. Ctrl K focuses the field from anywhere.",
                ),
                t(
                  "W pasku ikon pole jest przyciskiem „Szukaj (Ctrl K)”, który otwiera je w panelu obok paska; na telefonie Ctrl K najpierw otwiera menu. Nie ma osobnego okna szybkiego wyszukiwania.",
                  "In the icon rail the field is a “Szukaj (Ctrl K)” (Search) button that opens it in a panel beside the rail; on phones Ctrl K opens the drawer first. There is no separate command palette.",
                ),
              ]}
            />
            <div>
              <button type="button" className="zt-btn" onClick={focusSearch}>
                <Icon name="search" size={16} />
                {t("Przejdź do wyszukiwarki (Ctrl K)", "Go to the search field (Ctrl K)")}
              </button>
            </div>
          </div>
          <figure className="g-sidemock" aria-label={t("Ilustracja wyszukiwarki w menu", "Sidebar search illustration")}>
            <div className="g-sidemock__pad" aria-hidden="true">
              <div className="zt-search">
                <Icon name="search" size={16} />
                <span className="t-grow">infla</span>
              </div>
              <div className="zt-menu" style={{ width: "auto" }}>
                <p className="zt-nav-group">{t("Dashboardy", "Dashboards")}</p>
                <div className="t-searchpop__hit">
                  <span>{t("Ceny i inflacja", "Prices and inflation")}</span>
                  <small>{t("Gospodarka", "Economy")}</small>
                </div>
                <p className="zt-nav-group">{t("Wskaźniki", "Indicators")}</p>
                <div className="t-searchpop__hit" style={{ background: "var(--accent-tint)" }}>
                  <span>{t("Inflacja HICP, r/r", "HICP inflation, y/y")}</span>
                  <small>{t("Ceny i inflacja", "Prices and inflation")}</small>
                </div>
                <div className="t-searchpop__hit">
                  <span>{t("Inflacja bazowa", "Core inflation")}</span>
                  <small>{t("Ceny i inflacja", "Prices and inflation")}</small>
                </div>
              </div>
            </div>
            <figcaption className="g-palmock__foot">
              {t("↑↓ wybierz · Enter otwórz · Esc wyczyść", "↑↓ choose · Enter open · Esc clear")}
            </figcaption>
          </figure>
        </Grid>
        <DoDont
          ok={t(
            "Wynik z kontekstem: „Inflacja HICP, r/r · Ceny i inflacja”.",
            "A hit with context: “HICP inflation, y/y · Prices and inflation”.",
          )}
          bad={t(
            "Lista samych nazw bez kontekstu; wyszukiwarka dostępna tylko myszą albo ukryta w osobnym oknie.",
            "A list of bare names with no context; search reachable by mouse only or hidden in a separate dialog.",
          )}
        />
      </GSection>
    </>
  );
}
