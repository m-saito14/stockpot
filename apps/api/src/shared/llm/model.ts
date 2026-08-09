import type { LanguageModel } from "ai";
import type { RecipeGenerator } from "../../features/recipe/domain/recipe-generator.js";
import { AiSdkRecipeGenerator } from "../../features/recipe/infrastructure/ai-sdk-generator.js";
import { StubRecipeGenerator } from "../../features/recipe/infrastructure/stub-generator.js";

/**
 * RecipeGenerator の合成（設計書 §6 / §18.4）。
 *
 * provider 非依存。`model` の 1 行差し替えで Gemini / Claude / GPT を比較できる。
 * `USE_STUB_LLM=true` なら API キーなしでスタブ生成に切り替える。
 */
export function createRecipeGenerator(): RecipeGenerator {
  if (process.env.USE_STUB_LLM === "true") {
    return new StubRecipeGenerator();
  }

  // provider を差し替える箇所。ここだけを変えればモデルを比較できる。
  // 例: import { google } from "@ai-sdk/google"; const model = google("gemini-2.0-flash");
  const model = resolveModel();
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? "90000");
  return new AiSdkRecipeGenerator(model, { timeoutMs });
}

/**
 * 実際の provider SDK（@ai-sdk/google 等）は Phase 1 の比較検討で確定させる。
 * 未設定のまま非スタブで起動した場合は明示的に失敗させる。
 */
function resolveModel(): LanguageModel {
  throw new Error(
    "LLM モデルが未設定です。shared/llm/model.ts の resolveModel を実装するか、USE_STUB_LLM=true で起動してください。",
  );
}
