// Ctrl K search across indicators, dashboards and guide pages (design system: CommandPalette).

import { useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "../../i18n";
import { navigate } from "../../router";
import type { Catalog } from "../../data";
import { Icon } from "../ui/icons";

type Hit = { group: string; label: string; meta: string; to: string };

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");

export function CommandPalette({ lang, catalog, onClose }: { lang: Lang; catalog: Catalog | undefined; onClose: () => void }) {
  const pl = lang === "pl";
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<Element | null>(document.activeElement);

  useEffect(() => {
    input.current?.focus();
    const el = opener.current;
    return () => (el as HTMLElement | null)?.focus?.();
  }, []);

  const hits = useMemo<Hit[]>(() => {
    if (!catalog) return [];
    const n = strip(q.trim());
    const name = (x: { name_pl: string; name_en: string }) => (pl ? x.name_pl : x.name_en);
    const dom = (key: string) => catalog.domains.find((d) => d.domain_key === key);
    const kpis: Hit[] = catalog.kpis.map((k) => ({
      group: pl ? "Wskaźniki" : "Indicators",
      label: name(k),
      meta: dom(k.group_key) ? name(dom(k.group_key)!) : "",
      to: `/kpi/${k.kpi_key}`,
    }));
    const boards: Hit[] = catalog.domains
      .filter((d) => d.level !== "subgroup")
      .map((d) => ({
        group: pl ? "Pulpity" : "Dashboards",
        label: name(d),
        meta: d.level === "domain" ? (pl ? "dziedzina" : "domain") : name(dom(d.parent_key!)!),
        to: d.level === "domain" ? `/d/${d.domain_key}` : `/d/${d.parent_key}/${d.domain_key.split(".")[1]}`,
      }));
    const guide: Hit[] = [
      ["Zasady i biblioteka wykresów", "Rules and chart library", "/przewodnik"],
      ["Biblioteka wykresów", "Chart library", "/przewodnik/wykresy"],
      ["Menu boczne", "Sidebar", "/przewodnik/menu"],
    ].map(([a, b, to]) => ({ group: pl ? "Przewodnik" : "Guide", label: pl ? a! : b!, meta: "", to: to! }));
    const all = [...kpis, ...boards, ...guide];
    return (n ? all.filter((h) => strip(h.label + " " + h.meta).includes(n)) : [...boards.slice(0, 4), ...guide.slice(0, 2)]).slice(0, 12);
  }, [catalog, q, pl]);

  const go = (h: Hit | undefined) => {
    if (!h) return;
    onClose();
    navigate(h.to);
  };

  return (
    <div
      className="t-palette-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="t-palette"
        role="dialog"
        aria-modal="true"
        aria-label={pl ? "Szukaj" : "Search"}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSel((s) => Math.min(s + 1, hits.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setSel((s) => Math.max(s - 1, 0));
          }
          if (e.key === "Enter") go(hits[sel]);
          if (e.key === "Tab") e.preventDefault();
        }}
      >
        <label className="t-palette__field">
          <Icon name="search" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            placeholder={pl ? "Szukaj wskaźnika, pulpitu, zasady" : "Search indicators, dashboards, rules"}
            aria-label={pl ? "Szukaj" : "Search"}
            role="combobox"
            aria-expanded="true"
            aria-controls="t-palette-list"
            aria-activedescendant={hits[sel] ? `t-hit-${sel}` : undefined}
          />
          <kbd className="zt-kbd">Esc</kbd>
        </label>
        <div role="listbox" id="t-palette-list" aria-label={pl ? "Wyniki" : "Results"} className="t-palette__list">
          {hits.length === 0 ? <p className="t-palette__empty">{pl ? "Nic nie znaleziono." : "Nothing found."}</p> : null}
          {hits.map((h, i) => (
            <div key={h.to + i}>
              {i === 0 || hits[i - 1]!.group !== h.group ? <div className="zt-nav-group t-palette__group">{h.group}</div> : null}
              <div
                id={`t-hit-${i}`}
                role="option"
                aria-selected={i === sel}
                className="t-palette__hit"
                onMouseEnter={() => setSel(i)}
                onClick={() => go(h)}
              >
                <span>{h.label}</span>
                <small>{h.meta}</small>
              </div>
            </div>
          ))}
        </div>
        <div className="t-palette__foot" aria-hidden="true">
          <span>↑↓ {pl ? "wybierz" : "choose"}</span>
          <span>Enter {pl ? "otwórz" : "open"}</span>
          <span>Esc {pl ? "zamknij" : "close"}</span>
        </div>
      </div>
    </div>
  );
}
