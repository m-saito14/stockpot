import type { Preview } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

// Tailwind とデザイントークン（設計書 §13）を Storybook にも効かせる。
import "../src/app/globals.css";

/**
 * React Query のプロバイダ。
 *
 * `lib/hooks.ts` のフックを使うコンポーネント（ItemCard / RecipeCard など）は
 * QueryClientProvider の内側でないと動かないため、全ストーリー共通で包む。
 * ストーリーごとに新しい QueryClient を作り、キャッシュを持ち越さない。
 *
 * なお API 通信自体はモックしていない。ミューテーション（± / お気に入り等）は
 * 実際には失敗するが、見た目の確認が目的なので許容する。通信を伴う挙動まで
 * 確認したくなったら msw を足す。
 */
function WithQueryClient({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    // App Router 前提（usePathname / useRouter のモックを有効にする）
    nextjs: { appDirectory: true },
    // 検出はするが失敗にはしない。個別ストーリーで "error" に上げてもよい。
    a11y: { test: "todo" },
  },

  // 全ストーリーに Docs タブを生成する
  tags: ["autodocs"],

  decorators: [
    (Story) => (
      <WithQueryClient>
        <Story />
      </WithQueryClient>
    ),
  ],
};

export default preview;
