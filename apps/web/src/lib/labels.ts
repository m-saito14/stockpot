import type {
  CookMethod,
  EffortMode,
  ExpiryStatus,
  MealType,
  StorageType,
  Unit,
} from "@stockpot/shared";

/** 表示用の日本語ラベル・アイコン（設計書 §13）。 */

export const STORAGE_LABEL: Record<StorageType, string> = {
  PANTRY: "常温",
  FRIDGE: "冷蔵",
  FREEZER: "冷凍",
};

export const STORAGE_ORDER: StorageType[] = ["PANTRY", "FRIDGE", "FREEZER"];

export const UNIT_LABEL: Record<Unit, string> = {
  PIECE: "個",
  GRAM: "g",
  MILLILITER: "ml",
  PACK: "パック",
  BUNCH: "束",
};

export const MEAL_LABEL: Record<MealType, string> = {
  BREAKFAST: "朝食",
  LUNCH: "昼食",
  DINNER: "夕食",
};

export const MEAL_ORDER: MealType[] = ["BREAKFAST", "LUNCH", "DINNER"];

export const EFFORT_LABEL: Record<EffortMode, string> = {
  EASY: "お手軽",
  ELABORATE: "本格",
};

/** 手順の調理方法アイコン（設計書 §13.4）。 */
export const METHOD_ICON: Record<CookMethod, string> = {
  PREP: "🔪",
  STOVE: "🔥",
  MICROWAVE: "⚡️",
  OVEN: "🔆",
  TOASTER: "🍞",
  THAW: "❄️",
  NONE: "・",
};

export const METHOD_LABEL: Record<CookMethod, string> = {
  PREP: "下ごしらえ",
  STOVE: "コンロ",
  MICROWAVE: "レンジ",
  OVEN: "オーブン",
  TOASTER: "トースター",
  THAW: "解凍",
  NONE: "",
};

/** 期限バッジの見た目（設計書 §13.1）。getExpiryStatus の戻り値に対応。 */
export const EXPIRY_BADGE: Record<
  ExpiryStatus,
  { dot: string; text: string; className: string } | null
> = {
  EXPIRED: {
    dot: "🔴",
    text: "期限切れ",
    className: "bg-danger-soft text-danger font-semibold",
  },
  URGENT: { dot: "🔴", text: "期限間近", className: "bg-danger-soft text-danger" },
  WARNING: { dot: "🟡", text: "期限間近", className: "bg-warning-soft text-warning" },
  NORMAL: { dot: "⚪", text: "", className: "text-slate-400" },
  NONE: null,
};
