---
name: create-pr
description: 事前チェック→プッシュ→pr-creator エージェントでタイトル/本文生成→develop ブランチへの GitHub PR 作成までを行う。PR を作りたいときに使う。
---

develop ブランチへの GitHub PR を作成します。

## ステップ 1: 事前チェック

```bash
git branch --show-current
git status --short
git log develop..HEAD --oneline
```

確認事項：
- `main` または `develop` にいる場合: 中止し、`feature/*` か `fix/*` で作業するよう伝える
- 未コミットの変更がある場合: 中止し、先に `/commit` を実行するよう伝える
- `develop..HEAD` のコミットが 0 件の場合: 中止し、変更がない旨を伝える

## ステップ 2: リモートへプッシュ

```bash
git push -u origin HEAD
```

## ステップ 3: PR 内容の生成

`pr-creator` エージェントを起動して PR のタイトルと本文を生成する。
エージェントへ以下を渡す：

- 現在のブランチ名
- `git log develop..HEAD --oneline` の出力
- `git diff develop..HEAD --stat` の出力

## ステップ 4: PR 作成

エージェントが返したタイトルと本文で PR を作成する：

```bash
gh pr create --base develop --assignee @me --title "<タイトル>" --body "$(cat <<'EOF'
<本文>
EOF
)"
```

作成された PR の URL をユーザーに伝える。
