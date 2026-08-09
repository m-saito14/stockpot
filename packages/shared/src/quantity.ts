import type { Unit } from "./enums.js";

/**
 * ± ボタンの刻み幅（設計書 §13.1）。
 * `unit` ごとに刻みを変える。Web / モバイル両方で使うため純粋関数として
 * `packages/shared` に置く（UI に埋め込まない / 設計書 §18.7）。
 *
 * - PIECE / PACK / BUNCH = ±1
 * - GRAM = ±50
 * - MILLILITER = ±100
 */
export function stepFor(unit: Unit): number {
  switch (unit) {
    case "GRAM":
      return 50;
    case "MILLILITER":
      return 100;
    case "PIECE":
    case "PACK":
    case "BUNCH":
      return 1;
  }
}

/**
 * 数量を 1 ステップ増減した値を返す。0 未満にはしない。
 * `delta` は +1（増加）または -1（減少）を想定。
 */
export function applyStep(quantity: number, unit: Unit, delta: 1 | -1): number {
  const next = quantity + stepFor(unit) * delta;
  return next < 0 ? 0 : next;
}
