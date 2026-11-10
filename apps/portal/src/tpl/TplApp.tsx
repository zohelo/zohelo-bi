// Root of the template portal (zohelo design template): app shell + route → page.

import { useState, type ReactNode } from "react";
import { useLang } from "../lang";
import { useLocation } from "../router";
import { useData } from "../components/useData";
import { data } from "../data";
import { AppShell, type Crumb } from "./shell/AppShell";
import { PageContext } from "./context";
import { tplPageFor } from "./routes";
import { HomePage } from "./pages/Home";
import { DomainPage } from "./pages/Domain";
import { DashboardsPage } from "./pages/Dashboards";
import { ExplorePage } from "./pages/Explore";
import { CataloguePage } from "./pages/Catalogue";
import { CollectionsPage } from "./pages/Collection";
import { AnalysisPage } from "./pages/Analysis";
import { IndicatorPage } from "./pages/Indicator";
import { GuidePage } from "./guide/Guide";
import { NotFoundPage } from "./pages/NotFound";

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
    case "guide":
      body = <GuidePage key={page.section ?? ""} section={page.section} />;
      break;
    default:
      body = <NotFoundPage />;
  }

  return (
    <PageContext.Provider value={{ lang, catalog: catalog.data, url, setMeta }}>
      <AppShell lang={lang} setLang={setLang} catalog={catalog.data} path={path} crumbs={meta.crumbs}>
        {catalog.error ? <p role="alert">{catalog.error}</p> : body}
      </AppShell>
    </PageContext.Provider>
  );
}
