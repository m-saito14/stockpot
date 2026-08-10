"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { AuthScreen } from "../components/auth/auth-screen";
import { AuthProvider, useAuth } from "./auth";

/**
 * アプリ全体のプロバイダ。React Query → Auth → 認証ガードの順で包む。
 * 未ログイン時は全画面をログインへ（設計書 §13.6）。
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGuard>{children}</AuthGuard>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center text-slate-400">読み込み中…</div>
    );
  }

  if (!user) return <AuthScreen />;

  return <>{children}</>;
}
