import { dashboards } from "./dashboards";
import { Dashboard } from "./pages/Dashboard";
import { Explorer } from "./pages/Explorer";
import { Catalogue } from "./pages/Catalogue";
import { Link, useLocation } from "./router";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/explore", label: "Explorer" },
  { to: "/catalogue", label: "Catalogue" },
];

export function App() {
  const url = useLocation();
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const board = dashboards.find((d) => path === `/d/${d.id}`) ?? dashboards[0]!;

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
              {n.label}
            </Link>
          ))}
        </nav>
        <span className="badge" title="Built on the Gold proof of concept: small real samples">
          PoC data
        </span>
      </header>
      <main>
        {path.startsWith("/explore") ? (
          <Explorer />
        ) : path.startsWith("/catalogue") ? (
          <Catalogue />
        ) : (
          <Dashboard key={board.id} dashboard={board} />
        )}
      </main>
      <footer className="footer">
        Data: Eurostat, GUS, World Bank, NBP via <a href="https://github.com/zohelo/zohelo-data">zohelo-data</a>.
      </footer>
    </>
  );
}
