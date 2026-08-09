import { hc } from "hono/client";
import type { Hono } from "hono";

/**
 * ★ hc ラッパー（設計書 §5）。
 *
 * コンポーネントから hc を直接呼ばない。ここで一枚かぶせることで、
 * orval への移行が可逆になる（移行時はこのパッケージだけ差し替える）。
 *
 * 注意（設計書 §5）: 型の import は feature 単位で行う。アプリ全体の
 * `AppType = typeof app` を import すると型インスタンス化が爆発する。
 */

export interface ClientOptions {
  baseUrl: string;
  /** Firebase ID トークンを供給する。Bearer で送る（設計書 §9）。 */
  getToken?: () => string | null | Promise<string | null>;
}

/** 認証ヘッダ付き fetch を組み立てる共通ファクトリ。 */
export function createFetch(options: ClientOptions): typeof fetch {
  return async (input, init) => {
    const token = (await options.getToken?.()) ?? null;
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");
    return fetch(input, { ...init, headers });
  };
}

/**
 * feature 単位で型付きクライアントを作るためのヘルパ。
 * 使用例:
 *   import type { InventoryRoutes } from "@stockpot/api";
 *   const client = createClient<InventoryRoutes>(opts, "/inventory");
 */
export function createClient<T extends Hono<any, any, any>>(
  options: ClientOptions,
  basePath = "",
): ReturnType<typeof hc<T>> {
  return hc<T>(`${options.baseUrl}${basePath}`, {
    fetch: createFetch(options),
  });
}
