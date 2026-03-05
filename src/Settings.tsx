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

  const handleSave = () => {
    // 💡 通知設定はApp.tsx側に移したので、既存の値をそのまま保持します
    onSave({ 
      level1, 
      level2, 
      level3, 
      notificationInterval: currentSettings.notificationInterval 
    });
    onClose(); 
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1>アプリ設定</h1>
        
        {/* --- カレンダー設定 --- */}
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

        <div style={{ marginTop: "30px", display: "flex", gap: "10px" }}>
          <button className="btn-primary" onClick={handleSave}>設定を保存</button>
          <button onClick={onClose}>キャンセル</button>
        </div>

        {/* 💡 ソフトのバージョン情報を追加 */}
        <div style={{ marginTop: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
          <p>Study Timer</p>
          <p>Version 1.0.1</p>
        </div>
      </div>
    </div>
  );
}