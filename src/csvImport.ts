import type { Session } from "./types";

/**
 * CSVの文字列を解析してSession配列に変換する
 * CSV形式想定: 開始, 終了, 合計時間, タグ, メモ
 */
export async function parseCSV(text: string): Promise<Partial<Session>[]> {
  const lines = text.split("\n");
  const sessions: Partial<Session>[] = [];

  // 1行目はヘッダー（項目名）なので、2行目から処理する
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // カンマで分割（メモの中にカンマがある場合を考慮した簡易版）
    const parts = line.split(",");
    
    // 最低限「開始」「終了」「タグ」があれば取り込む
    if (parts.length >= 4) {
      const start = new Date(parts[0]).getTime();
      const end = new Date(parts[1]).getTime();
      const tag = parts[3];
      const memo = parts[4] || ""; // メモは空でもOK

      // 日付が正しく解析できた場合のみ追加
      if (!isNaN(start) && !isNaN(end)) {
        sessions.push({
          start,
          end,
          tag,
          memo
        });
      }
    }
  }
  return sessions;
}