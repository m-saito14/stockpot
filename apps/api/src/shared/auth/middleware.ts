import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verifyIdToken } from "./firebase.js";
import { prisma } from "../db/prisma.js";

/**
 * 認証ミドルウェア（設計書 §9 / §17）。
 * トークンベース（Bearer / JWT）。Cookie セッションにしない（RN 対応）。
 * 検証済みユーザーを JIT で User テーブルに用意し、内部 userId を c.set する。
 */
export type AuthVariables = {
  userId: string;
  authUid: string;
};

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "認証が必要です" });
    }
    const idToken = header.slice("Bearer ".length);

    let verified;
    try {
      verified = await verifyIdToken(idToken);
    } catch {
      throw new HTTPException(401, { message: "トークンが無効です" });
    }

    // 初回ログイン時に User を JIT 作成（設計書 §17）
    const user = await prisma.user.upsert({
      where: { authUid: verified.authUid },
      update: {},
      create: { authUid: verified.authUid, email: verified.email },
    });

    c.set("userId", user.id);
    c.set("authUid", verified.authUid);
    await next();
  },
);
