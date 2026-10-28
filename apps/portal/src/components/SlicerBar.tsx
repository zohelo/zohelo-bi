import type { Slicer, SlicerValues } from "@zohelo/semantic";
import { display } from "../labels";

// The bar of dashboard slicers above the tiles (docs/dashboards.md). Presentational: the page reads
// and writes the URL and merges the values into every tile (mergeView).

export function SlicerBar({
  slicers,
  values,
  geographies,
  onChange,
}: {
  slicers: Slicer[];
  values: SlicerValues;
  geographies: string[];
  onChange: (next: SlicerValues) => void;
}) {
  if (slicers.length === 0) return null;
  const set = (key: string, value: string) => {
    const next = { ...values };
    if (value === "") delete next[key];
    else next[key] = value;
    onChange(next);
  };
  return (
    <div className="slicer-bar" role="group" aria-label="Slicers">
      {slicers.map((slicer) =>
        slicer === "geography" ? (
          <label key={slicer}>
            Area{" "}
            <select aria-label="Area" value={values.geography_name ?? ""} onChange={(e) => set("geography_name", e.target.value)}>
              <option value="">All areas</option>
              {geographies.map((g) => (
                <option key={g} value={g}>
                  {display("geography_name", g)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          (["from", "to"] as const).map((key) => {
            const label = key === "from" ? "From" : "To";
            return (
              <label key={key}>
                {label}{" "}
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY"
                  size={10}
                  aria-label={label}
                  value={values[key] ?? ""}
                  onChange={(e) => set(key, e.target.value)}
                />
              </label>
            );
          })
        ),
      )}
    </div>
  );
}
