import type { Session } from "./types";

export function exportSessionsToCSV(sessions: Session[]) {
  // ヘッダー行に読みやすい形式の列を追加
  const header = "id,start_ms,end_ms,start_datetime,end_datetime,tag,duration_ms\n";

  // データ行の作成
  const rows = sessions.map(s => {
    const duration = s.end - s.start;
    const safeTag = `"${s.tag.replace(/"/g, '""')}"`;
    
    // 読みやすい形式に変換
    const startDatetime = `"${new Date(s.start).toLocaleString()}"`;
    const endDatetime = `"${new Date(s.end).toLocaleString()}"`;

    return `${s.id},${s.start},${s.end},${startDatetime},${endDatetime},${safeTag},${duration}`;
  }).join("\n");

  // Excel等での文字化け防止策（BOM付き）
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([bom, header + rows], { type: "text/csv" });

  // ダウンロードの実行
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `study_sessions_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}