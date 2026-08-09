import { getExpiryStatus, stepFor, type StorageType } from "@stockpot/shared";

/**
 * カンバン（メイン画面）のスケルトン（設計書 §13.1）。
 *
 * 期限バッジ判定・± ボタンの刻み幅は packages/shared の純粋関数を使う
 * （UI に埋め込まない / 設計書 §18.7）。dnd-kit による列またぎの D&D、
 * API 連携（@stockpot/api-client）は Phase 1 実装で追加する。
 */
const COLUMNS: { key: StorageType; label: string }[] = [
  { key: "PANTRY", label: "常温" },
  { key: "FRIDGE", label: "冷蔵" },
  { key: "FREEZER", label: "冷凍" },
];

export default function HomePage() {
  const today = new Date();
  // 表示確認用のダミー。実データは @stockpot/api-client 経由で取得する。
  const badge = getExpiryStatus(
    { expiryDate: today, expiryType: "CONSUME_BY" },
    today,
  );

  return (
    <main style={{ padding: 24 }}>
      <h1>stockpot</h1>
      <p>在庫カンバン（骨組み）。期限バッジ例: {badge} / GRAM 刻み幅: {stepFor("GRAM")}</p>
      <div style={{ display: "flex", gap: 16 }}>
        {COLUMNS.map((col) => (
          <section
            key={col.key}
            style={{ flex: 1, border: "1px solid #ddd", borderRadius: 8, padding: 12 }}
          >
            <h2>{col.label}</h2>
            <p style={{ color: "#888" }}>（カード一覧）</p>
            <button>+ 追加</button>
          </section>
        ))}
      </div>
    </main>
  );
}
