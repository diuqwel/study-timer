export type SessionId = string;

export type Session = {
  id: SessionId;
  start: number;
  end: number;
  tag: string;
  memo?: string; // 💡 追加：任意入力のメモ
};

export type RunningSession = {
  start: number;
  tag: string;
  memo: string; // 💡 追加
};