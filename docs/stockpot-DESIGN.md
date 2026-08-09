# stockpot — 設計書

冷蔵庫の在庫をカンバンで管理し、在庫に基づいた AI レシピ提案を行う Web アプリ。

**リポジトリ名：`stockpot`**（在庫 = stock と寸胴鍋 = stock pot のダブルミーニング）
npm スコープ：`@stockpot/web`, `@stockpot/api`, `@stockpot/shared`, `@stockpot/api-client`

開発体制：個人開発 / Web 先行、将来的に React Native への展開を想定

---

# 目次

**Part I — アーキテクチャ**
1. 技術スタック
2. 選定の経緯
3. アーキテクチャ方針
4. ディレクトリ構成
5. API 設計方針
6. LLM レイヤー
7. レシピ生成方式
8. Cloud Run 運用
9. モバイル移行準備
10. 段階的実装計画

**Part II — 仕様**
11. スコープ
12. ドメインモデル
13. 画面仕様
14. API 一覧
15. レシピ生成仕様
16. 調理フロー
17. 認証

**Part III — テスト方針**
18. テスト戦略

**Part IV — サマリ**
19. 決定事項一覧
20. 未確定・将来検討

---

# Part I — アーキテクチャ

## 1. 技術スタック

| レイヤー | 選定 |
|---|---|
| リポジトリ構成 | モノレポ（pnpm workspace + Turborepo） |
| 言語 | TypeScript 統一 |
| フロントエンド | Next.js |
| バックエンド | Hono（on Cloud Run） |
| API 定義 | `@hono/zod-openapi` |
| API クライアント | Hono RPC (`hc`) → 将来 orval |
| ORM | Prisma 7 |
| DB | Cloud SQL (PostgreSQL) |
| ホスティング | Cloud Run |
| 認証 | Firebase Authentication |
| LLM（Phase 1） | Vercel AI SDK (`ai`) |
| エージェント（Phase 2） | Mastra |
| 観測 / 評価 | Langfuse Cloud |
| レシピ生成方式 | 同期リクエスト |
| DnD | dnd-kit |
| テスト | Vitest（`projects` 構成） |

## 2. 選定の経緯

議論の中で何度か判断を覆しているため、再検討を防ぐ目的で理由を残す。

| 論点 | 決定 | 理由 |
|---|---|---|
| **Python or TypeScript** | TypeScript 統一 | 個人開発で 2 言語はツールチェーン・型共有・文脈切替のコストが重い。主要フレームワークは TS ネイティブで、Python 版の後追いではない |
| **モノレポ or 別リポジトリ** | モノレポ | 型・Zod スキーマの共有が最大の資産。front/back にまたがる変更が 1 PR で完結する |
| **Hono or NestJS** | Hono | Cloud Run のコールドスタートに有利。`hc` による型安全 RPC。NestJS の DI コンテナはチーム開発向けで、個人開発では手書き配線で足りる |
| **Prisma or Drizzle** | Prisma 7 | 当初は Cloud Run のコールドスタートを理由に Drizzle を想定していたが、Prisma 7.0.0（2025-11-19）が Rust バイナリを撤廃し、バンドルサイズ約 90% 削減・クエリ最大 3 倍高速化。Drizzle を選ぶ主要根拠が消えた |
| **LangSmith or Langfuse** | Langfuse Cloud | 無料枠が 50k units/月 vs 5k traces/月 で 10 倍差。MIT ライセンスの OSS かつ OpenTelemetry ベースで、観測基盤をフレームワーク選定から切り離せる |
| **LangChain or Vercel AI SDK** | Vercel AI SDK | Phase 1 で使うのは構造化出力のみで LangChain の表面積をほぼ触らない。provider 非依存でモデル差し替えが 1 行。npm 週間 DL は `ai` 約 1,420 万 vs `langchain` 約 240 万（2026-06 時点） |
| **LangGraph.js or Mastra** | Mastra | LangGraph の TS 版は Python 版に 4〜8 週遅れ、API も Python 翻訳調。LangGraph Platform がサーバーレス非対応で Cloud Run 前提の本構成と合わない。Mastra は内部で AI SDK を使うため段階移行できる |
| **`hc` or orval** | `hc` で開始 | `hc` の tsc 性能問題はエンドポイント数百規模の話。初期の約 20 では顕在化しない。`packages/api-client` でラップして移行を可逆にする |
| **同期 / SSE / 非同期ジョブ** | 同期リクエスト | 構造化出力（JSON）では SSE の途中受信が壊れた JSON にしかならず、部分 JSON パーサが必要になる。旨味に対してコストが重い。非同期ジョブは実測 p95 が 30 秒を超えてから |

### ⚠️ Langfuse はセルフホストしない

Langfuse v3 は Postgres / ClickHouse / Redis・Valkey / S3 互換ストレージに分離され、web と worker のコンテナとして動く構成。ClickHouse を運用できないならセルフホストは選択肢から外れる。

レシピアプリ 1 本のためにこれを運用するのは本末転倒。**Langfuse Cloud の無料枠を使う。** 「必要になれば移行できる」という逃げ道があること自体が価値。

## 3. アーキテクチャ方針

### 基本方針：Feature-First を主軸に、層は薄く

DDD / クリーンアーキテクチャ / Feature-First は排他ではなく軸が違う。

