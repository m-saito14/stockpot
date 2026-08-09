# stockpot スキル一覧

stockpot の標準ワークフローをまとめたスキル群。各スキルは `.claude/skills/<name>/SKILL.md` に定義され、`/<name>` で起動できる。

| スキル | 起動 | 概要 |
|---|---|---|
| commit | `/commit` | コミット前チェック（横展開・2 境界・セキュリティ・型/テスト・README）を実施し、問題なければコミットを作成する |
| create-pr | `/create-pr` | 事前チェック → プッシュ → pr-creator エージェントで本文生成 → `develop` への PR を作成する |
| new-feature | `/new-feature` | 影響範囲特定 → 設計確認 → スキーマ → 実装 → テスト → 動作確認 → コミットまで、新機能追加の標準手順を実行する |
| review-pr | `/review-pr` | code / security / test の 3 レビュワーエージェントを並行起動し、結果を統合したレポートを作成する |

## 関連エージェント（`.claude/agents/`）

- `code-reviewer` / `security-reviewer` / `test-reviewer` — `/review-pr` から並行起動
- `pr-creator` — `/create-pr` から起動

## 前提

- パッケージマネージャは **pnpm**、タスクは **Turborepo**。コマンドは原則リポジトリルートで実行する。
- アーキテクチャの絶対ルール（LLM 境界 / ORM 境界）とテスト方針は `CLAUDE.md` / `docs/stockpot-DESIGN.md` を参照。
