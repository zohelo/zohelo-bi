// Stylised glyphs of the looks (the wardrobe strip, LookBar.tsx): a 44 × 28 sketch of what a look does, drawn from
// the palette tokens only, so the reader recognises an outfit before trying it on. Decorative: aria-hidden.

import type { Glyph } from "./looks";

const S1 = "var(--series-1)";
const S2 = "var(--series-2)";
const S3 = "var(--series-3)";
const CTX = "var(--series-context)";
const BAND = "var(--band)";
const NEG = "var(--div-negative)";
const GOOD = "var(--change-good-fg)";
const BAD = "var(--change-bad-fg)";
const INK = "var(--ink)";
const GRID = "var(--line)";

const LINES = [
  "M3 20 L13 14 L22 17 L31 9 L41 11",
  "M3 16 L13 19 L22 12 L31 15 L41 7",
  "M3 11 L13 13 L22 20 L31 18 L41 19",
  "M3 23 L13 21 L22 22 L31 13 L41 15",
];
const SMOOTH = ["M3 20 C10 12, 16 20, 22 15 S34 6, 41 11", "M3 15 C10 20, 16 10, 22 14 S34 18, 41 8"];
const STEP = "M3 20 H12 V15 H21 V17 H30 V9 H41";

function Lines({ g }: { g: Extract<Glyph, { k: "lines" }> }) {
  const n = g.n ?? 3;
  const paths = g.smooth ? SMOOTH : g.step ? [STEP] : LINES;
  const items = paths.slice(0, Math.max(1, g.ctx || g.extremes ? 4 : n));
  const colour = (i: number) => {
    if (g.extremes) return i === 0 ? S1 : i === 1 ? S2 : CTX;
    if (g.hero) return i === 0 ? S1 : CTX;
    return [S1, S2, S3, CTX][i] ?? CTX;
  };
  return (
    <>
      {g.band ? <path d="M3 10 L13 12 L22 10 L31 6 L41 8 L41 20 L31 17 L22 22 L13 21 L3 23 Z" fill={BAND} /> : null}
      {g.fill ? <path d={`${items[0]} L41 26 L3 26 Z`} fill={S1} opacity={0.18} /> : null}
      {g.index
        ? ["M3 18 L41 6", "M3 18 L41 14", "M3 18 L41 22"].map((d, i) => (
            <path key={d} d={d} stroke={[S1, S2, S3][i]} strokeWidth={1.6} fill="none" />
          ))
        : [...items].reverse().map((d, j) => {
            const i = items.length - 1 - j;
            return (
              <path
                key={d}
                d={d}
                stroke={colour(i)}
                strokeWidth={i === 0 && (g.hero || g.extremes || g.n === 1) ? 2.2 : 1.4}
                fill="none"
                strokeLinejoin="round"
              />
            );
          })}
      {g.trend ? <path d="M3 19 L41 9" stroke={INK} strokeWidth={1} strokeDasharray="3 2" /> : null}
      {g.markers ? [3, 13, 22, 31, 41].map((x, i) => <circle key={x} cx={x} cy={[20, 14, 17, 9, 11][i]} r={1.8} fill={S1} />) : null}
      {g.labels ? (
        <>
          <rect x={33} y={4} width={8} height={3} rx={1} fill={INK} />
          <rect x={16} y={22} width={6} height={3} rx={1} fill={INK} />
        </>
      ) : null}
    </>
  );
}

function Panels({ ctx }: { ctx?: boolean }) {
  const cells = [
    [2, 2],
    [23, 2],
    [2, 15],
    [23, 15],
  ];
  return (
    <>
      {cells.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect width={19} height={11} rx={1.5} fill="var(--surface-sunken)" />
          {ctx ? <path d="M2 8 L7 5 L12 7 L17 3" stroke={CTX} strokeWidth={1} fill="none" /> : null}
          <path
            d={["M2 8 L7 4 L12 6 L17 2", "M2 4 L7 7 L12 5 L17 8", "M2 6 L7 3 L12 8 L17 5", "M2 9 L7 8 L12 4 L17 3"][i]}
            stroke={S1}
            strokeWidth={1.4}
            fill="none"
          />
        </g>
      ))}
    </>
  );
}

