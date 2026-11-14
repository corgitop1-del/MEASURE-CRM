"use client";
import { useMemo, useState } from "react";
import { layoutFloor, summarize, type LayoutParams } from "@/lib/layout/engine";

const FIELDS: [string, string][] = [
  ["W", "Довжина кімнати, мм"], ["L", "Ширина кімнати, мм"], ["pl", "Довжина елемента, мм"],
  ["pw", "Ширина елемента, мм"], ["g", "Шов, мм"], ["k", "Ширина різу, мм"],
  ["mn", "Мін. довжина відрізка, мм"], ["st", "Мін. зсув стиків, мм"], ["off", "Зсув ряду (плитка)"],
  ["pp", "Елементів у пачці"], ["pr", "Ціна пачки, грн"], ["wk", "Монтаж, грн/м²"],
];

export default function Page() {
  const [v, setV] = useState<Record<string, number>>({ W: 5000, L: 3000, pl: 1200, pw: 190, g: 0, k: 3, mn: 300, st: 200, off: 0.5, pp: 8, pr: 1800, wk: 250 });
  const [lock, setLock] = useState(true);
  const [sel, setSel] = useState<number | null>(null);
  const P: LayoutParams = { W: v.W, L: v.L, pl: v.pl, pw: v.pw, g: v.g, k: v.k, mn: v.mn, st: v.st, off: v.off, lock };
  const R = useMemo(() => layoutFloor(P), [v, lock]); // eslint-disable-line react-hooks/exhaustive-deps
  const S = summarize(P, R, v.pp, v.pr, v.wk);
  const p = sel ? R.pcs[sel - 1] : null;
  const stats: [string, string][] = [
    ["Чиста площа", `${S.netArea.toFixed(2)} м²`], ["Елементів", String(R.pcs.length)],
    ["Цілих", String(S.full)], ["Підрізаних", String(S.cut)], ["Із залишків", String(S.reused)],
    ["Заготовок", String(R.blanks)], ["Відхилено залишків (замок)", String(R.rej)],
    ["Відходи", `${S.wasteArea.toFixed(2)} м² (${S.wastePct.toFixed(1)}%)`],
    ["Пачок", String(S.packs)], ["Разом", `${Math.round(S.total).toLocaleString("uk")} грн`],
    ["Перевірка площі", S.gapFree ? "✓" : "✗"],
  ];
  return (
    <main style={{ padding: 12 }}>
      <h1 style={{ fontSize: 18 }}><span style={{ background: "#FFD400", color: "#0A0A0A", padding: "2px 6px", borderRadius: 4 }}>STRUCTURA</span> MEASURE</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
        <label style={{ fontSize: 11 }}>Матеріал
          <select value={lock ? "p" : "t"} onChange={(e) => setLock(e.target.value === "p")} style={{ width: "100%", padding: 6 }}>
            <option value="p">Планки (замок G/T)</option><option value="t">Плитка</option>
          </select>
        </label>
        {FIELDS.map(([k, l]) => (
          <label key={k} style={{ fontSize: 11 }}>{l}
            <input type="number" step="any" value={v[k]} onChange={(e) => setV({ ...v, [k]: +e.target.value })} style={{ width: "100%", padding: 6, boxSizing: "border-box" }} />
          </label>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8, margin: "12px 0" }}>
        {stats.map(([a, b]) => <div key={a} style={{ borderLeft: "3px solid #FFD400", paddingLeft: 8 }}><div style={{ fontSize: 11, color: "#9a9a9a" }}>{a}</div><b>{b}</b></div>)}
      </div>
      <svg viewBox={`-20 -20 ${P.W + 40} ${P.L + 40}`} style={{ width: "100%", maxHeight: "60vh", background: "#151515" }}>
        {R.pcs.map((q) => (
          <rect key={q.id} x={q.x} y={q.y} width={q.w} height={q.h} onClick={() => setSel(q.id)}
            fill={q.reused ? "#2e9e5b" : q.cut ? "#FFD400" : "#2b2b2b"} fillOpacity={q.cut || q.reused ? 0.85 : 1}
            stroke={sel === q.id ? "#e33" : "#555"} strokeWidth={sel === q.id ? 3 : 1} vectorEffect="non-scaling-stroke" style={{ cursor: "pointer" }} />
        ))}
      </svg>
      <p>{p ? `Елемент №${p.id}, ряд ${p.row}. Заготовка №${p.src}. ${Math.round(p.w)}×${Math.round(p.h)} мм. ${p.reused ? "Використано залишок після різання заготовки №" + p.src + "." : p.cut ? "Підрізаний." : "Цілий."}` : "Натисніть на елемент."}</p>
    </main>
  );
}
