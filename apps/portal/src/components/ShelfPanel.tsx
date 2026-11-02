import { t, type Lang, type StringKey } from "../i18n";
import { moveDimension, type Shelves } from "../shelves";

// Rows, Columns and Not used: each dimension is a chip with buttons to move it. Native buttons
// only, so every move works with Tab and Enter (no drag and drop).

type Column = { column: string; label: string };
type Target = "rows" | "cols" | "none";

const GROUPS: [Target, StringKey][] = [
  ["rows", "shelf.rows"],
  ["cols", "shelf.cols"],
  ["none", "shelf.none"],
];

const MOVES: [Target, StringKey, StringKey][] = [
  ["rows", "shelf.rows", "shelf.toRows"],
  ["cols", "shelf.cols", "shelf.toCols"],
  ["none", "shelf.remove", "shelf.toNone"],
];

export function ShelfPanel({
  columns,
  shelves,
  onChange,
  lang = "en",
}: {
  columns: Column[];
  shelves: Shelves;
  onChange: (s: Shelves) => void;
  lang?: Lang;
}) {
  const where = (c: string): Target => (shelves.rows.includes(c) ? "rows" : shelves.cols.includes(c) ? "cols" : "none");
  const members = (g: Target): Column[] => {
    if (g === "none") return columns.filter((c) => where(c.column) === "none");
    return shelves[g].map((c) => columns.find((x) => x.column === c) ?? { column: c, label: c });
  };

  return (
    <div className="shelves">
      {GROUPS.map(([target, heading]) => (
        <div key={target} className="shelf">
          <h3>{t(lang, heading)}</h3>
          {members(target).map((c) => (
            <span key={c.column} className="chip">
              {c.label}
              {MOVES.map(([to, textKey, ariaKey]) => {
                const next = moveDimension(shelves, c.column, to);
                return (
                  <button
                    key={to}
                    type="button"
                    className="link-button"
                    aria-label={`${c.label}: ${t(lang, ariaKey)}`}
                    disabled={to === target || next === shelves}
                    onClick={() => onChange(next)}
                  >
                    {t(lang, textKey)}
                  </button>
                );
              })}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
