"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";

const NAV = [
  { href: "/", label: "在庫" },
  { href: "/recipes", label: "レシピ" },
];

/** アプリ共通ヘッダ。ナビとログアウト。 */
export function AppHeader() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="text-xl font-bold text-brand-600">
          stockpot
        </Link>
        <nav className="flex gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
          <span className="hidden sm:inline">{user?.email}</span>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-lg px-3 py-1.5 hover:bg-slate-100"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
