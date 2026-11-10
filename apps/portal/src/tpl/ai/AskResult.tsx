// How the explorer understood a question typed in the ask box (?ask=…): the request, what was read from it
// (indicators, areas, period, chart), a link when the answer is another page, and other good matches.
// v1 is rule-based (ai/intent.ts); a model can fill the same ViewProposal later (docs/ai-view-builder.md).

import type { Lang } from "../../i18n";
import { Link } from "../../router";
import type { ViewProposal } from "./intent";

export function AskResult({
  text,
  proposal,
  lang,
  onClose,
  filled,
}: {
  text: string;
  proposal: ViewProposal;
  lang: Lang;
  onClose: () => void;
  /** Explorer v3: the fields the answer placed (shown so the reader sees and can change what was chosen). */
  filled?: string;
}) {
  const pl = lang === "pl";
  const elsewhere = proposal.kind !== "explore";
  // In the explorer the answer is one compact row (review 2026-11-09): the chart below shows the result and the
  // wells show what was set; other matches wait behind a disclosure.
  if (!elsewhere && filled)
    return (
      <section className="zt-card ask-result ask-result--compact" aria-labelledby="ask-result-h" aria-live="polite">
        <h2 id="ask-result-h" className="zt-sr">
          {proposal.title}
        </h2>
        <p className="caption ask-result__q">{pl ? <>Zapytanie: „{text}”</> : <>Request: “{text}”</>}</p>
        <ul className="ask-result__chips" aria-label={pl ? "Jak zrozumiano zapytanie" : "How the request was understood"}>
          {proposal.explanation.map((e) => (
            <li key={e} className="zt-chip">
              {e}
            </li>
          ))}
        </ul>
        <span className="zt-tag zt-tag--sample">{pl ? "Bez AI" : "Rule-based"}</span>
        {proposal.alternatives.length ? (
          <details className="ask-result__more">
            <summary>
              {pl ? "Inne dopasowania" : "Other matches"} ({proposal.alternatives.length})
            </summary>
            <p className="small">
              {proposal.alternatives.map((a, i) => (
                <span key={a.url}>
                  {i ? " · " : ""}
                  <Link to={a.url}>{a.label}</Link>
                </span>
              ))}
            </p>
          </details>
        ) : null}
        <button type="button" className="zt-btn ask-result__close" onClick={onClose}>
          {pl ? "Ukryj" : "Hide"}
        </button>
      </section>
    );
  return (
    <section className="zt-card ask-result" aria-labelledby="ask-result-h" aria-live="polite">
      <div className="ask-result__head">
        <p className="caption ask-result__q">{pl ? <>Zapytanie: „{text}”</> : <>Request: “{text}”</>}</p>
        <span className="zt-tag zt-tag--sample">{pl ? "Wersja próbna: dopasowanie bez AI" : "Preview: rule-based matching"}</span>
        <button type="button" className="zt-btn ask-result__close" onClick={onClose}>
          {pl ? "Ukryj" : "Hide"}
        </button>
      </div>
      <h2 id="ask-result-h" className="zt-card__title">
        {proposal.kind === "none" ? (pl ? "Nie udało się dopasować zapytania" : "The request could not be matched") : proposal.title}
      </h2>
      {proposal.explanation.length ? (
        <ul className="ask-result__chips" aria-label={pl ? "Jak zrozumiano zapytanie" : "How the request was understood"}>
          {proposal.explanation.map((e) => (
            <li key={e} className="zt-chip">
              {e}
            </li>
          ))}
        </ul>
      ) : null}
      {filled && !elsewhere ? (
        <p className="small ask-result__filled">
          {pl ? "Ustawione pola: " : "Fields set: "}
          {filled}. {pl ? "Zmień je poniżej w polach i na wykresie." : "Change them below in the fields and on the chart."}
        </p>
      ) : null}
      {elsewhere ? (
        <p className="ask-result__go">
          <Link to={proposal.url} className="zt-btn zt-btn--primary">
            {proposal.kind === "none" ? (pl ? "Przeszukaj katalog" : "Search the catalogue") : pl ? "Otwórz" : "Open"}
          </Link>
        </p>
      ) : null}
      {proposal.alternatives.length ? (
        <p className="small ask-result__alts">
          {pl ? "Inne dopasowania: " : "Other matches: "}
          {proposal.alternatives.map((a, i) => (
            <span key={a.url}>
              {i ? " · " : ""}
              <Link to={a.url}>{a.label}</Link>
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}
