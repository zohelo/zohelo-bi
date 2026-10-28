import { dashboards } from "./dashboards";
import { Dashboard } from "./pages/Dashboard";
import { Explorer } from "./pages/Explorer";
import { Catalogue } from "./pages/Catalogue";
import { Embed } from "./pages/Embed";
import { NotFound } from "./pages/NotFound";
import { t } from "./i18n";
import { useLang } from "./lang";
import { Link, useLocation } from "./router";
import { pageFor } from "./routes";

const NAV = [
  { to: "/", key: "nav.dashboard" },
  { to: "/explore", key: "nav.explorer" },
  { to: "/catalogue", key: "nav.catalogue" },
] as const;

export function App() {
  const url = useLocation();
  const [lang, setLang] = useLang();
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const page = pageFor(
    url.pathname,
    dashboards.map((d) => d.id),
  );
  const board = page.kind === "dashboard" ? dashboards.find((d) => d.id === page.id) : undefined;
  // Chart-only page for iframes: no topbar, no footer.
  if (path.startsWith("/embed")) return <Embed />;

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          zohelo <span className="brand-product">bi</span>
        </Link>
        <nav>
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={(n.to === "/" ? path === "/" || path.startsWith("/d/") : path.startsWith(n.to)) ? "active" : undefined}
            >
              {t(lang, n.key)}
            </Link>
          ))}
        </nav>
        <span className="badge" title={t(lang, "badge.pocTitle")}>
          {t(lang, "badge.poc")}
        </span>
        <button
          type="button"
          className="lang-toggle"
          onClick={() => setLang(lang === "pl" ? "en" : "pl")}
          aria-label={t(lang, "lang.switch")}
        >
          {lang === "pl" ? "EN" : "PL"}
        </button>
      </header>
      <main>
        {page.kind === "explore" ? (
          <Explorer lang={lang} />
        ) : page.kind === "catalogue" ? (
          <Catalogue />
        ) : board ? (
          <Dashboard key={board.id} dashboard={board} />
        ) : (
          <NotFound path={path} />
        )}
      </main>
      <footer className="footer">
        {t(lang, "footer.data")} <a href="https://github.com/zohelo/zohelo-data">zohelo-data</a>.
      </footer>
    </>
  );
}
