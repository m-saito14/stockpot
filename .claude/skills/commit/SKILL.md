---
name: commit
description: コミット前チェック（横展開・2 境界・セキュリティ・型/Lint・テスト実行・README確認）を実施し、問題がなければコミットを作成する。変更をコミットしたいときに使う。
---

以下の手順でコミット前チェックを実施し、問題がなければコミットを作成してください。
判断に迷ったら `CLAUDE.md` / `docs/stockpot-DESIGN.md` に従う。

## ステップ 1: 変更内容の把握

```bash
git status
git diff --cached   # ステージ済み
git diff            # 未ステージ
```

変更ファイルと差分を確認し、コミットの目的を明確にする。

## ステップ 2: アーキテクチャ 2 境界チェック（設計書 §3 / 最重要）

- [ ] `domain/` `application/` に `@prisma/client` の型を import していないか（ORM 境界）
- [ ] `domain/` `application/` に `ai`（AI SDK）/ Mastra の型を import していないか（LLM 境界）
- [ ] リポジトリは `toDomain()` を通してドメインエンティティを返しているか
- [ ] `packages/shared` に `window`/`document`/Node 組み込みが混入していないか（platform-agnostic）

## ステップ 3: 横展開チェック

変更したパターン（関数名・型・Zod スキーマ・enum・エラーメッセージ）を Grep で検索し、
同じ修正が必要な箇所が残っていないか確認する。

- `packages/shared` の enum / スキーマを変更した → API・Web の利用箇所を確認
- Prisma モデルを変更した → 関連する `toDomain` / リポジトリ / マイグレーションを確認
- API ルートを追加・変更した → 同 feature の他ルートと同じパターンか確認

## ステップ 4: テストコードの確認

変更に対応するテストが存在するか確認する（設計書 §18.12 の優先順位）。

| 変更箇所 | 対応テスト |
|---|---|
| `packages/shared` の純粋関数 | 隣接する `*.test.ts` |
| `recipe/domain/`（cook-plan / deduction） | 隣接する `*.test.ts` |
| `application/` ユースケース | 隣接する `*.test.ts`（ポート注入） |
| `presentation/routes.ts` | `*.int.test.ts`（`app.request()`・認可 404） |

**テストが無い場合はコミット前に追加する。**（ただし設計書 §18.11 の「書かないテスト」は除く）

## ステップ 5: セキュリティチェック

- [ ] 認証を要する新ルートに `authMiddleware` が付いているか
- [ ] リポジトリ操作が `where: { id, userId }` で所有権を絞っているか（IDOR 対策）
- [ ] 他ユーザーのリソースが 404 を返すか（403 で存在を漏らしていないか）
- [ ] Firebase 秘密鍵・API キーのハードコード / `.env`・サービスアカウント JSON の混入がないか
- [ ] 在庫 0 件で LLM を叩かない実装が壊れていないか（課金防止）

## ステップ 6: 型チェック・Lint

```bash
pnpm typecheck        # turbo 経由で全パッケージ
pnpm lint             # 設定済みパッケージ
```

エラーがあれば修正してから次へ。

## ステップ 7: テスト実行

```bash
pnpm test             # ユニット（*.int.test.ts を除外）
pnpm test:int         # DB 依存の変更がある場合（要 docker compose up -d）
```

全て通ることを確認する。

## ステップ 8: ドキュメント更新確認

以下に該当したら `README.md` / `CLAUDE.md` を更新する：

- API エンドポイントの追加・変更
- 環境変数の追加（`.env.example` も更新）
- 起動手順・コマンドの変更

## ステップ 9: コミット作成

```
<変更種別>: <変更内容の要約（日本語 50 字以内）>

<必要に応じて詳細説明>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

変更種別の例：`feat`, `fix`, `refactor`, `test`, `docs`, `chore`

> `main` / `develop` では作業しない。`feature/*` か `fix/*` ブランチで行う。
