import type { TreeNode } from "@zohelo/semantic";
import { pickName, t, type Lang } from "../i18n";

// The catalogue's left panel: a domain or source tree (domainTree / sourceTree), a toggle between
// them and an 'All KPIs' entry. No page uses it yet; the catalogue page wires it to the URL later.

export type TreeMode = "domain" | "source";

function Nodes({
  nodes,
  selected,
  onSelect,
  lang,
}: {
  nodes: TreeNode[];
  selected?: string;
  onSelect: (key?: string) => void;
  lang: Lang;
}) {
  return (
    <ul className="tree">
      {nodes.map((n) => (
        <li key={n.key}>
          <button
            type="button"
            className="tree-node"
            aria-current={n.key === selected ? "true" : undefined}
            onClick={() => onSelect(n.key)}
          >
            <span>{pickName(lang, n)}</span> <span className="tree-count">{n.count}</span>
          </button>
          {n.children.length > 0 && <Nodes nodes={n.children} selected={selected} onSelect={onSelect} lang={lang} />}
        </li>
      ))}
    </ul>
  );
}

export function TreePanel({
  mode,
  domains,
  sources,
  selected,
  onMode,
  onSelect,
  lang = "en",
}: {
  mode: TreeMode;
  domains: TreeNode[];
  sources: TreeNode[];
  selected?: string;
  onMode: (m: TreeMode) => void;
  onSelect: (key?: string) => void;
  lang?: Lang;
}) {
  const tabs: [TreeMode, string][] = [
    ["domain", t(lang, "tree.byDomain")],
    ["source", t(lang, "tree.bySource")],
  ];
  return (
    <nav className="tree-panel" aria-label={t(lang, "tree.browse")}>
      <div className="metric-tabs" role="tablist">
        {tabs.map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? "selected" : undefined}
            onClick={() => onMode(m)}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="tree-node"
        aria-current={selected === undefined ? "true" : undefined}
        onClick={() => onSelect(undefined)}
      >
        {t(lang, "tree.all")}
      </button>
      <Nodes nodes={mode === "domain" ? domains : sources} selected={selected} onSelect={onSelect} lang={lang} />
    </nav>
  );
}
