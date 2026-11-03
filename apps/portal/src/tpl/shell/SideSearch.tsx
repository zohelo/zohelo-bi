// Sidebar search (design system: Search). Typing in the field lists matches right under it (combobox +
// listbox); Enter or a click opens the hit. In the icon rail the field becomes a button that opens the same
// search in a panel beside the rail. Ctrl K focuses it from anywhere.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Lang } from "../../i18n";
import { navigate } from "../../router";
import type { Catalog } from "../../data";
import { Icon } from "../ui/icons";
import { searchHits, type Hit } from "./search";

export function SideSearch({
  lang,
  catalog,
  compact,
  onPhoneOpen,
  hero,
}: {
  lang: Lang;
  catalog: Catalog | undefined;
  /** Icon rail: show a button and open the search in a panel. */
  compact: boolean;
  /** Phones: open the drawer first (Ctrl K / keyboard users). */
  onPhoneOpen: () => void;
  /** Large search on the home page (no Ctrl K: that belongs to the sidebar field). */
  hero?: boolean;
}) {
  const pl = lang === "pl";
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [focused, setFocused] = useState(false);
  const [panel, setPanel] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const hits = useMemo<Hit[]>(() => searchHits(catalog, q, pl), [catalog, q, pl]);
  const open = (focused || panel) && q.trim().length > 0;

  useEffect(() => {
    if (hero) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (window.matchMedia("(max-width: 767px)").matches) onPhoneOpen();
        if (compact) setPanel(true);
        // The field may only appear after the drawer or panel renders.
        requestAnimationFrame(() => input.current?.focus());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compact, onPhoneOpen, hero]);

  useEffect(() => {
    if (panel) input.current?.focus();
  }, [panel]);

  const close = (restore: boolean) => {
    setQ("");
    setSel(0);
    if (panel) {
      setPanel(false);
      if (restore) button.current?.focus();
    }
  };
  const go = (h: Hit | undefined) => {
    if (!h) return;
    close(false);
    input.current?.blur();
    navigate(h.to);
  };

  const field = (
    <div className="zt-search t-search">
      <Icon name="search" size={16} />
      <input
        ref={input}
        type="search"
        value={q}
        placeholder={
          hero ? (pl ? "Szukaj wskaźnika, tematu lub dashboardu" : "Search an indicator, topic or dashboard") : pl ? "Szukaj…" : "Search…"
        }
        aria-label={pl ? "Szukaj" : "Search"}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && hits[sel] ? `${listId}-${sel}` : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (panel) setPanel(false);
        }}
        onChange={(e) => {
          setQ(e.target.value);
          setSel(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && hits.length) {
            e.preventDefault();
            setSel((s) => (s + 1) % hits.length);
          } else if (e.key === "ArrowUp" && hits.length) {
            e.preventDefault();
            setSel((s) => (s - 1 + hits.length) % hits.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(hits[sel]);
          } else if (e.key === "Escape") {
            e.preventDefault();
            close(true);
          }
        }}
      />
      {q || hero ? null : <kbd className="zt-kbd t-search__kbd">Ctrl K</kbd>}
    </div>
  );

  const results = (
    <div className={`t-searchpop${open ? "" : " t-searchpop--closed"}`}>
      <div role="listbox" id={listId} aria-label={pl ? "Wyniki wyszukiwania" : "Search results"} className="t-searchpop__list">
        {open && hits.length === 0 ? <p className="t-searchpop__empty">{pl ? "Nic nie znaleziono." : "Nothing found."}</p> : null}
        {open
          ? hits.map((h, i) => (
              <div key={h.to + i}>
                {i === 0 || hits[i - 1]!.group !== h.group ? (
                  <div className="zt-nav-group t-searchpop__group" aria-hidden="true">
                    {h.group}
                  </div>
                ) : null}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === sel}
                  className="t-searchpop__hit"
                  // Keep focus in the field so the click lands before blur closes the list.
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => go(h)}
                >
                  <span>{h.label}</span>
                  {h.meta ? <small>{h.meta}</small> : null}
                </div>
              </div>
            ))
          : null}
      </div>
    </div>
  );

  if (compact)
    return (
      <div className="t-side__search t-side__search--compact" role="search" aria-label={pl ? "Szukaj w portalu" : "Search the portal"}>
        <button
          ref={button}
          type="button"
          className="zt-nav-item t-searchicon"
          aria-label={pl ? "Szukaj (Ctrl K)" : "Search (Ctrl K)"}
          title={pl ? "Szukaj" : "Search"}
          aria-expanded={panel}
          onClick={() => setPanel(true)}
        >
          <Icon name="search" />
        </button>
        {panel ? (
          <div className="t-searchpanel">
            {field}
            {results}
          </div>
        ) : null}
      </div>
    );
  return (
    <div
      className={hero ? "t-herosearch" : "t-side__search"}
      role="search"
      aria-label={hero ? (pl ? "Wyszukiwarka danych" : "Data search") : pl ? "Szukaj w portalu" : "Search the portal"}
    >
      {field}
      {results}
    </div>
  );
}
