---
name: new-feature
description: 影響範囲特定→設計確認→スキーマ→domain/application/infrastructure/presentation 実装→テスト作成→動作確認→ドキュメント→コミットまで、stockpot への新機能追加の標準手順を実行する。新機能を追加するときに使う。
---

stockpot に新機能を追加するための標準手順を実行してください。
機能の内容はユーザーの指示または直前の会話から読み取ってください。
アーキテクチャの絶対ルールは `CLAUDE.md` / `docs/stockpot-DESIGN.md` に従う。

## ステップ 1: 影響範囲の特定

追加する機能がどの層・パッケージに関わるか確認する：

| 層 / パッケージ | 場所 | 判断基準 |
|---|---|---|
| DB スキーマ | `apps/api/prisma/schema.prisma` | 新モデル・フィールドが必要か |
| 共有スキーマ / 純粋関数 | `packages/shared` | Web/モバイル両方で使う型・ロジックか |
| domain | `features/<f>/domain` | ドメインルール・ポート（interface）か |
| application | `features/<f>/application` | ユースケースの流れか |
| infrastructure | `features/<f>/infrastructure` | Prisma / AI SDK の実装（アダプタ）か |
| presentation | `features/<f>/presentation` | HTTP エンドポイントか |
| UI | `apps/web` | 画面変更が必要か（純粋な View として） |

> 薄い feature は無理に 4 層に割らない。`service.ts` + `repository.ts` から始めてよい（設計書 §4）。

## ステップ 2: 設計の確認

実装前にユーザーに確認する：
- API エンドポイント名・HTTP メソッド・`operationId`（例: `POST /recipes/suggest`）
- 認証が必要か（原則すべて認証必須。`authMiddleware` を付ける）
- DB への影響（新規マイグレーションが必要か）
- LLM を使うか（使うならポート `RecipeGenerator` 経由で。スタブ実装も用意する）

## ステップ 3: 共有スキーマ / DB スキーマ

```bash
# packages/shared に Zod スキーマ・enum・純粋関数を追加（API のレスポンスと一本化）
# DB 変更がある場合（apps/api で）
pnpm --filter @stockpot/api prisma:migrate    # マイグレーション作成・適用
pnpm --filter @stockpot/api prisma:generate
```

## ステップ 4: バックエンド実装（境界を厳守）

既存 feature（`inventory` / `recipe`）のパターンを参照する。

- **domain**: エンティティとポート（interface）。Prisma / AI SDK を import しない。
- **application**: ユースケース。ポートを注入。DB/LLM に直接依存しない。
- **infrastructure**: `PrismaXxxRepository`（`toDomain()` で境界を張る、`where` に `userId`）。LLM は `ai-sdk-generator.ts`。
- **presentation**: `@hono/zod-openapi` の `createRoute`（`operationId` 必須）+ `authMiddleware`。型 export は feature 単位。
- **composition root**（`apps/api/src/app.ts`）: ポート → 実装を手書き配線。

## ステップ 5: フロントエンド実装（必要な場合）

- `apps/web` は純粋な View。データの読み書きは `@stockpot/api-client`（hc ラッパー）経由。Server Actions にビジネスロジックを置かない。

## ステップ 6: テストの作成（必須 / 設計書 §18）

コロケーションで隣に置く。優先順位に沿って：

- `packages/shared` の純粋関数 → `it.each` で境界値
- `domain`（cook-plan / deduction 相当）→ 分岐の網羅
- `application` → ポート注入で DB/LLM なし。**LLM を無駄に叩かないことの検証**を含める
- `presentation` → `app.request()` で認証 401 / 他ユーザー 404 / バリデーション 400 / 正常系
- LLM は**マッピングのみ**（`toDomain`）。出力内容はテストしない

## ステップ 7: 動作確認

```bash
pnpm typecheck
pnpm test
pnpm test:int    # DB 依存がある場合（要 docker compose up -d）
```

## ステップ 8: ドキュメント更新

`README.md`（API 一覧・環境変数）と、必要なら `CLAUDE.md` を更新する。

## ステップ 9: コミット

`/commit` を使ってコミット前チェックを実施してからコミットする。
