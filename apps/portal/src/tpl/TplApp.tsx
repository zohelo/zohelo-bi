// Root of the template portal (zohelo design template): app shell + route → page.

import { lazy, Suspense, useState, type ReactNode } from "react";
import { useLang } from "../lang";
import { useLocation } from "../router";
import { useData } from "../components/useData";
import { data } from "../data";
import { AppShell, type Crumb } from "./shell/AppShell";
import { PageContext } from "./context";
import { tplPageFor } from "./routes";
import { NotFoundPage } from "./pages/NotFound";

// Route-based code splitting: each page is its own chunk, fetched when its route is first opened, so the first
// load carries only the shell and the page it lands on.
const HomePage = lazy(() => import("./pages/Home").then((m) => ({ default: m.HomePage })));
const DomainPage = lazy(() => import("./pages/Domain").then((m) => ({ default: m.DomainPage })));
const DashboardsPage = lazy(() => import("./pages/Dashboards").then((m) => ({ default: m.DashboardsPage })));
const ExplorePage = lazy(() => import("./pages/Explore").then((m) => ({ default: m.ExplorePage })));
const CataloguePage = lazy(() => import("./pages/Catalogue").then((m) => ({ default: m.CataloguePage })));
const CollectionsPage = lazy(() => import("./pages/Collection").then((m) => ({ default: m.CollectionsPage })));
const AnalysisPage = lazy(() => import("./pages/Analysis").then((m) => ({ default: m.AnalysisPage })));
const IndicatorPage = lazy(() => import("./pages/Indicator").then((m) => ({ default: m.IndicatorPage })));
const TopicPage = lazy(() => import("./pages/Topic").then((m) => ({ default: m.TopicPage })));
const GuidePage = lazy(() => import("./guide/Guide").then((m) => ({ default: m.GuidePage })));

export function TplApp() {
  const url = useLocation();
  const [lang, setLang] = useLang();
  const catalog = useData("catalog", () => data.catalog());
  const [meta, setMeta] = useState<{ crumbs: Crumb[]; title: string }>({ crumbs: [], title: "" });
  const page = tplPageFor(url.pathname);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  let body: ReactNode;
  switch (page.kind) {
    case "overview":
      body = <HomePage />;
      break;
    case "dashboards":
      body = <DashboardsPage />;
      break;
    case "domain":
      body = <DomainPage key={`${page.domain}/${page.page ?? ""}`} domain={page.domain} page={page.page} />;
      break;
    case "explore":
      body = <ExplorePage />;
      break;
    case "catalogue":
      body = <CataloguePage />;
      break;
    case "analysis":
      body = <AnalysisPage />;
      break;
    case "collections":
      body = <CollectionsPage key={page.id ?? ""} id={page.id} />;
      break;
    case "kpi":
      body = <IndicatorPage key={page.key} kpiKey={page.key} />;
      break;
    case "topic":
      body = <TopicPage key={page.key} topicKey={page.key} />;
      break;
    case "guide":
      body = <GuidePage key={page.section ?? ""} section={page.section} />;
      break;
    default:
      body = <NotFoundPage />;
  }

  return (
    <PageContext.Provider value={{ lang, catalog: catalog.data, url, setMeta }}>
      <AppShell lang={lang} setLang={setLang} catalog={catalog.data} path={path} crumbs={meta.crumbs}>
        {catalog.error ? (
          <p role="alert">{catalog.error}</p>
        ) : (
          <Suspense fallback={<div className="t-page-loading" aria-busy="true" />}>{body}</Suspense>
        )}
      </AppShell>
    </PageContext.Provider>
  );
}
