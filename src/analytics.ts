import type { Session } from "./types";

export function calculateTotal(
  sessions: Session[],
  from: number,
  to: number
): number {
  return sessions
    .filter((s) => s.start >= from && s.start <= to)
    .reduce((sum, s) => sum + (s.end - s.start), 0);
}

export function groupByTag(
  sessions: Session[]
): Record<string, number> {
  return sessions.reduce((acc, s) => {
    const duration = s.end - s.start;
    acc[s.tag] = (acc[s.tag] ?? 0) + duration;
    return acc;
  }, {} as Record<string, number>);
}

// 💡 新しく追加：指定した期間のセッションだけを抽出する関数
export function filterSessions(
  sessions: Session[],
  from: number,
  to: number
): Session[] {
  return sessions.filter((s) => s.start >= from && s.start <= to);
}