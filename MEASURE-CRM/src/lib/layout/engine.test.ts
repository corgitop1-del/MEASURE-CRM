import { describe, it, expect } from "vitest";
import { layoutFloor, summarize, type LayoutParams } from "./engine";

const base: LayoutParams = { W: 5000, L: 3000, pl: 1200, pw: 190, g: 0, k: 3, mn: 300, st: 200, off: 0.5, lock: true };

describe("розкладка планок", () => {
  it("кімната 3×5 м: чиста площа 15 м²", () => {
    const s = summarize(base, layoutFloor(base), 8, 1800, 250);
    expect(s.netArea).toBeCloseTo(15, 6);
  });
  it("немає прогалин і перекриттів: сума площ елементів = площа підлоги", () => {
    const R = layoutFloor(base);
    const sum = R.pcs.reduce((s, p) => s + p.w * p.h, 0);
    expect(sum).toBeCloseTo(base.W * base.L, 3);
  });
  it("кожен елемент — окремий об'єкт з унікальним id", () => {
    const R = layoutFloor(base);
    expect(new Set(R.pcs.map((p) => p.id)).size).toBe(R.pcs.length);
  });
  it("залишки повторно використовуються", () => {
    expect(layoutFloor(base).pcs.some((p) => p.reused)).toBe(true);
  });
  it("один обрізок не використовується двічі (з заготовки ≤ 2 елементи)", () => {
    const R = layoutFloor(base);
    const cnt = new Map<number, number>();
    R.pcs.forEach((p) => cnt.set(p.src, (cnt.get(p.src) ?? 0) + 1));
    expect(Math.max(...cnt.values())).toBeLessThanOrEqual(2);
  });
  it("залишки з неправильним замком відхиляються", () => {
    expect(layoutFloor(base).rej).toBeGreaterThan(0);
  });
  it("залишок не коротший за мінімальну довжину", () => {
    const R = layoutFloor(base);
    R.pcs.filter((p) => p.reused).forEach((p) => expect(p.w).toBeGreaterThanOrEqual(base.mn - 0.5));
  });
  it("більша ширина різу не зменшує кількість заготовок", () => {
    const a = layoutFloor({ ...base, k: 0 }).blanks;
    const b = layoutFloor({ ...base, k: 40 }).blanks;
    expect(b).toBeGreaterThanOrEqual(a);
  });
  it("округлення пачок угору", () => {
    const R = layoutFloor(base);
    const s = summarize(base, R, 8, 1800, 250);
    expect(s.packs).toBe(Math.ceil(R.blanks / 8));
    expect(s.purchasedArea).toBeGreaterThanOrEqual(s.netArea);
  });
  it("зміна розміру кімнати перераховує результат", () => {
    const a = layoutFloor(base).blanks;
    const b = layoutFloor({ ...base, W: 7000 }).blanks;
    expect(b).toBeGreaterThan(a);
  });
});

describe("плитка", () => {
  const t: LayoutParams = { W: 3000, L: 3000, pl: 600, pw: 600, g: 0, k: 3, mn: 100, st: 0, off: 0.5, lock: false };
  it("без прогалин, зсув 1/2 дає підрізки", () => {
    const R = layoutFloor(t);
    expect(R.pcs.reduce((s, p) => s + p.w * p.h, 0)).toBeCloseTo(9e6, 3);
    expect(R.pcs.some((p) => p.cut)).toBe(true);
  });
});
