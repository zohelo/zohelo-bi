import { useEffect, useRef, useState } from "react";
import embed, { type VisualizationSpec } from "vega-embed";
import { config, type Theme } from "./specs";

// Renders a Vega-Lite spec. The spec is built from the current theme (CSS tokens on :root),
// so charts re-render when the colour scheme changes. onPick reports the clicked datum.

function readTheme(): Theme {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    text: v("--text", "#1b1d1f"),
    muted: v("--muted", "#5f6670"),
    grid: v("--grid", "#e3e5e8"),
    accent: v("--accent", "#2f6fdf"),
    mutedMark: v("--muted-mark", "#c9ced6"),
    palette: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => v(`--series-${i}`, "#888")),
  };
}

function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setTheme(readTheme());
    media.addEventListener("change", update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      media.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);
  return theme;
}

export type ChartProps = {
  build: (theme: Theme) => VisualizationSpec;
  onPick?: (datum: Record<string, unknown>) => void;
  label: string;
};

export function Chart({ build, onPick, label }: ChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    if (!ref.current) return;
    const spec = { ...build(theme), config: config(theme) } as VisualizationSpec;
    let finalize: (() => void) | undefined;
    let cancelled = false;
    embed(ref.current, spec, { actions: false, renderer: "svg" }).then((result) => {
      if (cancelled) return result.finalize();
      finalize = () => result.finalize();
      result.view.addEventListener("click", (_event, item) => {
        const datum = (item as { datum?: Record<string, unknown> } | null | undefined)?.datum;
        if (datum && pick.current) pick.current(datum);
      });
    });
    return () => {
      cancelled = true;
      finalize?.();
    };
  }, [build, theme]);

  return <div className="chart" ref={ref} role="img" aria-label={label} />;
}
