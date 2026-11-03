// AI view builder panel (prototype): the reader describes a view in their own words; the builder proposes an
// existing page (indicator, dashboard, guide) or a Data explorer view and says how it read the request.
// v1 runs `buildView` (rule-based, in the browser); a later backend passes another `engine` with the same output.
// Not wired into a page: the home page integrates it.

import { useId, useRef, useState, type FormEvent } from "react";
import { Link } from "../../router";
import { usePage } from "../context";
import { buildView, EXAMPLE_PROMPTS, type ViewBuilderEngine, type ViewKind, type ViewProposal } from "./intent";
import "./ai.css";

const KIND: Record<Exclude<ViewKind, "none">, { pl: string; en: string }> = {
  explore: { pl: "Eksplorator danych", en: "Data explorer" },
  kpi: { pl: "Strona wskaźnika", en: "Indicator page" },
  dashboard: { pl: "Dashboard", en: "Dashboard" },
  guide: { pl: "Przewodnik", en: "Guide" },
};

const CONFIDENCE: Record<ViewProposal["confidence"], { pl: string; en: string }> = {
  high: { pl: "Dopasowanie: dobre", en: "Match: good" },
  medium: { pl: "Dopasowanie: przybliżone", en: "Match: approximate" },
  low: { pl: "Dopasowanie: brak", en: "Match: none" },
};

export function ViewBuilder({ engine = buildView }: { engine?: ViewBuilderEngine }) {
  const { lang, catalog } = usePage();
  const pl = lang === "pl";
  const t = (p: string, e: string) => (pl ? p : e);
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<ViewProposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function run(value: string) {
    const v = value.trim();
    if (!v || !catalog) {
      field.current?.focus();
      return;
    }
    setBusy(true);
    setError(false);
    try {
      setResult(await engine(v, catalog, lang));
    } catch {
      setResult(null);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void run(text);
  }

  const announce = error
    ? t("Nie udało się zbudować widoku. Spróbuj ponownie.", "The view could not be built. Try again.")
    : result
      ? result.kind === "none"
        ? t("Nie znaleziono pasującego widoku. Poniżej propozycje.", "No matching view found. Suggestions below.")
        : `${t("Propozycja", "Proposal")}: ${result.title}. ${CONFIDENCE[result.confidence][lang]}.`
      : "";

  return (
    <section className="ai-builder" aria-labelledby={`${id}-label`}>
      <form className="ai-builder__form" onSubmit={onSubmit}>
        <div className="ai-builder__head">
          <label id={`${id}-label`} htmlFor={`${id}-text`} className="card-title ai-builder__label">
            {t("Opisz, co chcesz zobaczyć", "Describe what you want to see")}
          </label>
          <span className="zt-tag zt-tag--sample ai-builder__tag">
            {t("Wersja próbna: dopasowanie bez AI", "Preview: rule-based matching")}
          </span>
        </div>
        <p id={`${id}-hint`} className="small ai-builder__hint">
          {t(
            "Wskaźnik, obszar, okres i rodzaj wykresu, własnymi słowami. Zbudujemy widok w eksploratorze albo wskażemy gotową stronę.",
            "Indicator, area, period and chart type, in your own words. We build an explorer view or point to an existing page.",
          )}
        </p>
        <div className="ai-builder__row">
          <textarea
            id={`${id}-text`}
            ref={field}
            className="body-l ai-builder__input"
            rows={2}
            maxLength={300}
            value={text}
            aria-describedby={`${id}-hint`}
            placeholder={t(
              "np. inflacja w Polsce i Niemczech od 2015, bezrobocie w województwach na mapie",
              "e.g. inflation in Poland and Germany since 2015, unemployment by voivodeship on a map",
            )}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void run(text);
              }
            }}
          />
          <button type="submit" className="zt-btn zt-btn--primary ai-builder__submit" disabled={!catalog || busy}>
            {t("Zbuduj widok", "Build view")}
          </button>
        </div>
        <div className="ai-builder__examples">
          <span className="small ai-builder__muted" id={`${id}-ex`}>
            {t("Przykłady:", "Examples:")}
          </span>
          <ul className="ai-builder__exlist" aria-labelledby={`${id}-ex`}>
            {EXAMPLE_PROMPTS[lang].map((ex) => (
              <li key={ex}>
                <button
                  type="button"
                  className="zt-chip zt-chip--toggle small ai-builder__ex"
                  disabled={!catalog}
                  onClick={() => {
                    setText(ex);
                    void run(ex);
                  }}
                >
                  {ex}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </form>

      <p className="zt-sr" aria-live="polite">
        {announce}
      </p>

      {error ? (
        <div className="zt-card ai-result ai-result--none">
          <p className="body">{announce}</p>
        </div>
      ) : result ? (
        <Result result={result} lang={lang} />
      ) : null}
    </section>
  );
}

function Result({ result, lang }: { result: ViewProposal; lang: "pl" | "en" }) {
  const pl = lang === "pl";
  const t = (p: string, e: string) => (pl ? p : e);
  const none = result.kind === "none";
  return (
    <div className={`zt-card ai-result${none ? " ai-result--none" : ""}`}>
      <div className="ai-result__meta">
        {result.kind === "none" ? null : <span className="label-caps ai-result__kind">{KIND[result.kind][lang]}</span>}
        <span className="caption ai-result__conf">{CONFIDENCE[result.confidence][lang]}</span>
      </div>
      <h3 className="card-title ai-result__title">{result.title}</h3>
      {none ? (
        <p className="body ai-result__msg">
          {t(
            "Nie rozpoznaliśmy wskaźnika ani tematu. Nazwij wskaźnik (np. inflacja, bezrobocie, PKB, płace), obszar (Polska, Niemcy, województwa) i okres (od 2015, ostatnie 5 lat).",
            "We did not recognise an indicator or topic. Name an indicator (e.g. inflation, unemployment, GDP, wages), an area (Poland, Germany, voivodeships) and a period (since 2015, last 5 years).",
          )}
        </p>
      ) : null}
      <ul className="ai-result__chips" aria-label={t("Jak zrozumieliśmy prośbę", "How we read the request")}>
        {result.explanation.map((e) => (
          <li key={e} className="zt-chip caption ai-result__chip">
            {e}
          </li>
        ))}
      </ul>
      <div className="ai-result__actions">
        {none ? (
          <Link to={result.url} className="zt-btn ai-result__open">
            {t("Przeszukaj katalog", "Search the catalogue")}
          </Link>
        ) : (
          <Link to={result.url} className="zt-btn zt-btn--primary ai-result__open">
            {t("Otwórz", "Open")}
          </Link>
        )}
      </div>
      {result.alternatives.length ? (
        <div className="ai-result__alts">
          <p className="small ai-builder__muted">
            {none ? t("Może te widoki:", "Perhaps these views:") : t("Inne dopasowania:", "Other matches:")}
          </p>
          <ul>
            {result.alternatives.map((a) => (
              <li key={a.url}>
                <Link to={a.url}>{a.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
