import type { ReactNode } from "react";

export const metadata = {
  title: "stockpot",
  description: "冷蔵庫の在庫からレシピを生成するアプリ",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
