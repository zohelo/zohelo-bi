// Shared building blocks of the zohelo design template (components in the design system: PageHeader,
// PageTabs, SegmentedControl, KpiTile, ChartCard, ChartStates, StatusTag, ActionMenu). Pages compose these;
// they never restyle them.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { Icon } from "./icons";

export function PageHeader({ title, lead, right }: { title: string; lead?: ReactNode; right?: ReactNode }) {
  return (
    <div className="t-pagehead">
      <div className="t-pagehead__text">
        <h1 className="page-title">{title}</h1>
        {lead ? <p className="body-l t-lead">{lead}</p> : null}
      </div>
      {right ? <div className="t-pagehead__right">{right}</div> : null}
    </div>
  );
}

export function PageTabs({ label, tabs, current }: { label: string; tabs: { to: string; label: string }[]; current: string }) {
  return (
    <nav className="zt-tabs" aria-label={label}>
      {tabs.map((t) => (
        <Link key={t.to} to={t.to} aria-current={t.to === current ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  small,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  small?: boolean;
}) {
  return (
    <div className={`zt-seg${small ? " zt-seg--sm" : ""}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Visually hidden text for screen readers (design template: Accessibility, symbols and abbreviations). */
export function Sr({ children }: { children: ReactNode }) {
  return <span className="zt-sr">{children}</span>;
}

export function Sparkline({ values }: { values: (number | null)[] }) {
  const v = values.filter((x): x is number => x !== null);
  if (v.length < 2) return null;
  const lo = Math.min(...v),
    hi = Math.max(...v);
  const d = v
    .map((q, i) => `${i ? "L" : "M"}${(2 + (i * 84) / (v.length - 1)).toFixed(1)} ${(27 - ((q - lo) / (hi - lo || 1)) * 24).toFixed(1)}`)
    .join("");
  return (
    <svg className="t-spark" width="88" height="30" viewBox="0 0 88 30" aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="var(--series-1)" strokeWidth={1.75} strokeLinejoin="round" />
    </svg>
  );
}

export function KpiTile({
  label,
  period,
  value,
  change,
  context,
  source,
  spark,
  to,
}: {
  label: string;
  period: string;
  value: string;
  change?: { shown: string; spoken: string };
  context?: string;
  source?: string;
  spark?: (number | null)[];
  to?: string;
}) {
  const body = (
    <>
      <div className="zt-kpi__top">
        <span className="zt-kpi__label">{label}</span>
        <Sr>, </Sr>
        <span className="zt-kpi__period">{period}</span>
      </div>
      <div className="zt-kpi__row">
        <span className="zt-kpi__value">
          <Sr>, </Sr>
          {value}
        </span>
        {spark ? <Sparkline values={spark} /> : null}
      </div>
      {change ? (
        <span className="zt-kpi__delta">
          <span aria-hidden="true">{change.shown}</span>
          <Sr>, {change.spoken}, </Sr>
        </span>
      ) : null}
      {context ? (
        <span className="zt-kpi__ctx">
          {context}
          <Sr>, </Sr>
        </span>
      ) : null}
      {source ? <span className="zt-kpi__src">{source}</span> : null}
    </>
  );
  return to ? (
    <Link to={to} className="zt-kpi t-kpi-link">
      {body}
    </Link>
  ) : (
    <div className="zt-kpi">{body}</div>
  );
}

export type CardState =
  | { kind: "loading" }
  | { kind: "empty"; text: string }
  | { kind: "na"; text: string }
  | { kind: "error"; text: string; retry?: () => void };

export function ChartState({ state, lang }: { state: CardState; lang: Lang }) {
  if (state.kind === "loading")
    return (
      <div className="zt-state" aria-busy="true">
        <div className="zt-skel" style={{ width: "80%", height: 12 }} />
        <div className="zt-skel" style={{ width: "60%", height: 12 }} />
        <span>{lang === "pl" ? "Wczytywanie" : "Loading"}</span>
      </div>
    );
  if (state.kind === "error")
    return (
      <div className="zt-state zt-state--error" role="alert">
        <strong>{lang === "pl" ? "Nie udało się wczytać danych" : "Could not load the data"}</strong>
        <span>{state.text}</span>
        {state.retry ? (
          <button className="zt-btn" type="button" onClick={state.retry}>
            {lang === "pl" ? "Spróbuj ponownie" : "Try again"}
          </button>
        ) : null}
      </div>
    );
  return <div className="zt-state">{state.text}</div>;
}

export function ActionMenu({ label, items }: { label: string; items: ({ label: string; onSelect: () => void; hint?: string } | "sep")[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) {
        setOpen(false);
        if (e instanceof KeyboardEvent) ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const move = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const els = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = els.indexOf(document.activeElement as HTMLElement);
    els[(i + (e.key === "ArrowDown" ? 1 : -1) + els.length) % els.length]?.focus();
  };
  return (
    <div className="t-menuwrap" ref={ref}>
      <button
        className="zt-btn zt-btn--icon"
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
      >
        <Icon name="more" />
      </button>
      {open ? (
        <div className="zt-menu t-menu" role="menu" id={menuId} aria-label={label} onKeyDown={move}>
          {items.map((it, i) =>
            it === "sep" ? (
              <div key={i} role="separator" />
            ) : (
              <div
                key={i}
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen(false);
                    it.onSelect();
                  }
                }}
              >
                {it.label}
                {it.hint ? <small>{it.hint}</small> : null}
              </div>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Chart card: title states the finding, subtitle the measure; Wykres | Tabela toggle; actions menu; chart
 * or table; legend; source line. `chart` and `table` are render functions so only the visible view renders.
 */
export function ChartCard({
  title,
  sub,
  lang,
  chart,
  table,
  legend,
  source,
  state,
  span = 12,
  actions,
}: {
  title: string;
  sub: string;
  lang: Lang;
  chart: () => ReactNode;
  table: () => ReactNode;
  legend?: ReactNode;
  source?: ReactNode;
  state?: CardState;
  span?: 12 | 8 | 6 | 4;
  actions?: { label: string; onSelect: () => void }[];
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const headingId = useId();
  const pl = lang === "pl";
  return (
    <section className={`zt-card t-card t-span-${span}`} aria-labelledby={headingId}>
      <div className="zt-card__head">
        <div className="t-card__titles">
          <h3 className="zt-card__title" id={headingId}>
            {title}
          </h3>
          <p className="zt-card__sub">{sub}</p>
        </div>
        <div className="t-card__tools">
          <Segmented
            small
            label={(pl ? "Widok: " : "View: ") + title}
            value={view}
            onChange={setView}
            options={[
              { value: "chart", label: pl ? "Wykres" : "Chart" },
              { value: "table", label: pl ? "Tabela" : "Table" },
            ]}
          />
          <ActionMenu
            label={(pl ? "Więcej akcji: " : "More actions: ") + title}
            items={[
              { label: pl ? "Pokaż tabelę" : "Show table", onSelect: () => setView("table") },
              { label: pl ? "Pokaż wykres" : "Show chart", onSelect: () => setView("chart") },
              "sep",
              ...(actions ?? []),
              {
                label: pl ? "Kopiuj link" : "Copy link",
                onSelect: () => void navigator.clipboard?.writeText(window.location.href).catch(() => undefined),
              },
            ]}
          />
        </div>
      </div>
      <div className="t-card__body">
        {state ? (
          <ChartState state={state} lang={lang} />
        ) : view === "chart" ? (
          chart()
        ) : (
          <div className="zt-table-wrap t-tablewrap" tabIndex={0} role="region" aria-label={(pl ? "Tabela: " : "Table: ") + title}>
            {table()}
          </div>
        )}
      </div>
      {legend && view === "chart" && !state ? <div className="zt-legend t-legend">{legend}</div> : null}
      {source ? <div className="zt-card__foot">{source}</div> : null}
    </section>
  );
}

export function StatusTag({ kind, children }: { kind: "current" | "preliminary" | "revised" | "sample"; children: ReactNode }) {
  return (
    <span className={`zt-tag zt-tag--${kind}`}>
      {kind === "sample" ? null : <i aria-hidden="true" />}
      {children}
    </span>
  );
}
