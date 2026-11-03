// Metodologia i źródła: the sample-data notice, sources and licences from data.catalog(), how the domains
// are organised (with a link to every domain dashboard), and data freshness.

import { Link } from "../../router";
import type { Catalog } from "../../data";
import { usePage } from "../context";
import { StatusTag } from "../ui/blocks";
import { domainIcon, Icon } from "../ui/icons";
import { freqLabel } from "../format";
import { GSection, Rules, SpecTable, useT } from "./parts";
import { fmtDay } from "./util";

/** Per source: how many indicators use it (as any of their sources). */
export function sourceUse(cat: Catalog): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of cat.kpis) for (const s of k.source_keys) out[s] = (out[s] ?? 0) + 1;
  return out;
}

export function MethodologyPage() {
  const { t, pl, lang } = useT();
  const { catalog } = usePage();
  const name = (x: { name_pl: string; name_en: string }) => (pl ? x.name_pl : x.name_en);
  if (!catalog)
    return (
      <p className="g-muted" aria-busy="true">
        {t("Wczytywanie katalogu…", "Loading the catalogue…")}
      </p>
    );
  const uses = sourceUse(catalog);
  const domains = catalog.domains.filter((d) => d.level === "domain").sort((a, b) => a.sort - b.sort);
  const groups = (key: string) =>
    catalog.domains.filter((d) => d.level === "group" && d.parent_key === key).sort((a, b) => a.sort - b.sort);
  const freq = (["M", "Q", "A"] as const).map((f) => ({ f, n: catalog.kpis.filter((k) => k.frequency === f).length }));
  const nGroups = catalog.domains.filter((d) => d.level === "group").length;

  return (
    <>
      {catalog.sample ? (
        <section className="g-notice" aria-labelledby="g-sample">
          <StatusTag kind="sample">{t("Dane przykładowe", "Sample data")}</StatusTag>
          <div>
            <h2 id="g-sample" className="card-title">
              {t("Wszystkie wartości w tym portalu są syntetyczne", "Every value in this portal is synthetic")}
            </h2>
            <p>
              {t(
                "To szablon zohelo uruchomiony na danych przykładowych. Liczby, trendy i rankingi są wygenerowane i nie opisują rzeczywistości. Struktura (dziedziny, wskaźniki, źródła, licencje, częstotliwości) jest prawdziwa: po przełączeniu dostawcy danych na dane rzeczywiste te same strony pokażą prawdziwe wartości.",
                "This is the zohelo template running on sample data. Numbers, trends and rankings are generated and do not describe reality. The structure (domains, indicators, sources, licences, frequencies) is real: once the data provider switches to live data, the same pages show real values.",
              )}
            </p>
          </div>
        </section>
      ) : null}

      <GSection
        id="g-sources"
        title={t("Źródła i licencje", "Sources and licences")}
        lead={t(
          "Każda liczba ma obok źródło i okres. Dane publiczne publikujemy zgodnie z licencją źródła i z wymaganym przypisaniem.",
          "Every number has its source and period next to it. Public data is republished under the source's licence with the required attribution.",
        )}
      >
        <SpecTable
          caption={t("Źródła danych i ich licencje", "Data sources and their licences")}
          head={[
            t("Źródło", "Source"),
            t("Licencja", "Licence"),
            t("Przypisanie", "Attribution"),
            t("Użycie komercyjne", "Commercial use"),
            t("Wskaźniki", "Indicators"),
          ]}
          numeric={[false, false, false, false, true]}
          rows={catalog.sources.map((s) => {
            const lic = catalog.licences.find((l) => l.licence_key === s.licence_key);
            return [
              name(s),
              lic ? (
                <a href={lic.url} target="_blank" rel="noreferrer" key="l">
                  {lic.name}
                  <span className="zt-sr">{t(" (otwiera się w nowej karcie)", " (opens in a new tab)")}</span>
                </a>
              ) : (
                s.licence_key
              ),
              lic ? lic.attribution_text.replace("{source}", name(s)) : "–",
              lic?.commercial_ok ? t("tak", "yes") : t("nie", "no"),
              String(uses[s.source_key] ?? 0),
            ];
          })}
        />
      </GSection>

      <GSection
        id="g-domains"
        title={t("Jak uporządkowane są dziedziny", "How the domains are organised")}
        lead={t(
          `${domains.length} dziedzin według klasyfikacji statystyki publicznej, podzielonych na ${nGroups} obszarów; ${catalog.kpis.length} wskaźników. Każda dziedzina ma swój pulpit, każdy obszar to strona pulpitu.`,
          `${domains.length} domains following the classification of official statistics, split into ${nGroups} areas; ${catalog.kpis.length} indicators. Every domain has a dashboard, every area is a dashboard page.`,
        )}
      >
        <ul className="g-domains">
          {domains.map((d) => {
            const gs = groups(d.domain_key);
            const n = catalog.kpis.filter((k) => k.domain_key === d.domain_key).length;
            return (
              <li key={d.domain_key} className="zt-card g-domain">
                <span className="g-domain__icon" aria-hidden="true">
                  <Icon name={domainIcon(d.domain_key)} />
                </span>
                <div>
                  <h3 className="g-domain__name">
                    <Link to={`/d/${d.domain_key}`}>{name(d)}</Link>
                  </h3>
                  <p className="g-domain__meta">
                    {gs.length} {t("obszarów", "areas")} · {n} {t("wskaźników", "indicators")}
                    {d.csa_code ? ` · ${t("kod", "code")} ${d.csa_code}` : ""}
                  </p>
                  <p className="g-domain__groups">{gs.map(name).join(", ")}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </GSection>

      <GSection id="g-freshness" title={t("Świeżość danych", "Data freshness")}>
        <SpecTable
          caption={t("Wskaźniki według częstotliwości", "Indicators by frequency")}
          head={[t("Częstotliwość", "Frequency"), t("Wskaźniki", "Indicators")]}
          numeric={[false, true]}
          rows={freq.map(({ f, n }) => [freqLabel(f, lang), String(n)])}
        />
        <Rules
          items={[
            t(
              `Wersja danych: ${fmtDay(catalog.generated_at, lang)}. Ta data stoi w stopce każdej strony.`,
              `Data version: ${fmtDay(catalog.generated_at, lang)}. The date is in every page footer.`,
            ),
            t(
              "Dane zmieniają się z publikacją źródła; czytelnik nie ma przycisku „Odśwież”.",
              "Data changes when the source publishes; readers have no “refresh” button.",
            ),
            t(
              "Karta wykresu podaje datę danych i, gdzie wiadomo, następną publikację.",
              "A chart card shows the data date and, where known, the next release.",
            ),
            <>
              {t("Etykiety", "Tags")} <StatusTag kind="current">{t("Aktualne", "Current")}</StatusTag>{" "}
              <StatusTag kind="preliminary">{t("Wstępne", "Preliminary")}</StatusTag>{" "}
              <StatusTag kind="revised">{t("Zrewidowane", "Revised")}</StatusTag>{" "}
              {t("opisują stan danych, nigdy ich wartość.", "describe the data's state, never its value.")}
            </>,
          ]}
        />
      </GSection>
    </>
  );
}
