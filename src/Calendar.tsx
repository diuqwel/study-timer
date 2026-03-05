import { useState, useMemo, useEffect } from "react"; // 💡 useEffect を追加
import type { Session } from "./types";
import type { ThresholdSettings } from "./hooks/useSettings";

type Props = {
  sessions: Session[];
  settings: ThresholdSettings;
};

function msToHours(ms: number) {
  return (ms / (1000 * 60 * 60)).toFixed(1);
}

function formatDuration(ms: number): string {
  if (!ms) return "0時間 0分";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}時間 ${minutes}分`;
}

function getColor(ms: number, settings: ThresholdSettings) {
  if (!ms || ms === 0) return "#ebedf0";
  const hours = ms / (1000 * 60 * 60);
  if (hours < settings.level1) return "#c6e48b";
  if (hours < settings.level2) return "#7bc96f";
  if (hours < settings.level3) return "#239a3b";
  return "#196127";
}

export function Calendar({ sessions, settings }: Props) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // 💡 追加：入力途中の「文字」を一時的に覚えておく箱
  const [inputYear, setInputYear] = useState(currentDate.getFullYear().toString());
  const [inputMonth, setInputMonth] = useState((currentDate.getMonth() + 1).toString());

  // 💡 追加：「先月・来月」ボタンが押されたら、入力欄の数字もそれに合わせる
  useEffect(() => {
    setInputYear(currentDate.getFullYear().toString());
    setInputMonth((currentDate.getMonth() + 1).toString());
  }, [currentDate]);

  const { weeks, dailyTotals, weeklyTotals } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dailyTotals: Record<string, number> = {};
    sessions.forEach(s => {
      const d = new Date(s.start);
      const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + (s.end - s.start);
    });

    const weeks: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = [];
    const weeklyTotals: number[] = [];
    let currentWeekTotal = 0;

    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      currentWeek.push(date);
      
      const dateKey = `${year}-${month + 1}-${day}`;
      currentWeekTotal += (dailyTotals[dateKey] || 0);

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        weeklyTotals.push(currentWeekTotal);
        currentWeek = [];
        currentWeekTotal = 0;
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
      weeklyTotals.push(currentWeekTotal);
    }

    return { weeks, dailyTotals, weeklyTotals };
  }, [currentDate, sessions]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputYear(val); // 💡 まずは打った文字をそのまま画面に出す

    const y = parseInt(val, 10);
    // 💡 ちゃんと2000〜2100の間になった時だけ、カレンダー本体を動かす
    if (!isNaN(y) && y >= 2000 && y <= 2100) {
      setCurrentDate(new Date(y, currentDate.getMonth(), 1));
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputMonth(val); // 💡 まずは打った文字をそのまま画面に出す

    const m = parseInt(val, 10);
    // 💡 ちゃんと1〜12の間になった時だけ、カレンダー本体を動かす
    if (!isNaN(m) && m >= 1 && m <= 12) {
      setCurrentDate(new Date(currentDate.getFullYear(), m - 1, 1));
    }
  };

  return (
    <div style={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
        <button onClick={prevMonth} style={{ cursor: "pointer", padding: "4px 8px" }}>&lt; 先月</button>
        
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {/* 💡 value を inputYear に変更 */}
          <input 
            type="number" 
            value={inputYear} 
            onChange={handleYearChange} 
            min="2000" 
            max="2100"
            style={{ width: "65px", padding: "4px", fontSize: "16px", textAlign: "right" }}
          />
          <span style={{ fontWeight: "bold" }}>年</span>
          {/* 💡 value を inputMonth に変更 */}
          <input 
            type="number" 
            value={inputMonth} 
            onChange={handleMonthChange} 
            min="1" 
            max="12"
            style={{ width: "45px", padding: "4px", fontSize: "16px", textAlign: "right" }}
          />
          <span style={{ fontWeight: "bold" }}>月</span>
        </div>

        <button onClick={nextMonth} style={{ cursor: "pointer", padding: "4px 8px" }}>来月 &gt;</button>
      </div>
      
      <div style={{ textAlign: "center", fontSize: "12px", color: "#666", marginBottom: "15px" }}>
        ※ 年は2000年〜2100年、月は1〜12月の範囲で指定可能です。
      </div>

      <table style={{ borderCollapse: "collapse", width: "100%", textAlign: "center" }}>
        <thead>
          <tr>
            {["日", "月", "火", "水", "木", "金", "土"].map(d => (
              <th key={d} style={{ padding: "5px", borderBottom: "1px solid #ddd" }}>{d}</th>
            ))}
            <th style={{ padding: "5px", borderBottom: "1px solid #ddd", borderLeft: "2px dashed #ccc" }}>週合計</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((date, dayIndex) => {
                if (!date) return <td key={dayIndex} style={{ padding: "10px" }}></td>;
                
                const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
                const ms = dailyTotals[dateKey] || 0;
                const isSelected = selectedDateKey === dateKey;

                return (
                  <td 
                    key={dayIndex} 
                    onClick={() => setSelectedDateKey(dateKey)}
                    style={{ 
                      padding: "10px", 
                      border: "1px solid #eee", 
                      cursor: "pointer",
                      backgroundColor: isSelected ? "#f0f8ff" : "transparent",
                      boxShadow: isSelected ? "inset 0 0 0 2px #005bbb" : "none"
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "#666", fontWeight: isSelected ? "bold" : "normal" }}>
                      {date.getDate()}
                    </div>
                    <div 
                      style={{ 
                        backgroundColor: getColor(ms, settings), 
                        width: "24px", height: "24px", margin: "5px auto 0", borderRadius: "4px" 
                      }}
                      title={ms > 0 ? `${msToHours(ms)} 時間` : "記録なし"}
                    ></div>
                  </td>
                );
              })}
              <td style={{ padding: "10px", borderLeft: "2px dashed #ccc", fontWeight: "bold" }}>
                {msToHours(weeklyTotals[weekIndex])}h
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>
          {selectedDateKey ? (
            <>
              {selectedDateKey.split("-")[0]}年{selectedDateKey.split("-")[1]}月{selectedDateKey.split("-")[2]}日 の合計：
              <span style={{ color: "#005bbb", marginLeft: "5px" }}>
                {formatDuration(dailyTotals[selectedDateKey] || 0)}
              </span>
            </>
          ) : (
            <span style={{ color: "#999", fontWeight: "normal" }}>日付をタップして詳細を表示</span>
          )}
        </div>

        <div style={{ fontSize: "12px", textAlign: "right" }}>
          <span>少 </span>
          <span style={{ display:"inline-block", width:"12px", height:"12px", backgroundColor:getColor(0, settings), margin:"0 2px"}}></span>
          <span style={{ display:"inline-block", width:"12px", height:"12px", backgroundColor:getColor(settings.level1 * 3600000 - 1, settings), margin:"0 2px"}}></span>
          <span style={{ display:"inline-block", width:"12px", height:"12px", backgroundColor:getColor(settings.level2 * 3600000 - 1, settings), margin:"0 2px"}}></span>
          <span style={{ display:"inline-block", width:"12px", height:"12px", backgroundColor:getColor(settings.level3 * 3600000 - 1, settings), margin:"0 2px"}}></span>
          <span style={{ display:"inline-block", width:"12px", height:"12px", backgroundColor:getColor(settings.level3 * 3600000, settings), margin:"0 2px"}}></span>
          <span> 多</span>
        </div>
      </div>
    </div>
  );
}