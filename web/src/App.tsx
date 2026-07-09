import { useEffect, useState } from "react";
import { GameBoard } from "./components/game/GameBoard";
import { PackOpening } from "./components/screens/PackOpening";
import { CardDetailOverlay } from "./components/screens/CardDetailOverlay";
import { ResultScreen } from "./components/screens/ResultScreen";
import { HistoryDrawer } from "./components/game/HistoryDrawer";
import { EventPlayer } from "./components/game/EventPlayer";
import { SettingsPanel } from "./components/ui/SettingsPanel";
import type { CardInstance } from "./data/cards";
import type { Side } from "./components/game/gameEngine";
import { unlockAudio } from "./core/sound";
import "./App.css";

type Screen = "battle" | "pack";

interface DetailState {
  instance: CardInstance;
  rect: DOMRect;
}

interface ResultState {
  winner: Side;
  highlightCard: CardInstance | null;
}

function App() {
  const [screen, setScreen] = useState<Screen>("battle");
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [battleKey, setBattleKey] = useState(0);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const restartBattle = () => {
    setResult(null);
    setBattleKey((k) => k + 1);
  };

  return (
    <div className="app">
      <header className="app__topbar">
        <span className="app__title">カードUIデモ</span>
        <nav className="app__nav">
          <button className={screen === "battle" ? "app__nav-btn app__nav-btn--active" : "app__nav-btn"} onClick={() => setScreen("battle")}>
            対戦
          </button>
          <button className={screen === "pack" ? "app__nav-btn app__nav-btn--active" : "app__nav-btn"} onClick={() => setScreen("pack")}>
            パック開封
          </button>
        </nav>
        <button className="app__settings-btn" onClick={() => setSettingsOpen(true)} aria-label="設定">
          ⚙
        </button>
      </header>

      <main className="app__stage">
        {screen === "battle" && (
          <GameBoard
            key={battleKey}
            onOpenDetail={(instance, rect) => setDetail({ instance, rect })}
            onGameOver={(winner, highlightCard) => setResult({ winner, highlightCard })}
          />
        )}
        {screen === "pack" && <PackOpening key={screen} />}
      </main>

      <HistoryDrawer />
      <EventPlayer />

      {detail && (
        <CardDetailOverlay instance={detail.instance} originRect={detail.rect} onClose={() => setDetail(null)} />
      )}

      {result && (
        <ResultScreen winner={result.winner} highlightCard={result.highlightCard} onRestart={restartBattle} />
      )}

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

export default App;
