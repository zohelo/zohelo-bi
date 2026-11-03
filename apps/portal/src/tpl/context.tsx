// Page context of the template portal: language, catalogue, and the page's breadcrumb and top-bar actions.

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Lang } from "../i18n";
import type { Catalog } from "../data";
import type { Crumb } from "./shell/AppShell";

export type PageCtx = {
  lang: Lang;
  catalog: Catalog | undefined;
  url: URL;
  setMeta: (meta: { crumbs: Crumb[]; actions?: ReactNode; title: string }) => void;
};

export const PageContext = createContext<PageCtx | null>(null);

export function usePage(): PageCtx {
  const c = useContext(PageContext);
  if (!c) throw new Error("usePage outside the template app");
  return c;
}

/** Declare the page's breadcrumb, top-bar actions and document title. */
export function useMeta(title: string, crumbs: Crumb[], actions?: ReactNode, deps: unknown[] = []) {
  const { setMeta } = usePage();
  useEffect(() => {
    setMeta({ title, crumbs, actions });
    document.title = `${title} · zohelo bi`;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- crumbs/actions are rebuilt each render; deps say when
  }, [title, ...deps]);
}
