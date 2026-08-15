# stockpot

冷蔵庫の在庫をカンバンで管理し、在庫に基づいた AI レシピ提案を行う Web アプリ。

> 在庫 = **stock** と寸胴鍋 = **stock pot** のダブルミーニング。

設計の全文は [`docs/stockpot-DESIGN.md`](docs/stockpot-DESIGN.md) を参照。本 README は実装の入り口。

---

## できること（Phase 1 / Web 版 MVP）

- アカウント登録・ログイン（Firebase Authentication）
- 在庫のカンバン管理（常温 / 冷蔵 / 冷凍）
- 在庫に基づくレシピ生成（朝食 / 昼食 / 夕食 × お手軽 / 本格）
- 生成レシピの保存・一覧・お気に入り・リピート
- 調理記録と在庫減算

---

## 技術スタック

| レイヤー | 選定 |
|---|---|
| リポジトリ構成 | モノレポ（pnpm workspace + Turborepo） |
| 言語 | TypeScript 統一 |
| フロントエンド | Next.js（App Router） |
| バックエンド | Hono（on Cloud Run） |
| API 定義 | `@hono/zod-openapi`（OpenAPI を初日から生成） |
| API クライアント | Hono RPC (`hc`) → 将来 orval |
| ORM | Prisma 7 |
| DB | Cloud SQL (PostgreSQL) |
| 認証 | Firebase Authentication（Bearer / JWT） |
| LLM | Vercel AI SDK（`generateObject` + Zod） |
| 観測 / 評価 | Langfuse Cloud |
| テスト | Vitest（`projects` 構成） |

選定理由は設計書 §2 に記録。

---

## ディレクトリ構成

```
stockpot/
├── apps/
│   ├── api/                     # Hono API（Feature-First + 2 境界）
│   │   ├── prisma/schema.prisma
│   │   └── src/
│   │       ├── features/
│   │       │   ├── inventory/   # domain / application / infrastructure / presentation
│   │       │   ├── recipe/      # 同上（cook-plan・生成・調理フロー）
│   │       │   └── auth/
│   │       ├── shared/          # db / auth（Firebase）/ llm（モデル定義）
│   │       └── app.ts           # composition root（手書き DI 配線）
│   └── web/                     # Next.js（純粋な View / BFF にしない）
├── packages/
│   ├── shared/                  # Zod スキーマ + 純粋関数（platform-agnostic）
│   ├── api-client/              # hc ラッパー（orval 移行を可逆にする境界）
│   └── config/                  # （将来）eslint / tsconfig 共有
├── docs/stockpot-DESIGN.md
├── pnpm-workspace.yaml
├── turbo.json
└── vitest.config.ts             # projects 集約（設計書 §18.8）
```

### 厳守する 2 つの境界（設計書 §3）

1. **LLM 境界** — `recipe/domain/recipe-generator.ts`（ポート）↔ `infrastructure/ai-sdk-generator.ts`（アダプタ）。AI SDK の型を domain / application に漏らさない。`StubRecipeGenerator` に差し替えればトークンを消費せず動く。
2. **ORM 境界** — `infrastructure/prisma-*-repository.ts` の `toDomain` で Prisma の生成型を境界の外に出さない。

---

## セットアップ

前提: Node.js 20+, pnpm 9+, Docker（ローカル PostgreSQL 用）。

```bash
# 1. 依存インストール
pnpm install

# 2. 環境変数
cp .env.example .env            # 値を埋める（Firebase / DB / LLM / Langfuse）

# 3. ローカル DB 起動
docker compose up -d

# 4. Prisma クライアント生成 + マイグレーション
pnpm --filter @stockpot/api prisma:generate
pnpm --filter @stockpot/api prisma:migrate

# 5. 起動（API と Web）
pnpm --filter @stockpot/api dev      # http://localhost:8080
pnpm --filter @stockpot/web dev      # http://localhost:3000
```

### LLM なしで開発する

トークンを消費せず UI を触れる（設計書 §18.4）。`.env` で:

```
USE_STUB_LLM=true
```

`StubRecipeGenerator` が常に 3 件のダミーレシピを返す。API キーなしで起動できる。

---

## フロントエンド（apps/web）

Next.js（App Router）+ Tailwind CSS v4。純粋な View として扱い、データの読み書きは
必ず Hono API 経由（`packages/api-client` の hc ラッパー seam + React Query）。

| 画面 | パス | 設計書 |
|---|---|---|
| カンバン（在庫 + 生成トリガー） | `/` | §13.1 / §13.2 |
| レシピ一覧（フィルタ / ソート / ⭐️） | `/recipes` | §13.3 |
| レシピ詳細（手順アイコン + 調理確定モーダル） | `/recipes/[id]` | §13.4 / §13.5 |
| 認証（ログイン / 登録 / 再設定） | 未ログイン時に全画面 | §13.6 |

