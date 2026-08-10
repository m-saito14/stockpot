"use client";

import { FirebaseError } from "firebase/app";
import { type FormEvent, useState } from "react";
import { useAuth } from "../../lib/auth";

type Mode = "login" | "signup" | "reset";

const TITLE: Record<Mode, string> = {
  login: "ログイン",
  signup: "アカウント登録",
  reset: "パスワード再設定",
};

/** 認証画面（設計書 §13.6）。ログイン / 登録 / パスワード再設定。 */
export function AuthScreen() {
  const { signIn, signUp, sendReset } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else if (mode === "signup") {
        await signUp(email, password, displayName || undefined);
      } else {
        await sendReset(email);
        setNotice("再設定メールを送信しました。メールをご確認ください。");
      }
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-brand-600">stockpot</div>
          <p className="mt-1 text-sm text-slate-500">在庫からレシピを提案します</p>
        </div>

        <h1 className="mb-4 text-lg font-semibold">{TITLE[mode]}</h1>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <Field
              label="表示名（任意）"
              type="text"
              value={displayName}
              onChange={setDisplayName}
              autoComplete="name"
            />
          )}
          <Field
            label="メールアドレス"
            type="email"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />
          {mode !== "reset" && (
            <Field
              label="パスワード"
              type="password"
              value={password}
              onChange={setPassword}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
          {notice && <p className="text-sm text-brand-600">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand-500 py-2.5 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? "処理中…" : TITLE[mode]}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-1 text-center text-sm text-slate-500">
          {mode === "login" && (
            <>
              <button type="button" onClick={() => switchMode("signup")}>
                アカウントを作成する
              </button>
              <button type="button" onClick={() => switchMode("reset")}>
                パスワードを忘れた場合
              </button>
            </>
          )}
          {mode !== "login" && (
            <button type="button" onClick={() => switchMode("login")}>
              ログインに戻る
            </button>
          )}
        </div>
      </div>
    </div>
  );

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500"
      />
    </label>
  );
}

function toMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "メールアドレスまたはパスワードが正しくありません。";
      case "auth/email-already-in-use":
        return "このメールアドレスは既に登録されています。";
      case "auth/weak-password":
        return "パスワードは 6 文字以上にしてください。";
      case "auth/invalid-email":
        return "メールアドレスの形式が正しくありません。";
      default:
        return "エラーが発生しました。時間をおいて再度お試しください。";
    }
  }
  return err instanceof Error ? err.message : "エラーが発生しました。";
}
