import { useState, useEffect } from "react";
import { getAllSessions, addSession, deleteSession } from "../db";
import type { Session } from "../types";

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);

  const refresh = async () => {
    const data = await getAllSessions();
    // 💡 履歴が新しい順（降順）に並ぶように並び替える
    data.sort((a, b) => b.start - a.start);
    setSessions(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleAddSession = async (session: Session) => {
    await addSession(session);
    await refresh();
  };

  // 💡 追加：セッションを上書き（編集）する機能
  const handleUpdateSession = async (session: Session) => {
    await addSession(session); // IndexedDBは同じIDなら上書きされる
    await refresh();
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    await refresh();
  };

  return {
    sessions,
    handleAddSession,
    handleUpdateSession,
    handleDeleteSession,
  };
}