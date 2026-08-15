import { defineMain } from "@storybook/nextjs-vite/node";

/**
 * Storybook 設定（ビルダーは Vite）。
 *
 * - ストーリーは実装にコロケーションする（`foo.tsx` の隣に `foo.stories.tsx`）。
 *   テストの方針（設計書 §18.1）と揃える。
 * - `@storybook/nextjs-vite` が next/link・next/navigation・next/image を
 *   自動でモックするため、App Router のコンポーネントもそのまま描画できる。
 * - `packages/shared` / `packages/api-client` は TS ソースを直接参照する
 *   workspace パッケージだが、Vite は TS からの `./foo.js` 形式の import を
 *   標準で `.ts` に解決するため webpack のような extensionAlias は不要。
 */
export default defineMain({
  stories: ["../src/**/*.stories.@(ts|tsx)"],

  addons: [
    // props テーブルと Docs タブ
    "@storybook/addon-docs",
    // アクセシビリティ検査（設計書 §13 の UI 要件を機械的に担保する）
    "@storybook/addon-a11y",
  ],

  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },

  // CI からも実行するため匿名テレメトリは送らない
  core: { disableTelemetry: true },
});
