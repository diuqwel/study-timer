import { useState, useEffect, useMemo } from "react";
import { useSessions } from "./hooks/useSessions";
import { useSettings } from "./hooks/useSettings";
import { calculateTotal, groupByTag, filterSessions } from "./analytics";
import { exportSessionsToCSV } from "./csvExport";
import { Calendar } from "./Calendar";
import { Settings } from "./Settings";
import type { Session } from "./types";
import "./App.css"; // 💡 さっき作ったスタイルシートを読み込む！
import { parseCSV } from "./csvImport";
import { useNotification } from "./hooks/useNotification"; // 💡 追加
import { scheduleIcsNotification } from "./utils/ics";

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return "0時間 0分";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}時間 ${minutes}分`;
}

function toLocalISOString(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateString(ms: number) {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDateRange(period: "all" | "today" | "week" | "month") {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

  if (period === "all") return { from: 0, to: Infinity };
  if (period === "today") return { from: startOfDay, to: endOfDay };
  
  if (period === "week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1; 
    const startOfWeek = startOfDay - diffToMonday * 24 * 60 * 60 * 1000;
    const endOfWeek = startOfWeek + 7 * 24 * 60 * 60 * 1000 - 1;
    return { from: startOfWeek, to: endOfWeek };
  } else { 
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    return { from: startOfMonth, to: endOfMonth };
  }
}

const RUNNING_KEY = "study_timer_running";

export default function App() {
  const { sessions, handleAddSession, handleUpdateSession, handleDeleteSession } = useSessions();
  const { settings, saveSettings } = useSettings();

  const [currentView, setCurrentView] = useState<"main" | "settings">("main");
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [tag, setTag] = useState("研究");
  const [period, setPeriod] = useState<"all" | "today" | "week" | "month">("today");

  const [exportTag, setExportTag] = useState("all");
  const [exportMonth, setExportMonth] = useState("all");

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ startStr: "", endStr: "", tag: "", memo: "" });

  const [historyFilterTag, setHistoryFilterTag] = useState("all");
  const [historyFilterDate, setHistoryFilterDate] = useState("");
  // 💡 追加：プルダウンの選択肢
  const intervalOptions = [10, 20, 30, 40, 50, 60, 120, 180, 240, 300, 360];

  const uniqueTags = useMemo(() => {
    return Array.from(new Set(sessions.map(s => s.tag)));
  }, [sessions]);

  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    sessions.forEach(s => {
      const d = new Date(s.start);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthStr);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [sessions]);

const [memo, setMemo] = useState(""); // 💡 メモ用の状態を追加

// 💡 変更：選んだ時間に応じて通知をセットする
  function handleNotifyClick() {
    const notifyTime = new Date();
    // settings に保存されている時間を使う
    notifyTime.setMinutes(notifyTime.getMinutes() + settings.notificationInterval); 
    
    scheduleIcsNotification(`${settings.notificationInterval}分経過しました！アプリを開いてください`, notifyTime);
  }
  // 💡 追加：プルダウンを変えたら設定を保存する関数
  function handleIntervalChange(newInterval: number) {
    saveSettings({ ...settings, notificationInterval: newInterval });
  }

  // 💡 記憶の復元時
  useEffect(() => {
    const saved = localStorage.getItem(RUNNING_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setStartTime(parsed.startTime);
      setTag(parsed.tag);
      setMemo(parsed.memo || ""); // 💡 メモも復元
      setIsRunning(true);
    }
  }, []);

const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const importedData = await parseCSV(text);

      if (importedData.length === 0) {
        alert("有効なデータが見つかりませんでした。CSVの形式を確認してください。");
        return;
      }

      // 1件ずつDBに追加（IDは新規発行する）
      for (const data of importedData) {
        await handleAddSession({
          id: crypto.randomUUID(),
          start: data.start!,
          end: data.end!,
          tag: data.tag!,
          memo: data.memo
        });
      }
      alert(`${importedData.length} 件のデータをインポートしました！`);
      e.target.value = ""; // 選択をリセット
    };
    reader.readAsText(file);
  };

  useNotification(isRunning, startTime, settings.notificationInterval);
async function handleStart() {
    if (isRunning) return;
    const now = Date.now();
    setStartTime(now);
    setIsRunning(true);
    // 💡 記録開始時にメモも保存
    localStorage.setItem(RUNNING_KEY, JSON.stringify({ startTime: now, tag, memo }));
  }
 
async function handleStop() {
    if (!isRunning || !startTime) return;
    const session: Session = {
      id: crypto.randomUUID(),
      start: startTime,
      end: Date.now(),
      tag,
      memo, // 💡 完了データにメモを含める
    };
    await handleAddSession(session);
    setIsRunning(false);
    setStartTime(null);
    setMemo(""); // 💡 終了したらクリア
    localStorage.removeItem(RUNNING_KEY);
  }

  // 💡 入力中のメモを保存する
  function handleMemoChange(newMemo: string) {
    setMemo(newMemo);
    if (isRunning && startTime) {
      localStorage.setItem(RUNNING_KEY, JSON.stringify({ startTime, tag, memo: newMemo }));
    }
  }

  async function handleResume(session: Session) {
    if (isRunning) {
      alert("すでに別の記録が進行中です。先にそちらを終了してください。");
      return;
    }
    setStartTime(session.start);
    setTag(session.tag);
    setIsRunning(true);
    localStorage.setItem(RUNNING_KEY, JSON.stringify({ startTime: session.start, tag: session.tag }));
    await handleDeleteSession(session.id);
  }


  // 💡 編集開始時にメモもセットする
  function startEdit(session: Session) {
    setEditingSessionId(session.id);
    setEditData({
      startStr: toLocalISOString(new Date(session.start)),
      endStr: toLocalISOString(new Date(session.end)),
      tag: session.tag,
      memo: session.memo || "" // 💡 追加
    });
  }

// 💡 保存時にメモもDBへ送る
  async function saveEdit() {
    if (!editingSessionId) return;
    const updatedSession: Session = {
      id: editingSessionId,
      start: new Date(editData.startStr).getTime(),
      end: new Date(editData.endStr).getTime(),
      tag: editData.tag,
      memo: editData.memo // 💡 追加
    };
    await handleUpdateSession(updatedSession);
    setEditingSessionId(null);
  }

  function handleTagChange(newTag: string) {
    setTag(newTag);
    if (isRunning && startTime) {
      localStorage.setItem(RUNNING_KEY, JSON.stringify({ startTime, tag: newTag }));
    }
  }

  const handleExportCSV = () => {
    let targetSessions = sessions;
    if (exportTag !== "all") targetSessions = targetSessions.filter(s => s.tag === exportTag);
    if (exportMonth !== "all") {
      targetSessions = targetSessions.filter(s => {
        const d = new Date(s.start);
        const sessionMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return sessionMonth === exportMonth;
      });
    }
    exportSessionsToCSV(targetSessions);
  };

  if (currentView === "settings") {
    return <Settings currentSettings={settings} onSave={saveSettings} onClose={() => setCurrentView("main")} />;
  }

  const todayRange = getDateRange("today");
  const todayTotal = calculateTotal(sessions, todayRange.from, todayRange.to);
  const monthRange = getDateRange("month");
  const thisMonthTotal = calculateTotal(sessions, monthRange.from, monthRange.to);
  const { from, to } = getDateRange(period);
  const filteredSessions = filterSessions(sessions, from, to);
  const tagTotals = groupByTag(filteredSessions);

  const displayedHistory = filteredSessions.filter(s => {
    if (historyFilterTag !== "all" && s.tag !== historyFilterTag) return false;
    if (historyFilterDate !== "" && toDateString(s.start) !== historyFilterDate) return false;
    return true;
  });

  return (
    <div className="app-container">
      <header className="header">
        <h1>研究時間記録</h1>
        <button onClick={() => setCurrentView("settings")}>⚙️ 設定</button>
      </header>

      {/* 💡 コントロールパネル（開始・終了） */}
<div className="card">
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input value={tag} onChange={(e) => handleTagChange(e.target.value)} placeholder="タグ" list="tag-options" />
          
          {/* 💡 メモ入力欄の追加 */}
          <textarea 
            value={memo} 
            onChange={(e) => handleMemoChange(e.target.value)} 
            placeholder="今回の作業メモ（気づき、課題など）"
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", minHeight: "60px" }}
          />
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn-primary" onClick={handleStart} disabled={isRunning}>▶ 開始</button>
            <button onClick={handleStop} disabled={!isRunning}>■ 終了</button>
          </div>
          {/* 💡 変更：左にボタン、右に時間を並べる */}
          <div style={{ marginTop: "10px", display: "flex", gap: "10px", alignItems: "center" }}>
            <button 
              className="btn-secondary" 
              onClick={handleNotifyClick}
              style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#fff" }}
            >
              ⏰ 通知を予約
            </button>
            
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <select 
                value={settings.notificationInterval} 
                onChange={e => handleIntervalChange(Number(e.target.value))}
                style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px", backgroundColor: "#fff" }}
              >
                {intervalOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}分後</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {isRunning && (
        <div className="recording-indicator">
          <div className="recording-dot"></div>
          記録中...
        </div>
      )}

      {/* 💡 ダッシュボード */}
      <div className="stats-grid">
        <div className="stat-card">
          <h2>本日の合計時間</h2>
          <p className="today-val">{formatDuration(todayTotal)}</p>
        </div>
        <div className="stat-card">
          <h2>今月の合計時間</h2>
          <p className="month-val">{formatDuration(thisMonthTotal)}</p>
        </div>
      </div>

      {/* 💡 カレンダー */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Calendar内部のstyleはそのままでも、外側の枠をcardにすることで綺麗に収まります */}
        <div style={{ padding: "0 10px" }}>
          <Calendar sessions={sessions} settings={settings} />
        </div>
      </div>

      {/* 💡 タグ別集計とCSV出力 */}
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3 style={{ margin: 0 }}>タグ別集計</h3>
            <select value={period} onChange={(e) => setPeriod(e.target.value as any)}>
              <option value="today">今日</option>
              <option value="week">今週</option>
              <option value="month">今月</option>
              <option value="all">すべて</option>
            </select>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {Object.entries(tagTotals).map(([tagName, totalTime]) => (
              <li key={tagName} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
                <span className="history-tag">{tagName}</span>
                <strong>{formatDuration(totalTime)}</strong>
              </li>
            ))}
            {Object.keys(tagTotals).length === 0 && <li style={{ color: "#999" }}>データなし</li>}
          </ul>
        </div>

        <div className="card">
          <h3 style={{ margin: "0 0 15px 0" }}>データ出力 (CSV)/ 入力 (CSV)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <select value={exportTag} onChange={e => setExportTag(e.target.value)}>
              <option value="all">すべてのタグ</option>
              {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={exportMonth} onChange={e => setExportMonth(e.target.value)}>
              <option value="all">すべての月</option>
              {uniqueMonths.map(m => <option key={m} value={m}>{m.replace("-", "年")}月</option>)}
            </select>
<button onClick={handleExportCSV} disabled={sessions.length === 0} style={{ flex: 1 }}>
              ↓ CSV出力
            </button>
            
            {/* 💡 インポートボタン（見た目はボタン、中身はファイル選択） */}
            <label className="btn-secondary" style={{
              flex: 1, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              cursor: "pointer",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontWeight: 600,
              fontSize: "14px",
              backgroundColor: "#fff"
            }}>
              ↑ CSV読込
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleImportCSV} 
                style={{ display: "none" }} 
              />
            </label>
          </div>
        </div>
      </div>

      {/* 💡 履歴 */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
          <h3 style={{ margin: 0 }}>履歴</h3>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select value={historyFilterTag} onChange={e => setHistoryFilterTag(e.target.value)}>
              <option value="all">すべてのタグ</option>
              {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input 
              type="date" 
              value={historyFilterDate} 
              onChange={e => {
                setHistoryFilterDate(e.target.value);
                setPeriod("all");
              }} 
            />
            <button onClick={() => { setHistoryFilterTag("all"); setHistoryFilterDate(""); }}>クリア</button>
          </div>
        </div>

<ul className="history-list" style={{ maxHeight: "500px", overflowY: "auto" }}>
          {displayedHistory.map((s) => {
            if (editingSessionId === s.id) {
              return (
                <li key={s.id} style={{ backgroundColor: "#fffbea", flexDirection: "column", alignItems: "stretch" }}>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
                    <input type="datetime-local" value={editData.startStr} onChange={e => setEditData({...editData, startStr: e.target.value})} />
                    <span>〜</span>
                    <input type="datetime-local" value={editData.endStr} onChange={e => setEditData({...editData, endStr: e.target.value})} />
                    <input value={editData.tag} onChange={e => setEditData({...editData, tag: e.target.value})} placeholder="タグ" />
                  </div>
                  
                  {/* 💡 編集モード用のメモ入力欄 */}
                  <textarea 
                    value={editData.memo} 
                    onChange={e => setEditData({...editData, memo: e.target.value})}
                    placeholder="メモを編集..."
                    style={{ width: "100%", marginBottom: "10px", minHeight: "60px", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  />

                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <button className="btn-primary" onClick={saveEdit}>保存</button>
                    <button onClick={() => setEditingSessionId(null)}>キャンセル</button>
                  </div>
                </li>
              );
            }

            return (
              <li key={s.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: s.memo ? "10px" : "0" }}>
                  <div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "2px" }}>
                      {new Date(s.start).toLocaleString()} - {new Date(s.end).toLocaleString()}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className="history-tag">{s.tag}</span>
                      <strong style={{ fontSize: "16px" }}>{formatDuration(s.end - s.start)}</strong>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => handleResume(s)}>再開</button>
                    <button onClick={() => startEdit(s)}>編集</button>
                    <button className="btn-danger" onClick={() => handleDeleteSession(s.id)}>削除</button>
                  </div>
                </div>

                {/* 💡 メモがある場合だけ表示するセクション */}
                {s.memo && (
                  <div className="history-memo">
                    {s.memo}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}