- **Feature-First** … ディレクトリの分け方（横軸）
- **クリーンアーキテクチャ** … 依存の向き（縦軸）
- **DDD** … ドメインモデリングの方法論

本アプリはドメインが薄い（在庫管理は実質 CRUD、難所は LLM に委譲）ため、DDD の戦術パターンをフル装備しない。

### 厳守する境界は 2 つだけ

#### ① LLM 境界

```
domain/recipe-generator.ts        ← interface（ポート）
infrastructure/ai-sdk-generator.ts ← 実装（アダプタ）
infrastructure/stub-generator.ts   ← テスト用
```

- **AI SDK / Mastra の型を `domain/` `application/` に漏らさない**
- プロンプト・モデル・フレームワークはアプリ内で最も頻繁に壊れる箇所
- **この境界のおかげで、LangChain → Vercel AI SDK の変更がアダプタ 1 ファイルの差し替えで済んでいる**
- 副次効果：スタブに差し替えればトークンを消費せずテストできる

#### ② ORM 境界

```ts
// infrastructure/prisma-inventory-repository.ts
async findAll(userId: UserId): Promise<InventoryItem[]> {
  const rows = await this.prisma.inventoryItem.findMany({ where: { userId } });
  return rows.map(toDomain);   // ← ここが境界
}
```

- **Prisma の生成型を `domain/` `application/` に漏らさない**

### DI

composition root での手書き配線で足りる。

```ts
const generator = new AiSdkRecipeGenerator(model);
const useCase = new SuggestRecipes(inventoryRepo, generator);
```

## 4. ディレクトリ構成

```
stockpot/
├── apps/
│   ├── web/                    # Next.js
│   ├── api/                    # Hono
│   │   └── src/
│   │       ├── features/
│   │       │   ├── inventory/
│   │       │   │   ├── domain/
│   │       │   │   ├── application/
│   │       │   │   ├── infrastructure/
│   │       │   │   └── presentation/
│   │       │   └── recipe/
│   │       │       ├── domain/
│   │       │       │   ├── recipe.ts
│   │       │       │   └── recipe-generator.ts      # ★ ポート
│   │       │       ├── application/
│   │       │       │   ├── suggest-recipes.ts
│   │       │       │   └── cook-recipe.ts
│   │       │       ├── infrastructure/
│   │       │       │   ├── ai-sdk-generator.ts      # ★ アダプタ
│   │       │       │   └── stub-generator.ts
│   │       │       └── presentation/
│   │       └── shared/
│   │           ├── db/
│   │           ├── auth/                            # Firebase JWT 検証
│   │           └── llm/                             # モデル定義, Langfuse 設定
│   └── mobile/                 # 将来: Expo / React Native
├── packages/
│   ├── shared/                 # Zod スキーマ + 型（platform-agnostic を厳守）
│   ├── api-client/             # ★ hc ラッパー。orval 移行時はここだけ差し替える
│   └── config/                 # eslint, tsconfig
├── pnpm-workspace.yaml
└── turbo.json
```

> 薄い feature（`inventory` 等）は無理に 4 層に割らず、`service.ts` + `repository.ts` から始めてよい。層は必要になってから足す。

## 5. API 設計方針

- **Hono RPC は REST の代替ではない**。ワイヤ上はただの HTTP。RESTful に設計した上で `hc` で型付き呼び出しする
- `POST /recipes/suggest` のような LLM アクション系は、無理に REST のリソース操作に寄せず**アクションエンドポイントとして割り切る**
- **型の export は feature 単位で行う**（tsc 性能対策）

```ts
// ❌ アプリ全体 → 型インスタンス化が爆発
export type AppType = typeof app;

// ✅ feature 単位
export type InventoryRoutes = typeof inventoryRoutes;
export type RecipeRoutes = typeof recipeRoutes;
```

- **サーバー側の Zod 実行時バリデーションは必須**。コンパイル時の型は契約ではない
- バックエンドとフロントで **Hono のバージョンを揃える**（pnpm catalog）
- `createRoute` に **`operationId` を必ず書く**（orval 移行時に生成関数名がそのまま使える）

### `packages/api-client` で必ずラップする

コンポーネントから `hc` を直接呼ばない。これにより orval への移行が可逆になる。

```ts
export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => (await client.index.$get()).json(),
  });
}
```

### orval への移行トリガー

| トリガー | 判断 |
|---|---|
| UI 調整のたびに LLM を叩いてトークンが溶けている | 最有力（MSW モック目当て） |
| エンドポイントが 50 超で IDE / CI が体感で遅い | tsc 問題が現実化 |
| モバイル（Expo）に着手した | 生成クライアントのほうが取り回しが良い |
| API を外部公開する | 必須 |

`@hono/zod-openapi` により OpenAPI スペックは初日から存在するため、準備コストは払い済み。

## 6. LLM レイヤー

### Phase 1：Vercel AI SDK の構造化出力

`generateObject` に Zod スキーマを渡して JSON を受け取る。`packages/shared` の Zod をそのまま使えるため、API のレスポンススキーマと生成スキーマを一本化できる。

provider 非依存なので、`model` の 1 行を差し替えて Gemini Flash / Claude / GPT を比較できる。**Langfuse でコストとレイテンシを見ながら決める。**

### Phase 2：Mastra への移行トリガー

以下のいずれかが必要になった時点。それまでは導入しない（1 回のモデル呼び出しで済むなら過剰な構造）。

