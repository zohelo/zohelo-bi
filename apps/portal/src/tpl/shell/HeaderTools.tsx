// Right side of the top bar (design system: TopBar tools): data freshness and version, language menu with
// flags, and the account button. Same order on every portal; on phones only the language and account icons.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Lang } from "../../i18n";
import type { Catalog } from "../../data";
import { Flag, Icon } from "../ui/icons";
import { Segmented } from "../ui/blocks";
import { saveRole, type Role } from "../personal";
import { usePersonal } from "../usePersonal";
import { saveVariant, type Variants } from "../variants";
import "./variants.css";

/** Version of the template build shown next to the data date. */
export const APP_VERSION = "0.9";

const LANGS: { key: Lang; name: string; short: string }[] = [
  { key: "pl", name: "Polski", short: "PL" },
  { key: "en", name: "English", short: "EN" },
];

/** A button with a popup (menu or panel) that closes on Escape, outside click or a click on a [data-close]
 * element inside it, and returns focus to the button. */
function Popup({
  label,
  trigger,
  role,
  className,
  children,
}: {
  label: string;
  trigger: ReactNode;
  role: "menu" | "dialog";
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = () => {
    setOpen(false);
    btn.current?.focus();
  };
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
    wrap.current?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"], [data-autofocus]')?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="t-popwrap" ref={wrap}>
      <button
        ref={btn}
        type="button"
        className={className ?? "zt-btn"}
        aria-haspopup={role}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      >
        {trigger}
      </button>
      {open ? (
        <div
          className={`zt-menu t-pop t-pop--${role}`}
          role={role}
          id={id}
          aria-label={label}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("[data-close]")) close();
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function LangMenu({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const pl = lang === "pl";
  const cur = LANGS.find((l) => l.key === lang)!;
  return (
    <Popup
      role="menu"
      className="zt-btn t-langbtn"
      label={`${pl ? "Język" : "Language"}: ${cur.name}`}
      trigger={
        <>
          <Flag lang={cur.key} />
          <span className="t-langbtn__code">{cur.short}</span>
          <span className="zt-sr">{`, ${pl ? "język" : "language"}: ${cur.name}`}</span>
          <Icon name="chevronDown" size={14} />
        </>
      }
    >
      {
        <div
          onKeyDown={(e) => {
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            e.preventDefault();
            const items = [...(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
            const i = items.indexOf(document.activeElement as HTMLElement);
            items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
          }}
        >
          {LANGS.map((l) => (
            <div
              key={l.key}
              role="menuitemradio"
              aria-checked={l.key === lang}
              tabIndex={-1}
              lang={l.key}
              className="t-langitem"
              data-close
              onClick={() => setLang(l.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
            >
              <Flag lang={l.key} />
              <span>{l.name}</span>
            </div>
          ))}
        </div>
      }
    </Popup>
  );
}

/** Accounts are planned (public free access stays; saved views and paid plans later): the button says so. */
export function AccountButton({ lang }: { lang: Lang }) {
  const pl = lang === "pl";
  return (
    <Popup
      role="dialog"
      className="zt-btn t-account"
      label={pl ? "Konto" : "Account"}
      trigger={
        <>
          <Icon name="user" size={16} />
          <span className="t-account__label">{pl ? "Zaloguj się" : "Sign in"}</span>
          <span className="zt-sr t-account__phone">{pl ? "Konto" : "Account"}</span>
        </>
      }
    >
      {
        <div className="t-accountpop">
          <p className="t-accountpop__title">{pl ? "Konta zohelo wkrótce" : "zohelo accounts are coming"}</p>
          <p className="small">
            {pl
              ? "Wszystkie dane i dashboardy pozostaną dostępne bez logowania. Konto doda zapisane widoki, powiadomienia o nowych danych i plany dla zespołów."
              : "All data and dashboards stay open without signing in. An account will add saved views, alerts on new data and plans for teams."}
          </p>
          <RolePreview lang={lang} />
          <VariantPreview lang={lang} />
          <button type="button" className="zt-btn" data-autofocus data-close>
            {pl ? "Rozumiem" : "Got it"}
          </button>
        </div>
      }
    </Popup>
  );
}

/** Template only: preview the portal as a standard user or as an administrator (who also sees Przewodnik). */
function RolePreview({ lang }: { lang: Lang }) {
  const pl = lang === "pl";
  const { role } = usePersonal();
  return (
    <div className="t-rolepreview">
      <span className="small">{pl ? "Plan: Bezpłatny · podgląd roli:" : "Plan: Free · preview role:"}</span>
      <Segmented<Role>
        small
        label={pl ? "Podgląd roli" : "Preview role"}
        value={role}
        onChange={saveRole}
        options={[
          { value: "user", label: pl ? "Użytkownik" : "User" },
          { value: "admin", label: pl ? "Administrator" : "Admin" },
        ]}
      />
    </div>
  );
}

/** Template only: design variants of the pages under review (design brief §6); the owner picks one per page. */
function VariantPreview({ lang }: { lang: Lang }) {
  const pl = lang === "pl";
  const { variants } = usePersonal();
  const rows: { key: keyof Variants; label: string; options: { value: string; label: string }[] }[] = [
    {
      key: "homeBg",
      label: pl ? "Strona główna · tło" : "Home · background",
      options: [
        { value: "A", label: pl ? "A Gradient" : "A Gradient" },
        { value: "B", label: pl ? "B Linie danych" : "B Data lines" },
        { value: "C", label: pl ? "C Mapa" : "C Map" },
      ],
    },
    {
      key: "homeLayout",
      label: pl ? "Strona główna · układ" : "Home · layout",
      options: [
        { value: "rows", label: pl ? "Dla Ciebie" : "For you first" },
        { value: "story", label: pl ? "Historia dnia" : "Story of the day" },
      ],
    },
  ];
  return (
    <div className="t-rolepreview">
      <span className="small">{pl ? "Warianty projektu (podgląd do wyboru):" : "Design variants (preview to choose):"}</span>
      {rows.map((r) => (
        <div key={r.key} className="t-variant">
          <span className="caption">{r.label}</span>
          <Segmented<string>
            small
            label={r.label}
            value={variants[r.key]}
            onChange={(v) => saveVariant(r.key, v as never)}
            options={r.options}
          />
        </div>
      ))}
    </div>
  );
}

/** Date of the data and the version of the portal, e.g. "Dane z 24.10.2026 · v0.9". */
export function DataStamp({ lang, catalog }: { lang: Lang; catalog: Catalog | undefined }) {
  const pl = lang === "pl";
  const date = catalog?.generated_at.slice(0, 10);
  const shown = date ? date.split("-").reverse().join(".") : "–";
  return (
    <p className="t-stamp">
      <Icon name="clock" size={14} />
      <span>
        {pl ? "Dane z " : "Data as of "}
        <time dateTime={date}>{shown}</time>
        <span className="t-stamp__ver">
          {" · "}
          {pl ? "wersja " : "version "}
          {APP_VERSION}
        </span>
      </span>
    </p>
  );
}
