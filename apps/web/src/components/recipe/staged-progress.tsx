"use client";

import { useEffect, useState } from "react";

/**
 * 生成中の段階表示アニメーション（設計書 §13.2）。
 * 実進捗とは非連動。体感速度を UI で稼ぐためのもの。
 */
const STAGES = ["材料を確認しています", "レシピを考えています", "手順をまとめています"];

export function StagedProgress() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="py-4 text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
      <p className="font-medium text-slate-700">{STAGES[stage]}…</p>
      <div className="mt-4 space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
