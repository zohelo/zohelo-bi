// Small shared actions of the explorer, catalogue and indicator pages: copy the link or a text with
// spoken confirmation (the button's label changes and a polite live region repeats it).

import { useEffect, useState } from "react";
import type { Lang } from "../../i18n";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function CopyButton({
  text,
  label,
  done,
  lang,
  className = "zt-btn",
}: {
  /** Text to copy; default: the current URL. */
  text?: () => string;
  label: string;
  done?: string;
  lang: Lang;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(t);
  }, [state]);
  const pl = lang === "pl";
  const shown =
    state === "ok" ? (done ?? (pl ? "Skopiowano" : "Copied")) : state === "fail" ? (pl ? "Nie udało się skopiować" : "Copy failed") : label;
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => void copyText(text ? text() : window.location.href).then((ok) => setState(ok ? "ok" : "fail"))}
      >
        {shown}
      </button>
      <span className="zt-sr" role="status">
        {state === "idle" ? "" : shown}
      </span>
    </>
  );
}
