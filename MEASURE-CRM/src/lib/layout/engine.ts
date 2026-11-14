/**
 * Ядро розкладки підлоги. Усі розміри у мм.
 * Кожна дошка/плитка — окремий об'єкт Piece з власним id, заготовкою (src)
 * і ознакою повторного використання залишку.
 * Замок: кінець G (паз) або T (шип). Перший елемент ряду потребує T-залишку,
 * останній — G-залишку; неправильний залишок відхиляється (rej).
 */
export type LayoutParams = {
  W: number; L: number; pl: number; pw: number; g: number; k: number;
  mn: number; st: number; off: number; lock: boolean;
};
export type Piece = {
  id: number; x: number; y: number; w: number; h: number; row: number;
  src: number; reused: boolean; cut: boolean; cutW: boolean; full: boolean;
};
export type Offcut = { len: number; end: "G" | "T" | "-"; src: number };
export type LayoutResult = { pcs: Piece[]; blanks: number; pool: Offcut[]; rej: number; warn: number };
export type Summary = {
  netArea: number; blankArea: number; wasteArea: number; wastePct: number;
  packs: number; purchasedArea: number; materialCost: number; workCost: number; total: number;
  full: number; cut: number; reused: number; gapFree: boolean;
};

const E = 0.5;

export function layoutFloor(P: LayoutParams): LayoutResult {
  const { W, L, pl, pw, g, k, mn, st, off, lock } = P;
  let nb = 0, rej = 0, warn = 0, y = 0, row = 0, id = 0;
  let prev: number[] = [];
  const pool: Offcut[] = [];
  const pcs: Piece[] = [];

  const plan = (f: number): number[] | null => {
    f = Math.min(f, W);
    const a = [f];
    let r = W - f - g;
    while (r > pl + E) { a.push(pl); r -= pl + g; }
    if (r > E) { if (r < mn && lock) return null; a.push(r); }
    return a;
  };
  const joints = (a: number[]) => { let x = 0; return a.slice(0, -1).map((l) => (x += l + g)); };
  const okStagger = (a: number[]) =>
    !lock || joints(a).every((p) => prev.every((q) => Math.abs(p - q) >= st));

  while (y < L - E) {
    const h = Math.min(pw, L - y);
    type Cand = { f: number; e: Offcut | null };
    const cands: Cand[] = [];
    if (lock) {
      for (const e of pool) {
        if (e.end === "T" && e.len >= mn && e.len <= pl) cands.push({ f: e.len, e });
        if (e.end === "G") rej++;
      }
      for (let i = 0; i < 40; i++)
        cands.push({ f: mn + ((row * 173 + i * 97) % Math.max(1, pl - mn)), e: null });
    } else {
      const f = (row * off * pl) % pl || pl;
      cands.push({ f, e: pool.find((e) => e.len >= mn && e.len <= pl && Math.abs(e.len - f) < 1) ?? null });
    }
    let ch: Cand | null = null;
    let lens: number[] | null = null;
    for (const c of cands) {
      const a = plan(c.f);
      if (a && okStagger(a)) { ch = c; lens = a; break; }
    }
    if (!ch || !lens) { ch = cands[cands.length - 1]; lens = plan(ch.f) ?? [W]; warn++; }
    const chosen = ch;

    let x = 0;
    lens.forEach((len, i) => {
      const first = i === 0;
      const last = i === lens.length - 1 && lens.length > 1;
      const full = len >= pl - E;
      let src = 0;
      let reused = false;
      if (first && chosen.e) {
        pool.splice(pool.indexOf(chosen.e), 1);
        src = chosen.e.src; reused = true;
      } else if (!full && last) {
        const c = pool
          .filter((e) => (!lock || e.end === "G") && e.len >= len - E)
          .sort((a, b) => a.len - b.len)[0];
        if (c) { pool.splice(pool.indexOf(c), 1); src = c.src; reused = true; }
      }
      if (!src) {
        src = ++nb;
        if (!full) {
          const rest = pl - len - k;
          if (rest >= mn) pool.push({ len: rest, end: lock ? (first ? "G" : "T") : "-", src });
        }
      }
      pcs.push({ id: ++id, x, y, w: len, h, row: row + 1, src, reused,
        cut: !full || h < pw - E, cutW: h < pw - E, full: full && h >= pw - E });
      x += len + g;
    });
    prev = joints(lens);
    y += h + g; row++;
  }
  return { pcs, blanks: nb, pool, rej, warn };
}

export function summarize(P: LayoutParams, R: LayoutResult, perPack: number, packPrice: number, workPrice: number): Summary {
  const netArea = (P.W * P.L) / 1e6;
  const blankArea = (R.blanks * P.pl * P.pw) / 1e6;
  const used = R.pcs.reduce((s, p) => s + p.w * p.h, 0) / 1e6;
  const wasteArea = blankArea - used;
  const packs = Math.ceil(R.blanks / perPack);
  const materialCost = packs * packPrice;
  const workCost = netArea * workPrice;
  return {
    netArea, blankArea, wasteArea, wastePct: blankArea ? (wasteArea / blankArea) * 100 : 0,
    packs, purchasedArea: (packs * perPack * P.pl * P.pw) / 1e6, materialCost, workCost,
    total: materialCost + workCost,
    full: R.pcs.filter((p) => p.full && !p.reused).length,
    cut: R.pcs.filter((p) => p.cut && !p.reused).length,
    reused: R.pcs.filter((p) => p.reused).length,
    gapFree: P.g === 0 ? Math.abs(used - netArea) < 1e-6 : true,
  };
}