| 必要になるもの | 具体的なユースケース |
|---|---|
| ツール呼び出し | 在庫が増えプロンプトに全部詰められなくなった |
| 多段ワークフロー | 複数日の献立プランニング |
| 永続メモリ | 「もっと簡単なのに変えて」という会話継続 |
| 自己検証ループ | 在庫にない材料が混ざるのを機械的に防ぐ |

Mastra は内部で AI SDK を使っているため、プロンプトやモデル指定のコードはほぼそのまま持ち込める。「乗り換える」というより「上に層を足す」に近い。

> Phase 1 の実体は「LLM に 1 回問い合わせる Web アプリ」であり、厳密にはエージェントではない。エージェント化は遅く・高く・不安定になるため、必要になるまでしない。

## 7. レシピ生成方式：同期リクエスト

```
クライアント ---- POST /recipes/suggest ----> API ---- 生成 ----> LLM
            <--- 200 { status:"done", recipes:[...] } ---
```

### 実装上の必須事項

1. **レスポンスに `status` を最初から含める**
   将来 `status: "pending"` が返るようになってもフロントの型が変わらない。コスト実質ゼロの保険

2. **LLM 呼び出しにタイムアウト（60〜90 秒）を設定する**
   同期方式では LLM が固まるとリクエストごと固まる

3. **LLM 呼び出し前に DB コネクションを解放する**
   `在庫取得 → コネクション返却 → LLM 呼び出し → 保存時に再取得`

4. **体感速度は UI で稼ぐ**
   段階表示アニメーション + スケルトン UI。実進捗と連動しなくても効果がある

### Cloud Tasks への移行判断

**Langfuse の実測 p95 レイテンシ**で決める。感覚で判断しない。

| p95 | 判断 |
|---|---|
| 〜15 秒 | 現状維持 |
| 15〜30 秒 | スケルトン UI + 段階表示で粘る |
| 30 秒〜 / タイムアウト発生 | Cloud Tasks へ移行 |

移行時に必要：`jobs` テーブル、ワーカーエンドポイント（+ 呼び出し元認証）、フロントのポーリング、キュー設定・IAM。

## 8. Cloud Run 運用

- [ ] DB プールサイズを**インスタンスあたり 2〜5** に絞る（インスタンスごとに独立プールを持つため `max_connections` が枯渇しやすい）
- [ ] Cloud SQL Connector（Unix ソケット）経由で接続
- [ ] **LLM 呼び出し中に DB コネクションを保持しない**（デフォルト同時実行数 80 と衝突する）
- [ ] **レスポンス後のバックグラウンド処理をしない**（CPU がリクエスト処理中しか割り当てられない）
- [ ] リクエストタイムアウトを明示設定（`--timeout`。デフォルト 300 秒）
- [ ] Langfuse への送信 flush タイミングに注意（fire-and-forget にすると CPU スロットリングで送信されない可能性）

## 9. モバイル移行準備

バックエンドは変更不要。UI のみ書き直し。**今のうちにやるべきは 2 点のみ。**

### 必須

1. **認証をトークンベース（Bearer / JWT）にする**
   Cookie セッションは React Native で素直に動かない。API は `Authorization` ヘッダを受け付ける設計にする

2. **ビジネスロジックを Next.js の Server Actions に置かない**
   置いた分はモバイルから呼べない。**データの読み書きは必ず Hono API を経由する。** Next.js は BFF ではなく純粋な View として扱う

### その他

- `packages/shared` に `window` / `document` / Node 組み込みを入れない
- **UI は共通化しない**。共通化はロジック（型・API クライアント・フック）まで
- コンパイル時の型はモバイルの契約にならない → **実行時バリデーション + API バージョニング**
- pnpm × Metro で詰まったら `.npmrc` に `node-linker=hoisted`
- 同期方式も Cloud Tasks 方式も RN でそのまま動く（SSE を選ばなかったため追加対応が不要）
- カンバンの 3 列横並びはモバイルでは幅が足りない → タブ切り替えを想定

## 10. 段階的実装計画

| Phase | LLM | 生成方式 | API クライアント |
|---|---|---|---|
| **1** | Vercel AI SDK の `generateObject` + Zod。Langfuse を初日から | 同期 | `hc` |
| **2** | 多段化したら Mastra | p95 30 秒超で Cloud Tasks | トリガー該当で orval |
| **3** | 会話履歴・中断再開が必要なら Mastra の永続メモリ | — | — |

各移行は、前段で切った境界（ポート／`api-client` ラッパー／`status` フィールド）により 1 箇所の差し替えで済む。

---

# Part II — 仕様

## 11. スコープ

### Phase 1（Web 版 MVP）

- アカウント登録・ログイン
- 在庫のカンバン管理（常温 / 冷蔵 / 冷凍）
- 在庫に基づくレシピ生成（朝食 / 昼食 / 夕食 × お手軽 / 本格）
- 生成レシピの保存・一覧・お気に入り・リピート
- 調理記録と在庫減算

### スコープ外

買い物リスト / レシピの手動作成・編集 / 画像認識による登録 / 栄養価計算 / 共有・SNS / モバイルアプリ（設計上の考慮のみ）

## 12. ドメインモデル

