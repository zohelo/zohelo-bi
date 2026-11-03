// Building blocks of guide pages: section with anchor, rule list, live example frame, do/don't pair,
// when/avoid list, spec table and code block. Composed from zt-* classes; own styles in guide.css.

import type { ReactNode } from "react";
import { usePage } from "../context";

/** Bilingual text picker: t("Polski", "English"). */
export function useT() {
  const { lang } = usePage();
  return { lang, pl: lang === "pl", t: (pl: string, en: string) => (lang === "pl" ? pl : en) };
}

export function GSection({ id, title, lead, children }: { id: string; title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section className="g-sec" aria-labelledby={id}>
      <div className="g-sec__head">
        <h2 id={id} className="section-title g-anchor">
          {title}
        </h2>
        {lead ? <p className="g-sec__lead">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Rules({ items, title }: { items: ReactNode[]; title?: string }) {
  return (
    <div className="g-rules">
      {title ? <h3 className="g-h3">{title}</h3> : null}
      <ul>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

/** A live example: the real component on a neutral ground, with what to notice underneath. */
export function Example({
  label,
  caption,
  children,
  ground = "canvas",
  className,
}: {
  label?: string;
  caption?: ReactNode;
  children: ReactNode;
  ground?: "canvas" | "surface" | "inverse";
  className?: string;
}) {
  const { t } = useT();
  return (
    <figure className={`g-example${className ? " " + className : ""}`}>
      <div className="g-example__label" aria-hidden="true">
        {label ?? t("Przykład na żywo", "Live example")}
      </div>
      <div className={`g-example__stage g-example__stage--${ground}`}>{children}</div>
      {caption ? <figcaption className="g-example__cap">{caption}</figcaption> : null}
    </figure>
  );
}

function Mark({ ok }: { ok: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path
        d={ok ? "M2.5 7.5l3 3 6-7" : "M3 3l8 8M11 3l-8 8"}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Correct and incorrect side by side; the verdict is a word with an icon, never colour alone. */
export function DoDont({ ok, bad, okNote, badNote }: { ok: ReactNode; bad: ReactNode; okNote?: ReactNode; badNote?: ReactNode }) {
  const { t } = useT();
  return (
    <div className="g-dodont">
      <div className="g-do">
        <p className="g-verdict g-verdict--ok">
          <Mark ok />
          {t("Tak", "Do")}
        </p>
        <div className="g-dodont__body">{ok}</div>
        {okNote ? <p className="g-dodont__note">{okNote}</p> : null}
      </div>
      <div className="g-dont">
        <p className="g-verdict g-verdict--bad">
          <Mark ok={false} />
          {t("Nie", "Don't")}
        </p>
        <div className="g-dodont__body">{bad}</div>
        {badNote ? <p className="g-dodont__note">{badNote}</p> : null}
      </div>
    </div>
  );
}

/** "Kiedy / Unikaj" guidance as a description list (labels in the reserved status text colours). */
export function WhenAvoid({ use, avoid, marks }: { use: ReactNode; avoid: ReactNode; marks?: ReactNode }) {
  const { t } = useT();
  return (
    <dl className="g-when">
      <dt className="g-when__use">{t("Kiedy", "When")}</dt>
      <dd>{use}</dd>
      <dt className="g-when__avoid">{t("Unikaj", "Avoid")}</dt>
      <dd>{avoid}</dd>
      {marks ? (
        <>
          <dt>{t("Kolor i znaczniki", "Colour and marks")}</dt>
          <dd>{marks}</dd>
        </>
      ) : null}
    </dl>
  );
}

/** A documentation table: real table with caption, scrolling inside its own labelled region. */
export function SpecTable({ caption, head, rows, numeric }: { caption: string; head: ReactNode[]; rows: ReactNode[][]; numeric?: boolean[] }) {
  return (
    <div className="zt-table-wrap g-tablewrap" tabIndex={0} role="region" aria-label={caption}>
      <table className="zt-table g-table">
        <caption className="zt-sr">{caption}</caption>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className={numeric?.[i] ? "num" : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="g-table__rowhead">
                    {c}
                  </th>
                ) : (
                  <td key={j} className={numeric?.[j] ? "num" : undefined}>
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Code({ label, children }: { label: string; children: string }) {
  return (
    <pre className="g-code" tabIndex={0} role="region" aria-label={label}>
      <code>{children}</code>
    </pre>
  );
}

/** A token or code name in running text. */
export function Tok({ children }: { children: ReactNode }) {
  return <code className="g-tok">{children}</code>;
}

/** A numbered anatomy list next to an illustration. */
export function Anatomy({ items }: { items: { name: ReactNode; text: ReactNode }[] }) {
  return (
    <ol className="g-anatomy">
      {items.map((it, i) => (
        <li key={i}>
          <span className="g-anatomy__n" aria-hidden="true">
            {i + 1}
          </span>
          <span>
            <strong>{it.name}</strong> {it.text}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Grid({ cols = 2, children, className }: { cols?: 2 | 3 | 4; children: ReactNode; className?: string }) {
  return <div className={`g-grid g-grid--${cols}${className ? " " + className : ""}`}>{children}</div>;
}
