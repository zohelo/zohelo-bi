// Marka: the mark, logo files, clear space, minimum size, don'ts, backgrounds, sharing image and fonts.

import logoDefault from "@zohelo/design-template/logos/zohelo.svg?url";
import logoBi from "@zohelo/design-template/logos/zohelo-bi.svg?url";
import logoData from "@zohelo/design-template/logos/zohelo-data.svg?url";
import logoMono from "@zohelo/design-template/logos/zohelo-mono.svg?url";
import logoReversed from "@zohelo/design-template/logos/zohelo-reversed.svg?url";
import logoBiReversed from "@zohelo/design-template/logos/zohelo-bi-reversed.svg?url";
import markUrl from "@zohelo/design-template/logos/mark.svg?url";
import markMono from "@zohelo/design-template/logos/mark-mono.svg?url";
import appIcon from "@zohelo/design-template/logos/app-icon.svg?url";
import favicon from "@zohelo/design-template/logos/favicon.svg?url";
import socialCard from "@zohelo/design-template/logos/social-card.svg?url";
import { Mark } from "../ui/icons";
import { Example, GSection, Grid, Rules, SpecTable, Tok, useT } from "./parts";

type LogoFile = { file: string; url: string; usePl: string; useEn: string; ground: "surface" | "inverse"; small?: boolean };

const LOGOS: LogoFile[] = [
  {
    file: "zohelo.svg",
    url: logoDefault,
    usePl: "Domyślny: znak accent + słowo ink. Nagłówek zohelo.com, dokumenty.",
    useEn: "Default: accent mark + ink wordmark. zohelo.com header, documents.",
    ground: "surface",
  },
  {
    file: "zohelo-bi.svg",
    url: logoBi,
    usePl: "Produkt bi.zohelo.com (dopisek w ink-3).",
    useEn: "Product lockup for bi.zohelo.com (suffix in ink-3).",
    ground: "surface",
  },
  {
    file: "zohelo-data.svg",
    url: logoData,
    usePl: "Produkt data.zohelo.com.",
    useEn: "Product lockup for data.zohelo.com.",
    ground: "surface",
  },
  {
    file: "zohelo-mono.svg",
    url: logoMono,
    usePl: "Jeden kolor (ink): druk, haft, faks.",
    useEn: "Single ink colour: print, embroidery, fax-like uses.",
    ground: "surface",
  },
  {
    file: "zohelo-reversed.svg",
    url: logoReversed,
    usePl: "Na surface-inverse: białe słowo, znak seq-1. Stopki, ciemne pasy.",
    useEn: "On surface-inverse: white wordmark, seq-1 mark. Footers, dark bands.",
    ground: "inverse",
  },
  {
    file: "zohelo-bi-reversed.svg",
    url: logoBiReversed,
    usePl: "Odwrócony wariant bi.zohelo.com.",
    useEn: "Reversed bi.zohelo.com lockup.",
    ground: "inverse",
  },
  {
    file: "mark.svg",
    url: markUrl,
    usePl: "Sam znak: zwinięte menu, małe miejsca, znak wodny na eksporcie PNG.",
    useEn: "The mark alone: collapsed rail, small spaces, watermark on PNG exports.",
    ground: "surface",
    small: true,
  },
  {
    file: "mark-mono.svg",
    url: markMono,
    usePl: "Sam znak w jednym kolorze.",
    useEn: "The mark in one colour.",
    ground: "surface",
    small: true,
  },
  {
    file: "app-icon.svg",
    url: appIcon,
    usePl: "512 px, biały znak na accent, promień 112 px. Ikona PWA, awatary.",
    useEn: "512px, white mark on accent, 112px radius. PWA icon, avatars.",
    ground: "surface",
    small: true,
  },
  {
    file: "favicon.svg",
    url: favicon,
    usePl: "Wersja 32 px ikony aplikacji.",
    useEn: "32px version of the app icon.",
    ground: "surface",
    small: true,
  },
];

