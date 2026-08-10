"use client";

import type { EffortMode } from "@stockpot/shared";
import { useEffect, useState } from "react";

const KEY = "stockpot:effortMode";

/**
 * お手軽 / 本格モードの選択状態（設計書 §13.1）。
 * localStorage に保持し DB には持たない。
 */
export function useEffortMode(): [EffortMode, (m: EffortMode) => void] {
  const [mode, setMode] = useState<EffortMode>("EASY");

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "EASY" || saved === "ELABORATE") setMode(saved);
  }, []);

  const update = (m: EffortMode) => {
    setMode(m);
    window.localStorage.setItem(KEY, m);
  };

  return [mode, update];
}
