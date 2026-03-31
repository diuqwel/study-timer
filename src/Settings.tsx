import { useState } from "react";
import type { ThresholdSettings } from "./hooks/useSettings";

type Props = {
  currentSettings: ThresholdSettings;
  onSave: (settings: ThresholdSettings) => void;
  onClose: () => void;
};

export function Settings({ currentSettings, onSave, onClose }: Props) {
  const [level1, setLevel1] = useState(currentSettings.level1);
  const [level2, setLevel2] = useState(currentSettings.level2);
  const [level3, setLevel3] = useState(currentSettings.level3);
  
  // 💡 状態管理：保存完了フラグと、元に戻すためのバックアップ
  const [isSaved, setIsSaved] = useState(false);
  const [backup, setBackup] = useState<ThresholdSettings | null>(null);

  const handleSave = () => {
    // 💡 保存前の現在の設定（親コンポーネントの状態）をバックアップとして保持
    setBackup({ ...currentSettings });
    
    onSave({ 
      level1, 
      level2, 
      level3, 
      notificationInterval: currentSettings.notificationInterval 
    });
    
    setIsSaved(true);

    // 💡 3秒経ったらボタンの表示だけを「設定を保存」に戻す
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  const handleUndo = () => {
    if (backup) {
      // 💡 バックアップしていた値を親に送って上書きし直す
      onSave(backup);
      
      // 入力フォームの値もバックアップ時のものに戻す
      setLevel1(backup.level1);
      setLevel2(backup.level2);
      setLevel3(backup.level3);
      
      setIsSaved(false);
      setBackup(null);
    }
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1>アプリ設定</h1>
        
        <section style={{ marginBottom: "30px" }}>
          <h2>カレンダーの色分け（時間）</h2>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "inline-block", width: "160px" }}>レベル1:</label>
            <input type="number" step="0.5" value={level1} onChange={e => setLevel1(Number(e.target.value))} style={{ width: "80px" }} /> 時間未満
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "inline-block", width: "160px" }}>レベル2:</label>
            <input type="number" step="0.5" value={level2} onChange={e => setLevel2(Number(e.target.value))} style={{ width: "80px" }} /> 時間未満
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "inline-block", width: "160px" }}>レベル3:</label>
            <input type="number" step="0.5" value={level3} onChange={e => setLevel3(Number(e.target.value))} style={{ width: "80px" }} /> 時間未満
          </div>
        </section>

        <div style={{ marginTop: "30px", display: "flex", alignItems: "center", gap: "15px" }}>
          {/* 💡 保存ボタンの表示切り替え */}
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={isSaved}
            style={isSaved ? { backgroundColor: "#10b981", boxShadow: "none", border: "none" } : {}}
          >
            {isSaved ? "✅ 保存しました" : "設定を保存"}
          </button>

          {/* 💡 取り消し（Undo）用のアクションを表示 */}
          {isSaved && (
            <button 
              onClick={handleUndo}
              style={{ 
                background: "none", 
                border: "none", 
                color: "#f97316", 
                textDecoration: "underline", 
                cursor: "pointer",
                boxShadow: "none",
                padding: 0
              }}
            >
              取り消す
            </button>
          )}
          
          {!isSaved && <button onClick={onClose}>閉じる</button>}
        </div>

        <div style={{ marginTop: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
          <p>Study Timer</p>
          <p>Version 1.2.0</p>
        </div>
      </div>
    </div>
  );
}