import { useEffect, useRef, useState } from "react";
import { display } from "../labels";

// A multi-select filter: a button with the current choice, a popover with search and checkboxes.
// Values not available under the other filters are shown dimmed at the end.

type Props = {
  column: string;
  label: string;
  values: string[];
  available: Set<string>;
  chosen: string[];
  onChange: (values: string[]) => void;
};

export function FilterSelect({ column, label, values, available, chosen, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const needle = search.trim().toLocaleLowerCase("pl");
  const shown = values
    .filter((v) => !needle || display(column, v).toLocaleLowerCase("pl").includes(needle))
    .sort((a, b) => Number(available.has(b)) - Number(available.has(a)) || display(column, a).localeCompare(display(column, b), "pl"))
    .slice(0, 300);
  const summary =
    chosen.length === 0
      ? "All"
      : chosen.length === 1
        ? display(column, chosen[0]!)
        : `${display(column, chosen[0]!)} +${chosen.length - 1}`;
  const toggle = (v: string) => onChange(chosen.includes(v) ? chosen.filter((c) => c !== v) : [...chosen, v]);

  return (
    <div className="filter" ref={root}>
      <button
        type="button"
        className={`filter-button ${chosen.length ? "active" : ""}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="filter-label">{label}</span>
        <span className="filter-value">{summary}</span>
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label={label}>
          {values.length > 8 && (
            <input
              autoFocus
              className="search"
              placeholder={`Search ${label.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
          <div className="options">
            {shown.map((v) => (
              <label key={v} className={available.has(v) ? undefined : "unavailable"}>
                <input type="checkbox" checked={chosen.includes(v)} onChange={() => toggle(v)} />
                <span>{display(column, v)}</span>
              </label>
            ))}
            {!shown.length && <p className="hint">No match.</p>}
          </div>
          {chosen.length > 0 && (
            <button type="button" className="link-button" onClick={() => onChange([])}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