```prisma
enum StorageType { PANTRY  FRIDGE  FREEZER }         // 常温 / 冷蔵 / 冷凍
enum ExpiryType  { BEST_BEFORE  CONSUME_BY }         // 賞味期限 / 消費期限
enum Unit        { PIECE  GRAM  MILLILITER  PACK  BUNCH }
enum MealType    { BREAKFAST  LUNCH  DINNER }
enum EffortMode  { EASY  ELABORATE }                 // お手軽 / 本格
enum CookMethod  { PREP  STOVE  MICROWAVE  OVEN  TOASTER  THAW  NONE }

model User {
  id          String   @id @default(cuid())
  authUid     String   @unique                       // Firebase UID
  email       String
  displayName String?
  createdAt   DateTime @default(now())

  items       InventoryItem[]
  recipes     Recipe[]
  cookLogs    CookLog[]
}

model InventoryItem {
  id           String      @id @default(cuid())
  userId       String
  name         String
  storageType  StorageType                           // ← カンバンの列
  quantity     Decimal     @db.Decimal(10, 2)
  unit         Unit
  expiryDate   DateTime?   @db.Date
  expiryType   ExpiryType?
  note         String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, storageType])
  @@index([userId, expiryDate])
}

model Recipe {
  id           String     @id @default(cuid())
  userId       String
  title        String
  description  String?
  mealType     MealType
  effortMode   EffortMode
  estimatedMin Int?
  isFavorite   Boolean    @default(false)
  cookedCount  Int        @default(0)
  lastCookedAt DateTime?
  createdAt    DateTime   @default(now())

  steps        RecipeStep[]
  ingredients  RecipeIngredient[]
  cookLogs     CookLog[]
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isFavorite])
  @@index([userId, mealType])
  @@index([userId, createdAt])
}

model RecipeStep {
  id          String     @id @default(cuid())
  recipeId    String
  order       Int
  instruction String
  method      CookMethod @default(NONE)              // アイコン表示用

  recipe      Recipe     @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@unique([recipeId, order])
}

model RecipeIngredient {
  id             String   @id @default(cuid())
  recipeId       String
  name           String                              // ★ 生成時点のスナップショット
  amountText     String                              // 表示用："200g" / "適量"
  deductQuantity Decimal? @db.Decimal(10, 2)         // 減算用。不明なら null
  deductUnit     Unit?
  sourceItemId   String?                             // 生成時に参照した在庫 ID（FK ではない）

  recipe         Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
}

model CookLog {
  id         String   @id @default(cuid())
  userId     String
  recipeId   String
  cookedAt   DateTime @default(now())
  deductions Json                                    // 実際に減らした内容の記録

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipe     Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@index([userId, cookedAt])
}
```

### モデリング上の重要な判断

| 判断 | 理由 |
|---|---|
| **`quantity` + `unit` に統一**（グラム数の別カラムを持たない） | 「卵 3個 / 180g」のような二重表現は必ず破綻する。±ボタンの刻み幅を unit ごとに変えて対応 |
| **`expiryDate` + `expiryType`**（日付カラムを 2 本持たない） | 消費期限と賞味期限は同時に存在しない（食品表示法）。2 本持つと不正な状態が作れる |
| **`RecipeIngredient.name` は FK ではなくスナップショット** | 在庫は消費されて消える。FK にすると保存済みレシピの材料が消え、「リピート」要件が壊れる |
| **`sourceItemId` は FK 制約を張らない任意リンク** | 在庫削除でレシピが壊れてはいけない |
| **`RecipeStep` を Json ではなくテーブルに** | 「手順 3 だけ表示」「`method` でアイコン出し分け」がやりやすい |
| **`CookLog` を持つ** | 「よく作った順」やリピート判断の精度が上がる |

## 13. 画面仕様

### 13.1 カンバン（メイン画面）

```
┌─────────────────────────────────────────────────┐
│  stockpot                        [朝食][昼食][夕食] │
│                          モード: お手軽 ●━━○ 本格   │
├─────────────┬─────────────┬─────────────────────┤
│  常温 (3)   │  冷蔵 (8)   │  冷凍 (4)            │
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐         │
│ │ 玉ねぎ   │ │ │ 卵       │ │ │ 豚こま肉 │        │
│ │[-] 2個 [+]│ │[-] 3個 [+]│ │[-]300g[+]│        │
│ │ 🟡08/20  │ │ │ 🔴08/12  │ │ │ 🟡09/15  │       │
│ └─────────┘ │ └─────────┘ │ └─────────┘         │
│    [+ 追加]  │    [+ 追加]  │    [+ 追加]         │
└─────────────┴─────────────┴─────────────────────┘
```

- **列** = `storageType`、**カード** = `InventoryItem`
- **並び順は期限昇順の自動ソート**（手動並び替えは実装しない。期限なしは末尾）
- **ドラッグ&ドロップは列をまたぐ移動のみ** → `PATCH /inventory/:id { storageType }`
- ライブラリは **dnd-kit**

#### カードの構成要素

| 要素 | カラム | 挙動 |
|---|---|---|
| 食材名 | `name` | インライン編集 |
| 数量 ± ボタン | `quantity` | 刻み幅は `unit` で変化：`PIECE`/`PACK`/`BUNCH` = ±1、`GRAM` = ±50、`MILLILITER` = ±100 |
| 単位 | `unit` | セレクト |
| 期限バッジ | `expiryDate` + `expiryType` | 下表参照 |
| メモ | `note` | 展開時に表示 |

#### 期限バッジの表示ルール