function Cols({ g }: { g: Extract<Glyph, { k: "cols" }> }) {
  const xs = [4, 12, 20, 28, 36];
  const hs = g.sorted ? [20, 16, 12, 9, 6] : [10, 16, 12, 20, 14];
  if (g.ibcs || g.variance) {
    return (
      <>
        <line x1={2} y1={25.5} x2={42} y2={25.5} stroke={INK} strokeWidth={1} />
        {xs.map((x, i) => {
          const py = [10, 13, 11, 15, 12][i]!;
          const ac = [12, 11, 14, 17, 10][i]!;
          const up = ac >= py;
          return g.ibcs ? (
            <g key={x}>
              <rect x={x - 1} y={25 - py} width={3} height={py} fill={CTX} />
              <rect x={x + 1.5} y={25 - ac} width={3} height={ac} fill={S1} />
              <rect x={x} y={up ? 4 : 6} width={3} height={2} fill={up ? GOOD : BAD} />
            </g>
          ) : (
            <g key={x}>
              <rect x={x} y={25 - Math.min(ac, py)} width={5} height={Math.min(ac, py)} fill={S1} />
              <rect x={x} y={25 - Math.max(ac, py)} width={5} height={Math.abs(ac - py)} fill={up ? GOOD : BAD} opacity={up ? 1 : 0.9} />
            </g>
          );
        })}
      </>
    );
  }
  if (g.stack) {
    const parts =
      g.stack === "percent"
        ? [
            [8, 7, 6],
            [9, 6, 6],
            [6, 8, 7],
            [7, 7, 7],
            [10, 5, 6],
          ]
        : [
            [6, 5, 3],
            [8, 6, 4],
            [5, 4, 3],
            [9, 7, 4],
            [7, 5, 3],
          ];
    if (g.stack === "clustered")
      return (
        <>
          {xs.map((x, i) => (
            <g key={x}>
              <rect x={x - 1} y={25 - hs[i]!} width={3} height={hs[i]} fill={S1} />
              <rect x={x + 2.5} y={25 - hs[(i + 2) % 5]! * 0.8} width={3} height={hs[(i + 2) % 5]! * 0.8} fill={S2} />
            </g>
          ))}
          <line x1={2} y1={25.5} x2={42} y2={25.5} stroke={GRID} strokeWidth={1} />
        </>
      );
    return (
      <>
        {xs.map((x, i) => {
          let y = 25;
          return parts[i]!.map((h, j) => {
            y -= h;
            return <rect key={j} x={x} y={y} width={5} height={h - 0.6} fill={[S1, S2, S3][j]} />;
          });
        })}
        <line x1={2} y1={25.5} x2={42} y2={25.5} stroke={GRID} strokeWidth={1} />
      </>
    );
  }
  return (
    <>
      {xs.map((x, i) => {
        const last = i === xs.length - 1;
        const fill = g.other && last ? CTX : g.hero === "last" ? (last ? S1 : CTX) : g.hero === "pl" ? (i === 1 ? S1 : CTX) : S1;
        return (
          <g key={x}>
            <rect x={x} y={25 - hs[i]!} width={5} height={hs[i]} fill={fill} rx={0.5} />
            {g.labels ? <rect x={x + 0.5} y={21 - hs[i]!} width={4} height={1.6} rx={0.5} fill={INK} /> : null}
          </g>
        );
      })}
      <line x1={2} y1={25.5} x2={42} y2={25.5} stroke={GRID} strokeWidth={1} />
    </>
  );
}

