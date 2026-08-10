import { RecipeListSchema } from "@stockpot/shared";
import { type LanguageModel, generateObject } from "ai";
import type {
  GenerateRecipesParams,
  RecipeGenerator,
} from "../domain/recipe-generator.js";
import type { NewRecipe } from "../domain/recipe.js";
import { buildPrompt } from "./prompt.js";
import { toDomain } from "./to-domain.js";

/**
 * ★ LLM 境界のアダプタ（設計書 §3 ① / §6）。
 *
 * Vercel AI SDK の `generateObject` に packages/shared の Zod スキーマを渡して
 * 構造化出力を受け取る。provider 非依存なので `model` の差し替えだけで
 * Gemini / Claude / GPT を比較できる。AI SDK の型はこのファイルの外に漏らさない。
 */
export class AiSdkRecipeGenerator implements RecipeGenerator {
  constructor(
    private readonly model: LanguageModel,
    private readonly options: { timeoutMs?: number; now?: () => Date } = {},
  ) {}

  async generate(params: GenerateRecipesParams): Promise<NewRecipe[]> {
    const today = this.options.now?.() ?? new Date();
    const prompt = buildPrompt(params, today);

    // 設計書 §7/§15.5: LLM 呼び出しにタイムアウトを設定する
    const signal = this.options.timeoutMs
      ? AbortSignal.timeout(this.options.timeoutMs)
      : undefined;

    const { object } = await generateObject({
      model: this.model,
      schema: RecipeListSchema,
      prompt,
      abortSignal: signal,
    });

    return toDomain(object, {
      mealType: params.mealType,
      effortMode: params.effortMode,
    });
  }
}