| 状態 | 表示 |
|---|---|
| `CONSUME_BY`（消費期限）が当日以前 | 🔴 期限切れ（強調） |
| `CONSUME_BY` が 3 日以内 | 🔴 |
| `BEST_BEFORE`（賞味期限）が 3 日以内 | 🟡 |
| それ以外 | ⚪ 通常表示 |
| 期限なし | バッジなし |

> 消費期限は「安全」、賞味期限は「品質」で意味が異なるため色を分ける。

#### 生成トリガー

- **朝食 / 昼食 / 夕食** の 3 ボタン → `mealType`
- **モードスイッチ**（お手軽 ⇄ 本格）→ `effortMode`。選択状態は localStorage に保持（DB に持たない）

### 13.2 レシピ生成中 / 結果

- 同期リクエストのためレスポンスまで待機
- 段階表示アニメーション：「材料を確認しています」→「レシピを考えています」→「手順をまとめています」（実進捗とは非連動）
- 結果は 3 件のレシピカード

### 13.3 レシピ一覧

- フィルタ：お気に入り / `mealType` / `effortMode`
- ソート：新着順 / よく作った順（`cookedCount`）/ 最終調理日（`lastCookedAt`）
- 各カードに ⭐️ トグル

### 13.4 レシピ詳細

- 材料一覧（`amountText`）
- 手順（`method` に応じたアイコン：🔥 コンロ / ⚡️ レンジ / 🔆 オーブン / 🍞 トースター / ❄️ 解凍 / 🔪 下ごしらえ）
- **[ 作った ]** ボタン → 調理確定モーダル

### 13.5 調理確定モーダル

```
「豚バラと白菜の味噌炒め」を作りましたか？

✓ 豚バラ肉      300g  →  100g      [ 200 ] g
✓ 白菜          1個   →  0個  🗑    [ 1 ] 個
✓ 玉ねぎ        2個   →  1個       [ 1 ] 個
□ 醤油          適量  （数量不明のため対象外）
□ ごま油        ―     （在庫に見つかりません）

              [ キャンセル ]  [ 確定して記録 ]
```

- チェックを外した材料は減算しない / 数値は手動上書き可
- 減算後 0 以下になる項目に 🗑 を表示（確定時に削除）
- 二重送信防止のため確定ボタンは押下後に無効化

### 13.6 認証画面

サインアップ（メール + パスワード）/ ログイン / パスワードリセット。未ログイン時は全画面をログインへリダイレクト。

## 14. API 一覧

```
POST   /auth/session                 # Firebase ID トークン検証 + User の JIT 作成

GET    /inventory                    # storageType でグルーピングして返す
POST   /inventory
PATCH  /inventory/:id                # 数量 / 保存場所 / 期限 / メモ（カード移動も含む）
DELETE /inventory/:id

POST   /recipes/suggest              # { mealType, effortMode } → レシピ 3 件を生成・保存
GET    /recipes                      # ?favorite=&mealType=&effortMode=&sort=
GET    /recipes/:id
PATCH  /recipes/:id                  # お気に入り切替
DELETE /recipes/:id

GET    /recipes/:id/cook-plan        # 現在庫と突き合わせた減算案を返す
POST   /recipes/:id/cook             # 確定内容で減算 + CookLog 記録
```

- カンバンのカード移動に専用エンドポイントを作らない
- **減算案の計算はサーバー側**に置く（フロントに置くと Web / モバイルで二重実装になる）

## 15. レシピ生成仕様

### 15.1 LLM への入力

```
【在庫】
■ 冷凍
  - [itm_a1] 豚こま肉 300g（消費期限: 2026-09-15）
  - [itm_a2] ほうれん草 1パック
■ 冷蔵
  - [itm_b1] 卵 3個（賞味期限: 2026-08-12）★期限間近
  - [itm_b2] 白菜 1個
■ 常温
  - [itm_c1] 玉ねぎ 2個

【条件】
食事: 夕食
モード: お手軽（調理時間 20 分以内 / 工程 3 つまで / 特殊な調理器具を使わない）

【指示】
- 上記の在庫だけで作れるレシピを 3 件提案してください
- 期限が近い食材を優先的に使ってください
- 冷凍食材を使う場合は解凍工程を明記してください
- 各手順に調理方法を割り当ててください
- 使用した在庫の ID を sourceItemId に必ず記載してください
- 分量が数値で確定できる場合は deductQuantity / deductUnit を埋め、
  「適量」「少々」の場合は null にしてください
```

### 15.2 `effortMode` の翻訳

抽象的な形容詞のまま渡すと効きが弱いため、具体的な制約に翻訳する。

| モード | プロンプトに埋め込む制約 |
|---|---|
| `EASY` | 調理時間 20 分以内 / 工程 3 つまで / 特殊な調理器具を使わない / 洗い物を少なく |
| `ELABORATE` | 調理時間の制約なし / 下ごしらえや漬け込みを含めてよい / 複数の調理法を組み合わせてよい |

### 15.3 保存場所と調理方法の連動

条件分岐は書かない。`storageType` を渡せば LLM が自然に処理する（冷凍 → 解凍工程、常温 → そのまま調理など）。

### 15.4 出力スキーマ（Zod / `packages/shared`）

