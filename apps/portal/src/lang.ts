import { useEffect, useState } from "react";
import { parseLang, type Lang } from "./i18n";
import { browserStorage } from "./savedViews";

// The portal's one current language: ?lang= first, then the viewer's last choice in storage,
// then the browser language (pl* gives pl), else en. Storage may be missing or throw.

export const LANG_KEY = "zohelo-bi.lang.v1";

function stored(store: Pick<Storage, "getItem"> | null): Lang | null {
  try {
    return parseLang(store?.getItem(LANG_KEY));
  } catch {
    return null;
  }
}

export function resolveLang(search: URLSearchParams, store: Pick<Storage, "getItem"> | null, navigatorLanguage: string | undefined): Lang {
  return parseLang(search.get("lang")) ?? stored(store) ?? (navigatorLanguage?.toLowerCase().startsWith("pl") ? "pl" : "en");
}

export function saveLang(store: Pick<Storage, "setItem"> | null, lang: Lang): void {
  try {
    store?.setItem(LANG_KEY, lang);
  } catch {
    // Storage blocked or full: the choice lasts for this page view only.
  }
}

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>(() =>
    resolveLang(new URL(window.location.href).searchParams, browserStorage(), navigator.language),
  );
  useEffect(() => {
    document.documentElement.lang = lang;
    // Only on mount; the setter keeps <html lang> in step afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setLang = (l: Lang) => {
    saveLang(browserStorage(), l);
    document.documentElement.lang = l;
    setLangState(l);
  };
  return [lang, setLang];
}
