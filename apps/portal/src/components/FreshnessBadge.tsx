import type { Freshness } from "@zohelo/semantic";

/** A KPI's freshness (from freshness() in @zohelo/semantic) as a small badge. */
export function FreshnessBadge({ f }: { f: Freshness }) {
  const text = f.lastPeriod ? `to ${f.lastPeriod}` : "no data";
  return (
    <span className={`badge freshness freshness-${f.status}`} title={f.loadedDate ? `loaded ${f.loadedDate}` : undefined}>
      {text}
    </span>
  );
}