```ts
export const GeneratedIngredientSchema = z.object({
  name: z.string(),
  amountText: z.string(),                       // "200g" / "適量"
  sourceItemId: z.string().nullable(),
  deductQuantity: z.number().nullable(),
  deductUnit: UnitSchema.nullable(),
});

export const GeneratedStepSchema = z.object({
  order: z.number().int(),
  instruction: z.string(),
  method: CookMethodSchema,
});

export const GeneratedRecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  estimatedMin: z.number().int(),
  ingredients: z.array(GeneratedIngredientSchema),
  steps: z.array(GeneratedStepSchema),
});

export const RecipeListSchema = z.object({
  recipes: z.array(GeneratedRecipeSchema).length(3),
});
```

`mealType` / `effortMode` は入力値なので LLM に返させず、サーバー側で付与する。

### 15.5 生成失敗時の扱い

| ケース | 扱い |
|---|---|
| Zod バリデーション失敗 | AI SDK の自動リトライに委ねる |
| LLM タイムアウト（60〜90 秒） | 明示的にエラーを返し、UI で再試行を促す |
| **在庫が 0 件** | **生成せず「食材を追加してください」を返す（LLM を叩かない）** |

## 16. 調理フロー

### 16.1 `GET /recipes/:id/cook-plan`

1. `RecipeIngredient` を走査
2. `sourceItemId` から現在の `InventoryItem` を引く
3. 3 分類に振り分ける

| 条件 | 分類 | UI |
|---|---|---|
| 在庫が存在 かつ `deductQuantity != null` かつ `deductUnit == item.unit` | `SUGGESTED` | チェック ON、数値プリセット |
| 在庫が存在 かつ（`deductQuantity == null` または単位不一致） | `MANUAL` | チェック OFF、数値入力欄を空で表示 |
| 在庫が存在しない | `NOT_FOUND` | グレーアウト、操作不可 |

```json
{
  "items": [
    { "ingredientId": "ing_1", "name": "豚バラ肉", "itemId": "itm_a1",
      "currentQuantity": 300, "unit": "GRAM",
      "suggestedDeduction": 200, "status": "SUGGESTED" },
    { "ingredientId": "ing_4", "name": "醤油", "itemId": "itm_d1",
      "currentQuantity": 1, "unit": "PACK",
      "suggestedDeduction": null, "status": "MANUAL" },
    { "ingredientId": "ing_5", "name": "ごま油", "itemId": null,
      "status": "NOT_FOUND" }
  ]
}
```

### 16.2 `POST /recipes/:id/cook`

```json
{ "deductions": [ { "itemId": "itm_a1", "quantity": 200 } ] }
```

**1 トランザクション内**で実行：

1. 各 `itemId` の `quantity` を減算
2. 減算後 0 以下になった `InventoryItem` を削除
3. `Recipe.cookedCount` をインクリメント、`lastCookedAt` を更新
4. `CookLog` を作成

> **名前による在庫マッチングは行わない。** 表記ゆれ（豚バラ / 豚ばら肉 / 豚バラスライス）で必ず外れるため、`sourceItemId` のみを信頼する。

### 16.3 設計上の 3 つの壁と対処

| 壁 | 対処 |
|---|---|
| 「適量」「少々」は減算できない | 表示用 `amountText` と減算用 `deductQuantity` を分離。null は対象外 |
| レシピ材料と在庫カードの対応付け | 生成時にプロンプトへ在庫 ID を渡し、`sourceItemId` を返させる |
| 単位の不一致（200g vs 1パック） | 単位一致時のみ数値を提案。不一致なら手動入力欄 |

## 17. 認証

**Firebase Authentication** を採用。

- Cloud Run と同一 GCP プロジェクト内で完結
- 発行される JWT を Hono ミドルウェアで検証
- React Native SDK が成熟しており、モバイル移行時に手戻りがない
- 無料枠が広い

### 実装方針

- 認証情報は Firebase、アプリデータは Cloud SQL に分離される
- `User.authUid` に Firebase UID を保持
- **初回ログイン時に `User` レコードを JIT 作成**（`POST /auth/session`）
- API は `Authorization: Bearer <idToken>` を検証する

---

# Part III — テスト方針

## 18. テスト戦略

テストランナーは **Vitest**。

### 18.1 大方針：コロケーション

Feature-First を採っているため、`tests/` に別ツリーを作るとミラー構造の二重メンテになる。**テストは実装の隣に置く。**

```
recipe/
├── application/
│   ├── suggest-recipes.ts
│   └── suggest-recipes.test.ts   ← 隣
```

feature をまるごと削除したとき、テストも一緒に消えるのが理想。

### 18.2 レイヤーごとの戦略

**切った 2 つの境界（LLM ポート / ORM 境界）が、そのままテスト戦略を決めている。**

| レイヤー | 何をテストするか | 依存 | 速度 |
|---|---|---|---|
| `domain/` | 純粋なルール（期限判定、減算案の分類） | なし | 最速 |
| `application/` | ユースケースの流れ | **スタブ注入**（DB も LLM も不要） | 速い |
| `infrastructure/` (ORM) | リポジトリのマッピング | 実 DB | 遅い |
| `infrastructure/` (LLM) | **マッピングのみ**（生成内容は対象外） | fixture | 速い |
| `presentation/` | ルーティング・認可・バリデーション | `app.request()` | 速い |

### 18.3 ファイル構成

