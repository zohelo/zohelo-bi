// Shared building blocks of the zohelo design template (components in the design system: PageHeader,
// PageTabs, SegmentedControl, KpiTile, ChartCard, ChartStates, StatusTag, ActionMenu). Pages compose these;
// they never restyle them.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { Icon, type IconName } from "./icons";
import { chartPng, copyImage, copyTable, legendFrom, type CopyTable } from "./copy";

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

export function ActionMenu({
  label,
  items,
  icon = "more",
}: {
  label: string;
  items: ({ label: string; onSelect: () => void; hint?: string } | "sep")[];
  icon?: IconName;
}) {
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
        <Icon name={icon} size={icon === "more" ? 18 : 16} />
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

/** A small icon button opening a non-modal panel (Esc, outside click and the close button return focus). */
export function InfoPopover({ label, icon, children }: { label: string; icon: IconName; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    wrap.current?.querySelector<HTMLElement>(".t-info__panel")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="t-menuwrap" ref={wrap}>
      <button
        ref={btn}
        type="button"
        className="zt-btn zt-btn--icon t-cardbtn"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      >
        <Icon name={icon} size={16} />
      </button>
      {open ? (
        <div className="zt-menu t-menu t-info__panel" role="dialog" id={id} aria-label={label} tabIndex={-1}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Chart card: title states the finding, subtitle the measure; top right only what matters for this chart:
 * its period (time charts), Kopiuj (image or table for Excel/Word/email) and Informacje (definition, source,
 * link to the indicator page). The table of the chart is always in the page for screen readers.
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
  tools,
  copyData,
  sourceText,
  info,
}: {
  title: string;
  sub: string;
  lang: Lang;
  chart: () => ReactNode;
  /** The chart's numbers as a table: read by screen readers (visually hidden). */
  table: () => ReactNode;
  legend?: ReactNode;
  source?: ReactNode;
  state?: CardState;
  span?: 12 | 8 | 6 | 4;
  /** The chart's own controls, e.g. its period. */
  tools?: ReactNode;
  /** Numbers for Kopiuj → dane; without it only the image can be copied. */
  copyData?: () => CopyTable | undefined;
  /** Plain source line written under a copied image. */
  sourceText?: string;
  /** Content of the Informacje panel (definition, unit, source, link to the indicator page). */
  info?: ReactNode;
}) {
  const headingId = useId();
  const pl = lang === "pl";
  const body = useRef<HTMLDivElement>(null);
  const [said, setSaid] = useState("");
  const tell = (ok: boolean, what: "img" | "data") =>
    setSaid(
      ok
        ? what === "img"
          ? pl
            ? "Skopiowano wykres jako obraz"
            : "Chart copied as an image"
          : pl
            ? "Skopiowano dane wykresu"
            : "Chart data copied"
        : pl
          ? "Przeglądarka nie pozwoliła skopiować"
          : "The browser did not allow copying",
    );
  const copyImg = async () => {
    const svg = body.current?.querySelector<SVGSVGElement>("svg.zc-plot") ?? body.current?.querySelector<SVGSVGElement>("svg");
    if (!svg) return tell(false, "img");
    try {
      tell(await copyImage(await chartPng(svg, title, sourceText ?? "", legendFrom(body.current?.parentElement ?? null))), "img");
    } catch {
      tell(false, "img");
    }
  };
  const copyNums = async () => {
    const t = copyData?.();
    if (!t) return tell(false, "data");
    tell(await copyTable(title, t), "data");
  };
  const ready = !state;
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
          {tools}
          {ready ? (
            <ActionMenu
              label={(pl ? "Kopiuj: " : "Copy: ") + title}
              icon="copy"
              items={[
                {
                  label: pl ? "Kopiuj jako obraz" : "Copy as image",
                  hint: pl ? "e-mail, Word, PowerPoint" : "email, Word, PowerPoint",
                  onSelect: () => void copyImg(),
                },
                ...(copyData
                  ? [
                      {
                        label: pl ? "Kopiuj dane jako tabelę" : "Copy data as a table",
                        hint: "Excel, Word, e-mail",
                        onSelect: () => void copyNums(),
                      },
                    ]
                  : []),
              ]}
            />
          ) : null}
          {info ? (
            <InfoPopover label={(pl ? "Informacje: " : "About: ") + title} icon="info">
              {info}
            </InfoPopover>
          ) : null}
        </div>
      </div>
      <div className="t-card__body" ref={body}>
        {state ? <ChartState state={state} lang={lang} /> : chart()}
        {ready ? <div className="zt-sr">{table()}</div> : null}
      </div>
      {legend && ready ? <div className="zt-legend t-legend">{legend}</div> : null}
      {source ? <div className="zt-card__foot">{source}</div> : null}
      <p className="zt-sr" role="status">
        {said}
      </p>
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
