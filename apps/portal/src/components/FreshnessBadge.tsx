import type { Freshness } from "@zohelo/semantic";
import { t, type Lang } from "../i18n";

/** A KPI's freshness (from freshness() in @zohelo/semantic) as a small badge. */
export function FreshnessBadge({ f, lang = "en" }: { f: Freshness; lang?: Lang }) {
  const text = f.lastPeriod ? t(lang, "fresh.to").replace("{period}", f.lastPeriod) : t(lang, "fresh.noData");
  return (
    <span
      className={`badge freshness freshness-${f.status}`}
      title={f.loadedDate ? t(lang, "fresh.loaded").replace("{date}", f.loadedDate) : undefined}
    >
      {text}
    </span>
  );
}