```
apps/api/src/features/recipe/
├── domain/
│   ├── recipe.ts
│   ├── cook-plan.ts                     # 減算案の3分類ロジック（純粋関数）
│   ├── cook-plan.test.ts                # ★ 最重要
│   └── recipe-generator.ts              # ポート（テスト対象なし）
├── application/
│   ├── suggest-recipes.ts
│   ├── suggest-recipes.test.ts
│   ├── cook-recipe.ts
│   └── cook-recipe.test.ts
├── infrastructure/
│   ├── stub-generator.ts                # ★ テストファイルではない（18.4 参照）
│   ├── ai-sdk-generator.ts
│   ├── ai-sdk-generator.test.ts         # マッピングのみ
│   ├── prisma-recipe-repository.ts
│   └── prisma-recipe-repository.int.test.ts
├── presentation/
│   ├── routes.ts
│   └── routes.int.test.ts
└── __fixtures__/
    └── generated-recipe.json
```

**命名規約：`*.int.test.ts` = 実 DB が必要なもの。** それ以外は `*.test.ts`。CI の分割に使う。

### 18.4 スタブは `__mocks__` に置かない

`RecipeGenerator` / `InventoryRepository` のスタブは、**プロダクションコードとして** `infrastructure/` に置く。テスト以外に用途があるため。

- ローカル開発で UI を触るとき（トークンを消費しない）
- `USE_STUB_LLM=true` で起動すれば API キーなしで動く

orval の MSW モックを検討した動機と同じで、「LLM を叩かずに開発できる状態」自体に価値がある。

### 18.5 LLM のテスト：内容はテストしない

**LLM の出力内容をテストしない。** 毎回変わる・遅い・課金される。

テストするのは**マッピングのみ**。

```ts
// ai-sdk-generator.test.ts
import fixture from '../__fixtures__/generated-recipe.json';

it('生成結果をドメインエンティティに変換できる', () => {
  const recipes = toDomain(fixture, { mealType: 'DINNER', effortMode: 'EASY' });

  expect(recipes[0].ingredients[0].deductQuantity).toBe(200);
  expect(recipes[0].steps[0].method).toBe('THAW');
});
```

`generateObject` の呼び出しは `vi.mock('ai')` でモックし、「Zod スキーマ通りの JSON が来たら正しくドメインに変換できるか」だけを見る。

#### 「テスト」と「評価」を混ぜない

| | テスト | 評価（Eval） |
|---|---|---|
| 性質 | 決定的 | 確率的 |
| 実行場所 | Vitest / CI | **Langfuse** |
| 頻度 | 毎コミット | プロンプト変更時に手動 |
| 見るもの | コードが正しいか | レシピが美味しそうか |

「在庫にない材料が混ざらないか」「お手軽モードで工程 3 つ以内か」といった品質チェックは **Langfuse の Dataset + LLM-as-a-Judge** の仕事。CI に入れると不安定なテストになる。

> これが Langfuse を初日から導入する理由のひとつ。

### 18.6 `application/` が主戦場

ポートを切ったため、DB も LLM も無しでユースケースを検証できる。**ここに一番時間を使う。**

```ts
// suggest-recipes.test.ts
it('在庫が0件なら LLM を呼ばずにエラーを返す', async () => {
  const generator = new StubRecipeGenerator();
  const spy = vi.spyOn(generator, 'generate');
  const useCase = new SuggestRecipes(new InMemoryInventoryRepository([]), generator);

  await expect(useCase.execute({ userId, mealType: 'DINNER', effortMode: 'EASY' }))
    .rejects.toThrow(EmptyInventoryError);
  expect(spy).not.toHaveBeenCalled();   // ← 課金防止の回帰テスト
});
```

**「無駄に LLM を叩いていないか」を CI で検証できる**のが大きい。うっかり課金する変更を止められる。

### 18.7 `packages/shared` の純粋関数

期限バッジ判定と ± ボタンの刻み幅は、**Web とモバイルの両方で使う**ため `packages/shared` に純粋関数として置く。UI に埋め込まないこと。

```ts
// packages/shared/src/expiry.ts
export function getExpiryStatus(
  item: { expiryDate?: Date; expiryType?: ExpiryType },
  today: Date,                            // ★ 引数で受け取る
): 'EXPIRED' | 'URGENT' | 'WARNING' | 'NORMAL' | 'NONE'
```

```ts
it.each([
  ['CONSUME_BY',  -1, 'EXPIRED'],
  ['CONSUME_BY',   2, 'URGENT'],
  ['BEST_BEFORE',  2, 'WARNING'],
  ['BEST_BEFORE', 10, 'NORMAL'],
])('%s / %d日後 → %s', (type, days, expected) => { ... });
```

**`new Date()` を関数内で呼ばない。** テストで日付をモックする羽目になる。

### 18.8 Vitest の設定

#### ⚠️ `vitest.workspace.ts` は使わない

workspace は Vitest 3.2 で非推奨となり `projects` 設定に置き換わった（機能は同じ）。

```ts
// vitest.config.ts（リポジトリルート）
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*'],
    coverage: { provider: 'v8' },   // ← カバレッジはルートに書く
  },
});
```

**注意：`projects` を使うと各パッケージの config がルート config を extends できない**（projects 設定ごと継承してしまうため）。共通設定は `vitest.shared.ts` に切り出す。

```ts
// apps/api/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import { shared } from '../../vitest.shared';

export default mergeConfig(shared, defineConfig({
  test: { name: 'api', environment: 'node' },
}));
```

