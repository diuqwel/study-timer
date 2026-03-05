import { useState, useEffect } from "react";

export function useNotification(
  isRunning: boolean,
  startTime: number | null,
  intervalMinutes: number
) {
  const [lastNotifiedTime, setLastNotifiedTime] = useState<number>(0);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!isRunning || !startTime) {
      setLastNotifiedTime(0);
      return;
    }

    // 💡 検査時間（チェックの間隔）を10分に変更
    // 1000ms * 60s * 10m = 600,000ms
    const CHECK_INTERVAL = 1000 * 60 * 10;

    const timer = setInterval(() => {
      const elapsedMinutes = Math.floor((Date.now() - startTime) / (1000 * 60));

      // 💡 経過時間が設定値（例：10分, 20分...）に達しているかチェック
      if (
        elapsedMinutes >= intervalMinutes && 
        elapsedMinutes % intervalMinutes === 0 && 
        elapsedMinutes !== lastNotifiedTime
      ) {
        triggerNotification(elapsedMinutes);
        setLastNotifiedTime(elapsedMinutes);
      }
    }, CHECK_INTERVAL);

    return () => clearInterval(timer);
  }, [isRunning, startTime, intervalMinutes, lastNotifiedTime]);

  const triggerNotification = (minutes: number) => {
    if (Notification.permission === "granted") {
      new Notification("研究タイマー", {
        body: `作業開始から ${minutes} 分経過しました。進捗はいかがですか？`,
        tag: "study-timer-alert",
        silent: false // 音を鳴らす場合はここを制御
      });
    }
  };

  return { triggerNotification };
}