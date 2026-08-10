import type { ReactNode } from "react";
import { AppHeader } from "../components/app-header";
import { Providers } from "../lib/providers";
import "./globals.css";

export const metadata = {
  title: "stockpot",
  description: "冷蔵庫の在庫からレシピを生成するアプリ",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Providers>
          <AppHeader />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