function Bars({ g }: { g: Extract<Glyph, { k: "bars" }> }) {
  const ys = [3, 9, 15, 21];
  const ws = [34, 26, 18, 10];
  if (g.diverging)
    return (
      <>
        <line x1={22} y1={1} x2={22} y2={27} stroke={INK} strokeWidth={1} />
        {ys.map((y, i) => {
          const w = [14, 8, -6, -12][i]!;
          return <rect key={y} x={w > 0 ? 22 : 22 + w} y={y} width={Math.abs(w)} height={4.5} fill={w > 0 ? S1 : NEG} />;
        })}
      </>
    );
  if (g.ibcs || g.variance)
    return (
      <>
        <line x1={6} y1={1} x2={6} y2={27} stroke={INK} strokeWidth={1} />
        {ys.map((y, i) => {
          const py = [22, 16, 14, 8][i]!;
          const ac = [26, 14, 17, 7][i]!;
          const up = ac >= py;
          return g.ibcs ? (
            <g key={y}>
              <rect x={6} y={y} width={py} height={2.5} fill={CTX} />
              <rect x={6} y={y + 2} width={ac} height={2.5} fill={S1} />
              <rect x={36} y={y + 1} width={up ? 5 : 3} height={2.5} fill={up ? GOOD : BAD} />
            </g>
          ) : (
            <g key={y}>
              <rect x={6} y={y} width={Math.min(ac, py)} height={4.5} fill={S1} />
              <rect x={6 + Math.min(ac, py)} y={y} width={Math.abs(ac - py)} height={4.5} fill={up ? GOOD : BAD} />
            </g>
          );
        })}
      </>
    );
  if (g.stack) {
    const parts =
      g.stack === "percent"
        ? [
            [14, 12, 10],
            [16, 10, 10],
            [10, 14, 12],
            [12, 12, 12],
          ]
        : [
            [14, 10, 6],
            [12, 8, 4],
            [8, 6, 4],
            [6, 3, 2],
          ];
    if (g.stack === "clustered")
      return (
        <>
          {ys.map((y, i) => (
            <g key={y}>
              <rect x={6} y={y} width={ws[i]} height={2.4} fill={S1} />
              <rect x={6} y={y + 3} width={ws[(i + 1) % 4]! * 0.7} height={2.4} fill={S2} />
            </g>
          ))}
        </>
      );
    return (
      <>
        {ys.map((y, i) => {
          let x = 6;
          return parts[i]!.map((w, j) => {
            const r = <rect key={j} x={x} y={y} width={w - 0.6} height={4.5} fill={[S1, S2, S3][j]} />;
            x += w;
            return r;
          });
        })}
      </>
    );
  }
  return (
    <>
      {ys.map((y, i) => (
        <rect
          key={y}
          x={6}
          y={y}
          width={ws[i]}
          height={4.5}
          fill={g.other && i === 3 ? CTX : g.hero ? (i === 1 ? S1 : CTX) : S1}
          rx={0.5}
        />
      ))}
      {g.benchmark ? <line x1={24} y1={1} x2={24} y2={27} stroke={CTX} strokeWidth={1} strokeDasharray="2 2" /> : null}
    </>
  );
}

function Area({ g }: { g: Extract<Glyph, { k: "area" }> }) {
  if (g.stack) {
    const pct = g.stack === "percent";
    return (
      <>
        <path d={pct ? "M3 3 H41 V26 H3 Z" : "M3 12 L13 9 L22 11 L31 6 L41 8 V26 H3 Z"} fill={S3} />
        <path d={pct ? "M3 10 L13 12 L22 9 L31 12 L41 10 V26 H3 Z" : "M3 17 L13 15 L22 16 L31 13 L41 14 V26 H3 Z"} fill={S2} />
        <path d={pct ? "M3 18 L13 17 L22 19 L31 16 L41 18 V26 H3 Z" : "M3 21 L13 20 L22 21 L31 18 L41 19 V26 H3 Z"} fill={S1} />
      </>
    );
  }
  if (g.surplus)
    return (
      <>
        <path d="M3 14 L10 8 L18 11 L24 14 L30 19 L36 17 L41 14 Z" fill={S1} opacity={0.6} />
        <path d="M3 14 L10 8 L18 11 L24 14 L30 19 L36 17 L41 14" stroke={INK} strokeWidth={1.2} fill="none" />
        <path d="M24 14 L30 19 L36 17 L41 14 Z" fill={NEG} opacity={0.8} />
        <line x1={3} y1={14} x2={41} y2={14} stroke={INK} strokeWidth={0.8} />
      </>
    );
  if (g.band)
    return (
      <>
        <path d="M3 9 L13 11 L22 8 L31 5 L41 7 L41 20 L31 17 L22 21 L13 20 L3 22 Z" fill={BAND} />
        <path d={LINES[0]} stroke={S1} strokeWidth={2.2} fill="none" />
      </>
    );
  if (g.index)
    return (
      <>
        <path d="M3 18 L41 6 V26 H3 Z" fill={S1} opacity={0.2} />
        <path d="M3 18 L41 14 V26 H3 Z" fill={S2} opacity={0.2} />
        <path d="M3 18 L41 6" stroke={S1} strokeWidth={1.6} />
        <path d="M3 18 L41 14" stroke={S2} strokeWidth={1.6} />
      </>
    );
  const line = g.smooth ? SMOOTH[0]! : LINES[0]!;
  return (
    <>
      {g.hero ? <path d={LINES[1]} stroke={CTX} strokeWidth={1.2} fill="none" /> : null}
      <path d={`${line} L41 26 L3 26 Z`} fill={S1} opacity={g.strong ? 0.4 : 0.18} />
      <path d={line} stroke={S1} strokeWidth={2} fill="none" />
    </>
  );
}

