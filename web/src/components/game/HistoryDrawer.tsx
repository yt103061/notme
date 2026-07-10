import { useEffect, useState } from "react";
import { getHistory, subscribeHistory, type HistoryEntry } from "../../core/historyLog";
import "./HistoryDrawer.css";

/** 6.3: 演出を見逃しても情報が失われないよう、直近の変化を遡れる小さなログ。 */
export function HistoryDrawer() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[]>(getHistory());

  useEffect(() => subscribeHistory(setEntries), []);

  return (
    <div className={`history-drawer ${open ? "history-drawer--open" : ""}`}>
      <button className="history-drawer__tab" onClick={() => setOpen((o) => !o)}>
        履歴 {open ? "▾" : "▸"}
      </button>
      {open && (
        <ul className="history-drawer__list">
          {entries.length === 0 && <li className="history-drawer__empty">まだ何も起きていません</li>}
          {entries.map((entry) => (
            <li key={entry.id}>{entry.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
