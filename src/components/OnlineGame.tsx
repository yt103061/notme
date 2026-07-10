import { useEffect, useRef, useState } from 'react';
import { Table } from './Table';
import { ActionBar } from './ActionBar';
import { ShowdownReveal } from './ShowdownReveal';
import { activePlayers, isGameOver, gameWinners, type BetChoice, type DecisionTell, type ExchangeAction } from '../engine/game';
import {
  fetchOnlineView,
  submitOnlineBet,
  submitOnlineExchange,
  continueOnlineHand,
  type OnlineView,
} from '../platform/online';
import * as S from '../strings';

interface OnlineGameProps {
  roomId: string;
  seat: number;
  onExit: () => void;
}

export function OnlineGame({ roomId, seat, onExit }: OnlineGameProps) {
  const [view, setView] = useState<OnlineView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    const r = await fetchOnlineView(roomId);
    if (r.ok && r.data) setView(r.data);
  }

  useEffect(() => {
    refresh();
    pollTimer.current = setInterval(refresh, 1200);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  async function handleBet(choice: BetChoice, tell: DecisionTell) {
    const r = await submitOnlineBet(roomId, choice, tell);
    if (r.ok && r.data) setView(r.data);
    else setError(r.error ?? S.ONLINE_ERROR_GENERIC);
  }

  async function handleExchange(action: ExchangeAction) {
    const r = await submitOnlineExchange(roomId, action);
    if (r.ok && r.data) setView(r.data);
    else setError(r.error ?? S.ONLINE_ERROR_GENERIC);
  }

  async function handleContinue() {
    const r = await continueOnlineHand(roomId);
    if (r.ok && r.data) setView(r.data);
    else setError(r.error ?? S.ONLINE_ERROR_GENERIC);
  }

  if (!view || !view.game) {
    return (
      <div className="online">
        <p className="online__blurb">{S.ONLINE_LOADING}</p>
      </div>
    );
  }

  const game = view.game;
  const iAmWaiting = !(view.waitingOnSeats ?? []).includes(seat);
  const myPlayer = game.players.find((p) => p.id === seat)!;

  function renderActionArea() {
    if (!view!.game) return null;
    if (game.phase === 'handEnd' || game.phase === 'gameEnd') return null;
    if (myPlayer.folded) return <ActionBar mode="waiting" />;
    if (iAmWaiting) return <ActionBar mode="waiting" />;

    if (game.phase === 'decision1' || game.phase === 'decision2') {
      return <ActionBar mode="decision" stack={myPlayer.stack} onBet={handleBet} />;
    }
    if (game.phase === 'exchange') {
      const opponents = activePlayers(game).filter((p) => p.id !== seat);
      return (
        <ActionBar
          mode="exchange"
          opponents={opponents}
          onExchangeDeck={() => handleExchange({ type: 'drawDeck' })}
          onExchangeSteal={(targetId) => handleExchange({ type: 'steal', targetId })}
          onExchangePass={() => handleExchange({ type: 'pass' })}
        />
      );
    }
    return null;
  }

  if (game.phase === 'gameEnd') {
    const ranked = [...game.players].sort((a, b) => b.stack - a.stack);
    return (
      <div className="online">
        <h1 className="online__title">{S.ONLINE_MATCH_OVER}</h1>
        <div className="online__players">
          {ranked.map((p, i) => (
            <div key={p.id} className="online__playerRow">
              {i + 1}. {p.name} — {S.CHIP_ICON} {p.stack}
              {p.id === seat && S.ONLINE_YOU_TAG}
            </div>
          ))}
        </div>
        <button className="btn btn--primary btn--large" onClick={onExit}>
          {S.ACTION_HOME}
        </button>
      </div>
    );
  }

  return (
    <>
      <Table state={game} emotes={{}} heroId={seat} actingPlayerId={view.waitingOnSeats?.[0]} />
      {renderActionArea()}
      {error && <p className="online__error">{error}</p>}
      {game.phase === 'handEnd' && (
        <ShowdownReveal
          state={game}
          heroId={seat}
          onContinue={handleContinue}
          isFinalHand={isGameOver(game) && gameWinners(game).length === 1}
        />
      )}
    </>
  );
}