- カンバンの列またぎ D&D は **dnd-kit**（`@dnd-kit/core`）。期限バッジ・± 刻み幅は
  `packages/shared` の純粋関数を UI から呼ぶ（設計書 §18.7）。
- 認証は Firebase クライアント SDK。ブラウザに露出する公開設定のみ
  `NEXT_PUBLIC_FIREBASE_*` に設定する（秘密鍵はサーバー側の `FIREBASE_PRIVATE_KEY`）。

### Storybook

UI コンポーネントのカタログ。API や Firebase なしで見た目を確認できる。

```bash
pnpm storybook          # http://localhost:6006
pnpm build-storybook    # 静的ビルド（apps/web/storybook-static）
```

- ビルダーは Vite（`@storybook/nextjs-vite`）。`next/link` `next/navigation` は
  フレームワーク側が自動でモックする。
- **ストーリーは実装にコロケーション**する（`foo.tsx` の隣に `foo.stories.tsx`）。
  テストの方針（設計書 §18.1）と揃える。
- React Query のプロバイダは `.storybook/preview.tsx` で全ストーリーに適用済み。
  **API 通信はモックしていない**ので、± や ⭐️ などのミューテーションは実際には失敗する。
  通信を伴う挙動まで確認したくなったら msw を足す。
- サンプルデータは `src/lib/fixtures.ts`（Storybook 専用。アプリ本体から import しない）。

---

## よく使うコマンド

```bash
pnpm test              # ユニットテスト（*.int.test.ts を除外）
pnpm test:int          # 統合テスト（実 DB 必要）
pnpm test:watch        # ウォッチ
pnpm test:coverage     # カバレッジ（v8）
pnpm typecheck         # 型チェック（turbo 経由で全パッケージ）
pnpm build             # 全パッケージビルド
pnpm storybook         # Storybook 起動（http://localhost:6006）
pnpm build-storybook   # Storybook 静的ビルド

# lint / format（Biome。lint と formatter を 1 ツールに統合）
pnpm lint              # lint のみ
pnpm format            # フォーマット（--write で自動修正）
pnpm check             # lint + format + import 整列（チェックのみ）
pnpm check:fix         # 上記を自動修正
pnpm ci:quality        # CI 用（biome ci。書き込みなしで失敗検知）
```

テスト命名規約: `*.int.test.ts` = 実 DB が必要なもの。それ以外は `*.test.ts`（CI の分割に使う / 設計書 §18.3）。

## CI（GitHub Actions）

`develop` / `main` への PR と push で `.github/workflows/ci.yml` が走る。3 ジョブ構成：

1. **Lint & Format (Biome)** — `pnpm ci:quality`（lint・format・import 整列）
2. **Typecheck & Test** — Prisma Client 生成 → `pnpm typecheck` → `pnpm test`
3. **Build Storybook** — `pnpm build-storybook`（ストーリーが壊れていないかの検証）

統合テスト（`pnpm test:int`）は実 DB が要るため、DB サービス付きジョブとして今後追加する。

---

## API 一覧（設計書 §14）

```
POST   /auth/session                 # Firebase ID トークン検証 + User の JIT 作成

GET    /inventory                    # storageType でグルーピングして返す
POST   /inventory
PATCH  /inventory/:id                # 数量 / 保存場所 / 期限 / メモ（カード移動含む）
DELETE /inventory/:id

POST   /recipes/suggest              # { mealType, effortMode } → レシピ 3 件を生成・保存
GET    /recipes                      # ?favorite=&mealType=&effortMode=&sort=
GET    /recipes/:id
PATCH  /recipes/:id                  # お気に入り切替
DELETE /recipes/:id

GET    /recipes/:id/cook-plan        # 現在庫と突き合わせた減算案を返す
POST   /recipes/:id/cook             # 確定内容で減算 + CookLog 記録
```

OpenAPI スペックは `GET /openapi.json` で取得できる。

---

## テスト方針（設計書 §18）

テストは実装にコロケーション（`tests/` に別ツリーを作らない）。着手優先順位:

1. `packages/shared` の純粋関数（期限判定 `getExpiryStatus`、刻み幅 `stepFor`）
2. `recipe/domain/cook-plan.ts` の 3 分類ロジック（`buildCookPlan`）
3. `recipe/domain/deduction.ts` のトランザクション計算（`applyDeductions`）
4. 認可（他ユーザーのデータにアクセスできないこと）

**LLM の出力内容はテストしない。** テストするのはマッピング（`toDomain`）のみ。レシピの品質評価（在庫にない材料が混ざらないか等）は Langfuse の Dataset + LLM-as-a-Judge の仕事（設計書 §18.5）。

---

## ブランチ・PR 戦略

```
main       ← リリース済み
develop    ← 統合ブランチ（PR はここに向ける）
feature/*  ← 機能開発
fix/*      ← バグ修正
```

コミット・PR・レビューは `.claude/skills`（`/commit`, `/create-pr`, `/review-pr`, `/new-feature`）を使う。詳細は [`CLAUDE.md`](CLAUDE.md)。
