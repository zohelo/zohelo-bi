// Page context of the template portal: language, catalogue, and the page's breadcrumb and document title.

import { createContext, useContext, useEffect } from "react";
import type { Lang } from "../i18n";
import type { Catalog } from "../data";
import type { Crumb } from "./shell/AppShell";

export type PageCtx = {
  lang: Lang;
  catalog: Catalog | undefined;
  url: URL;
  setMeta: (meta: { crumbs: Crumb[]; title: string }) => void;
};

export const PageContext = createContext<PageCtx | null>(null);

export function usePage(): PageCtx {
  const c = useContext(PageContext);
  if (!c) throw new Error("usePage outside the template app");
  return c;
}

/** Declare the page's breadcrumb and document title. Page actions (Pobierz dane) live in the page header. */
export function useMeta(title: string, crumbs: Crumb[], deps: unknown[] = []) {
  const { setMeta } = usePage();
  useEffect(() => {
    setMeta({ title, crumbs });
    document.title = `${title} · zohelo bi`;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- crumbs are rebuilt each render; deps say when
  }, [title, ...deps]);
}
