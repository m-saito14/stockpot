import type { EffortMode, StorageType } from "@stockpot/shared";
import type {
  GenerateRecipesParams,
  InventorySnapshotItem,
} from "../domain/recipe-generator.js";

/**
 * LLM 入力プロンプトの組み立て（設計書 §15.1〜§15.3）。純粋関数。
 * 条件分岐で調理法を書かない。storageType を渡せば LLM が自然に処理する（§15.3）。
 */

const STORAGE_LABEL: Record<StorageType, string> = {
  FREEZER: "冷凍",
  FRIDGE: "冷蔵",
  PANTRY: "常温",
};

const MEAL_LABEL = { BREAKFAST: "朝食", LUNCH: "昼食", DINNER: "夕食" } as const;

/** §15.2: 抽象的な形容詞を具体的な制約に翻訳する。 */
const EFFORT_CONSTRAINT: Record<EffortMode, string> = {
  EASY: "お手軽（調理時間 20 分以内 / 工程 3 つまで / 特殊な調理器具を使わない / 洗い物を少なく）",
  ELABORATE:
    "本格（調理時間の制約なし / 下ごしらえや漬け込みを含めてよい / 複数の調理法を組み合わせてよい）",
};

function formatItem(item: InventorySnapshotItem, today: Date): string {
  const parts = [`[${item.id}] ${item.name} ${item.quantity}${item.unit}`];
  if (item.expiryDate && item.expiryType) {
    const label = item.expiryType === "CONSUME_BY" ? "消費期限" : "賞味期限";
    const iso = item.expiryDate.toISOString().slice(0, 10);
    let line = `（${label}: ${iso}）`;
    const days = Math.floor(
      (item.expiryDate.getTime() - today.getTime()) / 86_400_000,
    );
    if (days <= 3) line += " ★期限間近";
    parts.push(line);
  }
  return `  - ${parts.join("")}`;
}

/** 在庫を保存場所（冷凍→冷蔵→常温）でグルーピングして整形する。 */
export function buildInventorySection(
  items: InventorySnapshotItem[],
  today: Date,
): string {
  const order: StorageType[] = ["FREEZER", "FRIDGE", "PANTRY"];
  const lines: string[] = ["【在庫】"];
  for (const storage of order) {
    const group = items.filter((it) => it.storageType === storage);
    if (group.length === 0) continue;
    lines.push(`■ ${STORAGE_LABEL[storage]}`);
    for (const it of group) lines.push(formatItem(it, today));
  }
  return lines.join("\n");
}

export function buildPrompt(params: GenerateRecipesParams, today: Date): string {
  const inventory = buildInventorySection(params.items, today);
  return [
    inventory,
    "",
    "【条件】",
    `食事: ${MEAL_LABEL[params.mealType]}`,
    `モード: ${EFFORT_CONSTRAINT[params.effortMode]}`,
    "",
    "【指示】",
    "- 上記の在庫だけで作れるレシピを 3 件提案してください",
    "- 期限が近い食材を優先的に使ってください",
    "- 冷凍食材を使う場合は解凍工程を明記してください",
    "- 各手順に調理方法（method）を割り当ててください",
    "- 使用した在庫の ID を sourceItemId に必ず記載してください",
    "- 分量が数値で確定できる場合は deductQuantity / deductUnit を埋め、",
    "  「適量」「少々」の場合は null にしてください",
  ].join("\n");
}
