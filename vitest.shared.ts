import { defineConfig } from "vitest/config";

/**
 * 各パッケージの vitest.config.ts が mergeConfig で取り込む共通設定。
 *
 * 設計書 §18.8: `projects` を使うと各パッケージの config はルート config を
 * extends できない（projects 設定ごと継承してしまう）。そのため共通設定は
 * この `vitest.shared.ts` に切り出し、各 config が明示的に mergeConfig する。
 */
export const shared = defineConfig({
  test: {
    // `*.int.test.ts`（実 DB 依存）はデフォルトの unit 実行から除外する。
    // 統合テストは `pnpm test:int` で明示的に実行する（設計書 §18.8）。
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    globals: false,
  },
});
