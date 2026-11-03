// One dashboard card: plan → fetch → build → ChartCard (title with filled tokens, subtitle, Wykres | Tabela,
// legend for 2+ series, source line) with loading, empty, not-applicable and error states.

import { useMemo, useState } from "react";
import { ZChart, ZLegend, legendItems, toTable } from "@zohelo/visuals";
import type { V3Card } from "@zohelo/semantic";
import { useData } from "../../components/useData";
import { data, type Catalog, type Series } from "../../data";
import type { Lang } from "../../i18n";
import { navigate } from "../../router";
import { kpiName } from "../chartData";
import { ChartCard, type CardState } from "../ui/blocks";
import { TableView } from "../ui/TableView";
import { buildCard, planCard, planKey } from "./build";
import { downloadText, toCsv } from "./csv";
import type { DashState } from "./state";

const TOKEN = /\{[a-z]+\}/g;

export function DashCard({ card, cat, lang, state }: { card: V3Card; cat: Catalog; lang: Lang; state: DashState }) {
  const pl = lang === "pl";
  const [attempt, setAttempt] = useState(0);
  const stateKey = JSON.stringify(state);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stateKey identifies the state
  const plan = useMemo(() => planCard(card, cat, state), [card, cat, stateKey]);
  const key = "problem" in plan ? null : `card|${planKey(plan)}|${attempt}`;
  const loaded = useData(key, async () => {
    if ("problem" in plan) return { key, rows: {} };
    const rows: Record<string, Series[]> = {};
    await Promise.all(plan.fetches.map(async (f) => (rows[f.id] = await data.series(f.kpi, f.query))));
    return { key, rows };
  });
  const ready = loaded.data && loaded.data.key === key && !("problem" in plan) ? loaded.data.rows : undefined;
  const built = useMemo(() => (ready && !("problem" in plan) ? buildCard(plan, ready, cat, lang) : undefined), [ready, plan, cat, lang]);

  const rawTitle = pl ? card.title_pl : card.title_en;
  const title = built ? built.z.ariaLabel : rawTitle.replace(TOKEN, "…");
  const kpi = cat.kpis.find((k) => k.kpi_key === card.kpi);
  const sub = built?.sub ?? (pl ? card.sub_pl : card.sub_en) ?? (kpi ? kpiName(kpi, lang) : card.kpi);

  let state_: CardState | undefined;
  if ("problem" in plan) state_ = { kind: "na", text: pl ? plan.problem.pl : plan.problem.en };
  else if (loaded.error) state_ = { kind: "error", text: loaded.error, retry: () => setAttempt((a) => a + 1) };
  else if (!built) state_ = { kind: "loading" };
  else if (built.empty)
    state_ = {
      kind: "empty",
      text: pl
        ? "Brak danych dla wybranego okresu. Wybierz dłuższy okres w filtrze Okres."
        : "No data for the selected period. Choose a longer period in the Period filter.",
    };

  const legend = built ? legendItems(built.z) : [];
  const csv = () => {
    if (!built) return;
    const t = toTable(built.z);
    const meta = [
      title,
      built.sub,
      `${pl ? "Źródło" : "Source"}: ${built.source}`,
      ...(cat.sample ? [pl ? "Dane przykładowe (syntetyczne)" : "Sample (synthetic) data"] : []),
    ];
    downloadText(`${card.kpi}-${card.chart}.csv`, toCsv(meta, t.columns, t.rows));
  };

  return (
    <ChartCard
      title={title}
      sub={sub}
      lang={lang}
      span={card.span ?? 12}
      state={state_}
      chart={() => (built ? <ZChart {...built.z} /> : null)}
      table={() => (built ? <TableView table={toTable(built.z)} /> : null)}
      legend={legend.length ? <ZLegend items={legend} /> : undefined}
      source={
        built ? (
          <>
            {pl ? "Źródło: " : "Source: "}
            {built.source}
            {cat.sample ? (pl ? " · dane przykładowe" : " · sample data") : null}
          </>
        ) : undefined
      }
      actions={[
        ...(built ? [{ label: pl ? "Pobierz CSV" : "Download CSV", onSelect: csv }] : []),
        ...(kpi ? [{ label: pl ? "Strona wskaźnika" : "Indicator page", onSelect: () => navigate(`/kpi/${card.kpi}`) }] : []),
      ]}
    />
  );
}