export function BrandPage() {
  const { t, pl } = useT();
  return (
    <>
      <GSection
        id="g-mark"
        title={t("Znak", "The mark")}
        lead={t(
          "Trzy poziome paski malejącej długości: słupki rankingowe, najczęstszy wykres w produkcie. Rysowany na kwadracie 22 jednostek: paski 18, 13 i 8, grubość 3, w pełni zaokrąglone, wyrównane do lewej przy x = 2.",
          "Three horizontal bars of decreasing length: a ranked bar chart, the most common chart in the product. Drawn on a 22-unit square: bars 18, 13 and 8 long, 3 thick, fully rounded, left-aligned at x = 2.",
        )}
      >
        <Grid cols={2}>
          <Example
            ground="surface"
            caption={t(
              "Znak na siatce 22 × 22. To znak roboczy z pilotażu; jeśli powstanie oficjalny, podmieniamy pliki i zachowujemy nazwy.",
              "The mark on its 22 × 22 grid. It is the working mark from the pilot; if an official one is commissioned, replace the files and keep the names.",
            )}
          >
            <div className="g-markgrid" aria-hidden="true">
              <Mark size={176} />
            </div>
          </Example>
          <Example
            ground="surface"
            caption={t(
              "W nagłówku produktu logo składa się na żywo: znak SVG + „zohelo” Inter Tight 700 17 px + nazwa produktu Inter 500 13 px ink-3, żeby było ostre w każdej skali.",
              "In the product header the lockup is set live: mark SVG + “zohelo” in Inter Tight 700 17px + product name in Inter 500 13px ink-3, so it stays crisp at any scale.",
            )}
          >
            <span className="t-brand g-livelockup">
              <Mark />
              <span className="t-brand__word">zohelo</span> <span className="t-brand__product">bi</span>
            </span>
          </Example>
        </Grid>
      </GSection>

      <GSection
        id="g-logos"
        title={t("Warianty logo", "Logo variants")}
        lead={t(
          "Wszystkie pliki to obrysowane SVG (bez zależności od fontu). Używamy tylko tych plików; znaku nigdy nie rysujemy od nowa.",
          "All files are outlined SVG (no font dependency). Use only these files; never redraw the mark.",
        )}
      >
        <ul className="g-logos">
          {LOGOS.map((l) => (
            <li key={l.file} className="g-logo">
              <div className={`g-logo__stage g-logo__stage--${l.ground}${l.small ? " g-logo__stage--small" : ""}`}>
                <img src={l.url} alt={t(`Logo, plik ${l.file}`, `Logo, file ${l.file}`)} className="g-logo__img" />
              </div>
              <div className="g-logo__meta">
                <Tok>{l.file}</Tok>
                <p>{pl ? l.usePl : l.useEn}</p>
                <a href={l.url} download={l.file} className="g-logo__dl">
                  {t("Pobierz SVG", "Download SVG")}
                  <span className="zt-sr">: {l.file}</span>
                </a>
              </div>
            </li>
          ))}
        </ul>
      </GSection>

      <GSection id="g-logo-rules" title={t("Pole ochronne i minimalny rozmiar", "Clear space and minimum size")}>
        <Grid cols={2}>
          <Example
            ground="surface"
            caption={t(
              "Pole ochronne: co najmniej wysokość jednego paska (3 jednostki) z każdej strony znaku i połowa wysokości słowa wokół całego logo.",
              "Clear space: at least the height of one bar (3 units) on every side of the mark, and half the wordmark height around a lockup.",
            )}
          >
            <div className="g-clear" aria-hidden="true">
              <div className="g-clear__zone">
                <img src={logoDefault} alt="" width={201} height={64} />
              </div>
            </div>
          </Example>
          <Example
            ground="surface"
            caption={t("Minimum: znak 16 px, logo 80 px szerokości na ekranie.", "Minimum: mark 16px, lockup 80px wide on screen.")}
          >
            <div className="g-minsize">
              <figure>
                <img src={markUrl} alt={t("Znak w rozmiarze 16 pikseli", "Mark at 16 pixels")} width={16} height={16} />
                <figcaption>16 px</figcaption>
              </figure>
              <figure>
                <img src={logoDefault} alt={t("Logo o szerokości 80 pikseli", "Lockup 80 pixels wide")} width={80} height={25} />
                <figcaption>80 px</figcaption>
              </figure>
            </div>
          </Example>
        </Grid>
        <h3 className="g-h3">{t("Nigdy", "Never")}</h3>
        <ul className="g-donts">
          {[
            { cls: "g-dont-stretch", pl: "Rozciąganie", en: "Stretching" },
            { cls: "g-dont-rotate", pl: "Obracanie", en: "Rotating" },
            { cls: "g-dont-effect", pl: "Efekty i cienie", en: "Effects and shadows" },
            { cls: "g-dont-inverse", pl: "Znak accent na surface-inverse (2,3:1)", en: "accent mark on surface-inverse (2.3:1)" },
            { cls: "g-dont-outline", pl: "Obrys", en: "Outlines" },
          ].map((d) => (
            <li key={d.cls} className="g-dontcard">
              <div className={`g-dontcard__stage ${d.cls}`} aria-hidden="true">
                <img src={logoDefault} alt="" width={120} height={38} />
              </div>
              <p>
                <span className="g-verdict g-verdict--bad">{t("Nie:", "Don't:")}</span> {pl ? d.pl : d.en}
              </p>
            </li>
          ))}
        </ul>
        <Rules
          items={[
            t(
              "Tylko kombinacje kolorów z plików powyżej; na ciemnym tle pliki odwrócone.",
              "Only the colour combinations in the files above; reversed files on dark grounds.",
            ),
            t(
              "Nie przebarwiamy pasków osobno, nie kładziemy logo na zdjęciach, nie składamy słowa innym krojem.",
              "Never recolour the bars individually, place the logo on photos or rebuild the wordmark in another font.",
            ),
          ]}
        />
      </GSection>

      <GSection
        id="g-grounds"
        title={t("Tła i powierzchnie", "Backgrounds and surfaces")}
        lead={t(
          "Bez gradientów, zdjęć i faktur za treścią. Jedyna grafika dekoracyjna to prawdziwy wykres: jeśli strona potrzebuje obrazu, pokazuje dane.",
          "No gradients, photos or textures behind content. The only decorative graphic is a real chart: if a page needs a visual, show data.",
        )}
      >
        <SpecTable
          caption={t("Tła i powierzchnie", "Backgrounds and surfaces")}
          head={[t("Tło", "Ground"), t("Token", "Token"), t("Użycie", "Use")]}
          rows={[
            ["canvas", t("Tło strony", "Page canvas"), t("Za kartami na każdej stronie aplikacji.", "Behind cards in every app page.")],
            ["surface", t("Powierzchnia", "Surface"), t("Karty, nagłówek, menu boczne, menu.", "Cards, header, sidebar, menus.")],
            ["surface-sunken", t("Wklęsła", "Sunken"), t("Pola formularzy, wiersze nagłówka tabel.", "Inputs, table header rows.")],
            [
              "surface-inverse",
              t("Ciemny pas", "Inverse band"),
              t("Stopka zohelo.com, logo odwrócone, dymki.", "zohelo.com footer, reversed logo, tooltips."),
            ],
            ["band", t("Pasmo", "Band"), t("Tylko w wykresach, dla zakresów docelowych.", "Only inside charts for target ranges.")],
          ].map(([tok, name, use]) => [
            <span className="g-swatchname" key={tok}>
              <i className="g-chipswatch" style={{ background: `var(--${tok})` }} aria-hidden="true" />
              {name}
            </span>,
            <Tok key="t">{tok}</Tok>,
            use,
          ])}
        />
      </GSection>

      <GSection
        id="g-social"
        title={t("Obraz do udostępniania", "Social and sharing image")}
        lead={t(
          "social-card.svg (1200 × 630): tło canvas, logo w lewym górnym rogu, teza strony w Inter Tight 700, jedna linia kontekstu w Inter 500 ink-2 i prawdziwa linia wykresu w series-1 z pasmem. Karty poszczególnych stron mają ten sam układ z własnym tytułem i głównym wykresem.",
          "social-card.svg (1200 × 630): canvas ground, lockup top-left, the page claim in Inter Tight 700, one line of context in Inter 500 ink-2, and a real chart line in series-1 with its band. Per-page cards follow the same layout with the page's own title and main chart.",
        )}
      >
        <figure className="g-social">
          <img
            src={socialCard}
            alt={t(
              "Przykładowa karta do udostępniania: logo zohelo, teza „Polska w danych” i linia wykresu",
              "Sample sharing card: zohelo lockup, the claim “Polska w danych” and a chart line",
            )}
            width={1200}
            height={630}
          />
        </figure>
      </GSection>

      <GSection
        id="g-fonts"
        title={t("Kroje pisma", "Fonts")}
        lead={t(
          "Inter Tight (600, 700) do tytułów i liczb, Inter (400, 500, 600) do tekstu. Oba z display=swap i zapasowym system-ui. Polskie znaki są w podzbiorze latin-ext: zawsze go ładujemy.",
          "Inter Tight (600, 700) for display, Inter (400, 500, 600) for text. Both with display=swap and a system-ui fallback. Polish characters are in the latin-ext subset: always load it.",
        )}
      >
        <Grid cols={2}>
          <div className="zt-card g-font">
            <p className="g-font__name">Inter Tight</p>
            <p className="g-font__sample g-font__sample--display">Zażółć gęślą jaźń 2,9%</p>
            <p className="g-font__weights">
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>600 {t("półgruby", "semibold")}</span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>700 {t("gruby", "bold")}</span>
            </p>
            <p className="g-muted">{t("page-title, kpi-value, kpi-hero, display-hero", "page-title, kpi-value, kpi-hero, display-hero")}</p>
          </div>
          <div className="zt-card g-font">
            <p className="g-font__name">Inter</p>
            <p className="g-font__sample">Zażółć gęślą jaźń: ą ć ę ł ń ó ś ź ż</p>
            <p className="g-font__weights">
              <span style={{ fontWeight: 400 }}>400 {t("zwykły", "regular")}</span>
              <span style={{ fontWeight: 500 }}>500 {t("średni", "medium")}</span>
              <span style={{ fontWeight: 600 }}>600 {t("półgruby", "semibold")}</span>
            </p>
            <p className="g-muted">
              {t("Cały pozostały tekst: treść, przyciski, tabele, wykresy.", "All other text: body, buttons, tables, charts.")}
            </p>
          </div>
        </Grid>
      </GSection>
    </>
  );
}
