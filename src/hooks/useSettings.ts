import { useState, useEffect } from "react";

export type ThresholdSettings = {
  level1: number;
  level2: number;
  level3: number;
  notificationInterval: number; // 💡 追加：通知を送る間隔（分）
};

const defaultSettings: ThresholdSettings = { 
  level1: 2, 
  level2: 4, 
  level3: 6,
  notificationInterval: 60 // 💡 デフォルトは60分
};

const SETTINGS_KEY = "study_timer_settings";

export function useSettings() {
  const [settings, setSettings] = useState<ThresholdSettings>(defaultSettings);

  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const saveSettings = (newSettings: ThresholdSettings) => {
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  return { settings, saveSettings };
}