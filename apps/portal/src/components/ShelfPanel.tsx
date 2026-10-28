import { moveDimension, type Shelves } from "../shelves";

// Rows, Columns and Not used: each dimension is a chip with buttons to move it. Native buttons
// only, so every move works with Tab and Enter (no drag and drop).

type Column = { column: string; label: string };
type Target = "rows" | "cols" | "none";

const GROUPS: [Target, string][] = [
  ["rows", "Rows"],
  ["cols", "Columns"],
  ["none", "Not used"],
];

export function ShelfPanel({ columns, shelves, onChange }: { columns: Column[]; shelves: Shelves; onChange: (s: Shelves) => void }) {
  const where = (c: string): Target => (shelves.rows.includes(c) ? "rows" : shelves.cols.includes(c) ? "cols" : "none");
  const members = (t: Target): Column[] => {
    if (t === "none") return columns.filter((c) => where(c.column) === "none");
    return shelves[t].map((c) => columns.find((x) => x.column === c) ?? { column: c, label: c });
  };

  return (
    <div className="shelves">
      {GROUPS.map(([target, heading]) => (
        <div key={target} className="shelf">
          <h3>{heading}</h3>
          {members(target).map((c) => (
            <span key={c.column} className="chip">
              {c.label}
              {(
                [
                  ["rows", "Rows", "move to Rows"],
                  ["cols", "Columns", "move to Columns"],
                  ["none", "Remove", "remove"],
                ] as const
              ).map(([to, text, aria]) => {
                const next = moveDimension(shelves, c.column, to);
                return (
                  <button
                    key={to}
                    type="button"
                    className="link-button"
                    aria-label={`${c.label}: ${aria}`}
                    disabled={to === target || next === shelves}
                    onClick={() => onChange(next)}
                  >
                    {text}
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