function Combo({ g }: { g: Extract<Glyph, { k: "combo" }> }) {
  const xs = [4, 12, 20, 28, 36];
  const hs = [10, 16, 12, 20, 14];
  return (
    <>
      {xs.map((x, i) => (
        <rect key={x} x={x} y={25 - hs[i]!} width={5} height={hs[i]} fill={g.ctx ? CTX : S1} />
      ))}
      {g.labels ? xs.map((x, i) => <rect key={x} x={x + 0.5} y={21 - hs[i]!} width={4} height={1.6} rx={0.5} fill={INK} />) : null}
      <path
        d={g.smooth ? "M4 16 C12 8, 20 14, 28 9 S36 4, 40 6" : "M6 16 L14 11 L22 13 L30 7 L38 9"}
        stroke={g.ctx ? S2 : INK}
        strokeWidth={1.8}
        fill="none"
      />
      {!g.smooth
        ? [6, 14, 22, 30, 38].map((x, i) => <circle key={x} cx={x} cy={[16, 11, 13, 7, 9][i]} r={1.6} fill={g.ctx ? S2 : INK} />)
        : null}
    </>
  );
}

export function LookGlyph({ glyph }: { glyph: Glyph }) {
  return (
    <svg className="x3-glyph" viewBox="0 0 44 28" width={44} height={28} aria-hidden="true" focusable="false">
      {glyph.k === "blank" ? (
        <rect x={3} y={3} width={38} height={22} rx={2} fill="none" stroke={CTX} strokeWidth={1} strokeDasharray="3 2" />
      ) : null}
      {glyph.k === "lines" ? <Lines g={glyph} /> : null}
      {glyph.k === "panels" ? <Panels ctx={glyph.ctx} /> : null}
      {glyph.k === "seasonal" ? (
        <>
          <path d="M3 18 Q22 2 41 18 L41 22 Q22 10 3 22 Z" fill={BAND} />
          <path d="M3 20 Q22 6 41 20" stroke={CTX} strokeWidth={1} fill="none" />
          <path d="M3 21 Q22 12 41 21" stroke={CTX} strokeWidth={1} fill="none" />
          <path d="M3 19 Q22 4 41 17" stroke={S1} strokeWidth={2.2} fill="none" />
        </>
      ) : null}
      {glyph.k === "cols" ? <Cols g={glyph} /> : null}
      {glyph.k === "bars" ? <Bars g={glyph} /> : null}
      {glyph.k === "bridge" ? (
        <>
          <rect x={3} y={12} width={6} height={13} fill={CTX} />
          <rect x={11} y={8} width={6} height={4} fill={GOOD} />
          <rect x={19} y={8} width={6} height={3} fill={BAD} />
          <rect x={27} y={6} width={6} height={5} fill={GOOD} />
          <rect x={35} y={6} width={6} height={19} fill={S1} />
          <line x1={2} y1={25.5} x2={42} y2={25.5} stroke={INK} strokeWidth={1} />
        </>
      ) : null}
      {glyph.k === "area" ? <Area g={glyph} /> : null}
      {glyph.k === "combo" ? <Combo g={glyph} /> : null}
    </svg>
  );
}
