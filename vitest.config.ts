import { defineConfig } from "vitest/config";

/**
 * ルート config。設計書 §18.8 の方針に従い:
 * - `vitest.workspace.ts` は使わない（Vitest 3.2 で非推奨 → `projects` へ）
 * - 各パッケージ配下の vitest.config.ts を projects として集約する
 * - カバレッジ設定はルートに書く
 */
export default defineConfig({
  test: {
    projects: ["apps/*", "packages/*"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
    },
  },
});
