# Claude Code 運用ガイド — stockpot

冷蔵庫の在庫をカンバンで管理し、在庫に基づいた AI レシピ提案を行う Web アプリ。
モノレポ（pnpm workspace + Turborepo）。設計の全文は `docs/stockpot-DESIGN.md`。

---

## まず読む

- `docs/stockpot-DESIGN.md` — 唯一の設計の真実。判断に迷ったらここに従う。
- 実装済みの各 feature（`apps/api/src/features/*`）— 既存パターンを踏襲する。

---

## ディレクトリ構成

```
stockpot/
├── apps/
│   ├── api/            # Hono API（メイン）。Feature-First + 2 境界厳守
│   │   ├── prisma/schema.prisma
│   │   └── src/features/<feature>/{domain,application,infrastructure,presentation}
│   └── web/            # Next.js（純粋な View）
├── packages/
│   ├── shared/         # Zod スキーマ + 純粋関数（platform-agnostic を厳守）
│   └── api-client/     # hc ラッパー（orval 移行を可逆にする境界）
└── docs/stockpot-DESIGN.md
```

---

## 開発コマンド

```bash
# ルートで実行（turbo / vitest projects が全パッケージを束ねる）
pnpm test              # ユニット（*.int.test.ts を除外）
pnpm test:int          # 統合（実 DB 必要）
pnpm typecheck         # 型チェック
pnpm check             # lint + format + import 整列（Biome。--fix は check:fix）
pnpm build             # ビルド

# API（apps/api）
pnpm --filter @stockpot/api dev            # 起動（port 8080）
pnpm --filter @stockpot/api prisma:generate
pnpm --filter @stockpot/api prisma:migrate

# ローカル DB
docker compose up -d                       # PostgreSQL
```

---

## アーキテクチャの絶対ルール（設計書 §3）

**厳守する境界は 2 つだけ。ここを壊すレビューは即指摘対象。**

### ① LLM 境界

```
recipe/domain/recipe-generator.ts        ← interface（ポート）
recipe/infrastructure/ai-sdk-generator.ts ← 実装（アダプタ）
recipe/infrastructure/stub-generator.ts   ← 開発 / テスト用（__mocks__ に置かない）
```

- **AI SDK / Mastra の型を `domain/` `application/` に import しない。**
- プロンプト・モデル・マッピングの変更はこのアダプタ 1 ファイルに閉じる。

### ② ORM 境界

```
infrastructure/prisma-*-repository.ts の toDomain() が境界
```

- **Prisma の生成型（`@prisma/client`）を `domain/` `application/` に漏らさない。**
- リポジトリは必ずドメインエンティティを返す（`toDomain` を通す）。

### DI

- composition root（`apps/api/src/app.ts`）での手書き配線で足りる。DI コンテナは入れない。

### レイヤーの向き

```
presentation → application → domain ← infrastructure（domain のポートを実装）
```

- `domain/` は他レイヤーに依存しない（Prisma も AI SDK も import しない）。
- 薄い feature は無理に 4 層に割らない（設計書 §4）。層は必要になってから足す。

---

## 実装時の必須事項

### API（設計書 §5 / §7）

- `@hono/zod-openapi` の `createRoute` に **`operationId` を必ず書く**（orval 移行で生成関数名になる）。
- **型の export は feature 単位**（`export type RecipeRoutes = ...`）。アプリ全体の `typeof app` を export しない（tsc 性能）。
- **サーバー側の Zod 実行時バリデーションは必須**。コンパイル時の型は契約ではない。
- レシピ生成レスポンスに **`status` を最初から含める**（将来の非同期化の保険）。
- LLM 呼び出しには**タイムアウト**を設定する（60〜90 秒）。

### モバイル移行の準備（設計書 §9）

- **認証は Bearer / JWT**。Cookie セッションにしない。
- **ビジネスロジックを Next.js の Server Actions に置かない。** データの読み書きは必ず Hono API 経由。
- `packages/shared` に `window` / `document` / Node 組み込みを入れない（platform-agnostic）。

### 純粋関数の置き場所（設計書 §18.7）

- 期限バッジ判定・刻み幅など Web / モバイル両方で使うロジックは `packages/shared` に純粋関数で置く。UI に埋め込まない。
- **`new Date()` を関数内で呼ばない。** `today` を引数で受け取る（テスト容易性）。

---

## テストの原則（設計書 §18）

- テストは実装にコロケーション（`foo.ts` の隣に `foo.test.ts`）。
- `*.int.test.ts` = 実 DB 必要。それ以外は `*.test.ts`。
- **application 層が主戦場。** ポートを注入し DB も LLM も無しで検証する。
- **「在庫 0 件なら LLM を呼ばない」は課金防止の回帰テスト**（`suggest-recipes.test.ts`）。壊さない。
- **LLM の出力内容はテストしない**（毎回変わる・遅い・課金される）。テストするのはマッピング（`toDomain`）のみ。品質評価は Langfuse。
- **認可のテストは必ず書く。** 他ユーザーのリソースは **404**（403 ではない。存在を漏らさない）。
- 書かないテスト: Prisma 自体の動作 / 単純 CRUD の通過確認 / UI スナップショット / 網羅的バリデーション（Zod が保証）。

着手優先順位: ① `shared` 純粋関数 → ② `cook-plan` の 3 分類 → ③ `cook-recipe` の減算トランザクション → ④ 認可。

---

## ドメインの要注意ポイント（設計書 §12 / §16）

- 在庫の数量は `quantity` + `unit` に統一（グラム別カラムを持たない）。
- 期限は `expiryDate` + `expiryType`（消費期限 / 賞味期限を種別で区別。日付 2 本にしない）。
- `RecipeIngredient.name` は**スナップショット**（在庫への FK にしない）。`sourceItemId` は FK 制約を張らない任意リンク。
- **調理時の在庫マッチングは `sourceItemId` のみを信頼**。名前マッチングは表記ゆれで外れるのでやらない。
- 「適量」「少々」は減算できない → 表示用 `amountText` と減算用 `deductQuantity`(null 可) を分離。

---

## ブランチ・PR 戦略

```
main       ← リリース済み
develop    ← 統合ブランチ（PR はここに向ける）
feature/*  ← 機能開発
fix/*      ← バグ修正
```

- `main` / `develop` への直接 push は禁止（フックでブロック）。`feature/*` か `fix/*` で作業する。
- コミット前は `/commit`、PR は `/create-pr`、レビューは `/review-pr`、新機能は `/new-feature`。

---

## エージェント / スキル

`.claude/` 配下:

- **agents**: `code-reviewer` / `security-reviewer` / `test-reviewer`（`/review-pr` から並行起動）、`pr-creator`（`/create-pr` から起動）。
- **skills**: `commit`（コミット前チェック）、`create-pr`（develop への PR）、`new-feature`（新機能の標準手順）、`review-pr`（3 エージェント並行レビュー）。
