import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Firebase Admin による ID トークン検証（設計書 §17）。
 * 認証情報は Firebase、アプリデータは Cloud SQL に分離する。
 */
let app: App | undefined;

function getApp(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0];
    return app!;
  }
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // 環境変数では改行が \n にエスケープされているため戻す
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
  return app;
}

export interface VerifiedUser {
  authUid: string;
  email: string;
}

/** `Authorization: Bearer <idToken>` の idToken を検証する。 */
export async function verifyIdToken(idToken: string): Promise<VerifiedUser> {
  const decoded = await getAuth(getApp()).verifyIdToken(idToken);
  return { authUid: decoded.uid, email: decoded.email ?? "" };
}
