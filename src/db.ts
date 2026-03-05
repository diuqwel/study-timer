import { openDB } from "idb";
import type { Session } from "./types";

const DB_NAME = "study_timer_db";
const STORE_NAME = "sessions";

export const dbPromise = openDB(DB_NAME, 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("start", "start");
      store.createIndex("tag", "tag");
    }
  },
});

// セッションを追加する関数
export async function addSession(session: Session) {
  const db = await dbPromise;
  await db.put(STORE_NAME, session);
}

// すべてのセッションを取得する関数
export async function getAllSessions(): Promise<Session[]> {
  const db = await dbPromise;
  return db.getAll(STORE_NAME);
}

// セッションを削除する関数
export async function deleteSession(id: string) {
  const db = await dbPromise;
  await db.delete(STORE_NAME, id);
}