`apps/web` は `environment: 'happy-dom'`。

#### unit / integration の分割

**projects のネストは避ける**（モノレポの projects と組み合わせると不安定）。ファイル名規約 + CLI で分ける。

```json
{
  "scripts": {
    "test":       "vitest run --exclude '**/*.int.test.ts'",
    "test:int":   "vitest run '**/*.int.test.ts'",
    "test:watch": "vitest --exclude '**/*.int.test.ts'"
  }
}
```

### 18.9 DB を使うテスト

`docker compose` で Postgres を上げ、`globalSetup` でマイグレーションを流す。Testcontainers は起動が遅く、個人開発では過剰。

各テスト後のトランザクションロールバックではなく、`beforeEach` で truncate するほうが Prisma では素直。

```ts
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "CookLog","RecipeIngredient","RecipeStep","Recipe","InventoryItem","User" CASCADE'
  );
});
```

### 18.10 ルーティングのテスト

Hono はサーバーを起動せずテストできる。

```ts
const res = await app.request('/recipes/suggest', {
  method: 'POST',
  headers: { Authorization: `Bearer ${testToken}` },
  body: JSON.stringify({ mealType: 'DINNER', effortMode: 'EASY' }),
});
expect(res.status).toBe(200);
```

**認可のテストは必ず書く。** 「他ユーザーの在庫が取れてしまう」は個人開発で最も起きやすく、最も痛いバグ。

```ts
it('他ユーザーのレシピは404', async () => {
  const res = await app.request(`/recipes/${otherUsersRecipeId}`, { headers: userAHeaders });
  expect(res.status).toBe(404);   // 403 ではなく 404（存在を漏らさない）
});
```

### 18.11 書かないテスト

個人開発で時間を溶かさないための除外リスト。

- **Prisma 自体の動作**（`findMany` が動くかは Prisma の責務）
- **単純な CRUD の通過確認**（`PATCH /inventory/:id` で name が変わる、程度）
- **LLM の出力品質**（Langfuse の仕事）
- **UI のスナップショット**（壊れやすく、直す作業が無価値）
- **網羅的なバリデーション**（Zod が保証する）

### 18.12 着手優先順位

まずこの 4 つだけ書けば十分。

| 優先 | 対象 | 理由 |
|---|---|---|
| 1 | `packages/shared` の純粋関数（期限判定、刻み幅） | Web / モバイル両方で使う。最も安く最も効く |
| 2 | `cook-plan` の 3 分類ロジック | **仕様が最も複雑**（単位不一致 / 在庫削除済み / 数量不明） |
| 3 | `cook-recipe` のトランザクション | 減算・0 削除・`cookedCount` の整合性 |
| 4 | 認可（他ユーザーのデータにアクセスできないこと） | 事故ったときの被害が最大 |

---

# Part IV — サマリ

## 19. 決定事項一覧

### アーキテクチャ

| 論点 | 決定 |
|---|---|
| リポジトリ名 | `stockpot` |
| リポジトリ構成 | モノレポ（pnpm workspace + Turborepo） |
| 言語 | TypeScript 統一 |
| バックエンド | Hono on Cloud Run |
| フロントエンド | Next.js |
| ORM | Prisma 7 |
| DB | Cloud SQL (PostgreSQL) |
| API 定義 | `@hono/zod-openapi` |
| API クライアント | `hc`（`packages/api-client` でラップ） |
| 認証 | Firebase Authentication（トークンベース） |
| LLM | Vercel AI SDK（Phase 1）→ Mastra（Phase 2） |
| 観測 / 評価 | Langfuse Cloud（セルフホストしない） |
| レシピ生成方式 | 同期リクエスト |
| アーキテクチャ | Feature-First + LLM / ORM の 2 境界のみ厳守 |
| テスト | Vitest。実装にコロケーション。`*.int.test.ts` で DB 依存を分離 |
| LLM の検証 | 出力内容はテストしない（マッピングのみ）。品質評価は Langfuse |

### 仕様

| 論点 | 決定 |
|---|---|
| 在庫の数量表現 | `quantity` + `unit` に統一（グラム数の別カラムを持たない） |
| 期限 | `expiryDate` + `expiryType`（消費 / 賞味を種別で区別） |
| カンバンの並び替え | 手動並び替えなし。期限昇順の自動ソート |
| レシピ材料 | 生成時点のスナップショット（在庫への FK にしない） |
| 調理後の在庫減算 | 方式 C（減算候補を提示 → ユーザーが確定） |
| 生成トリガー | 朝食 / 昼食 / 夕食 × お手軽 / 本格 |

## 20. 未確定・将来検討

| 項目 | メモ |
|---|---|
| **在庫の入力コスト** | **最大の離脱要因になりうる。** 買い物のたびに 10 品目を手入力するのは重い。よく買う食材のテンプレート登録が軽くて効果的 |
| 買い物リスト | 在庫が 0 になった食材を自動で積む案 |
| 献立プランニング（複数日） | Phase 2（Mastra）の主要ユースケース候補 |
| 会話による絞り込み | Phase 2。永続メモリが必要 |
| レシピの手動編集 | 生成結果に手を入れたい需要は出る可能性が高い |
| レシート OCR による一括入力 | 入力コスト問題への本命の解 |
| モバイル版のカンバン | 3 列横並びは幅が足りない。タブ切り替えを想定 |
