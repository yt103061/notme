import { useEffect, useState } from 'react';
import {
  createGame,
  dealHand,
  applyFolds,
  applyExchange,
  revealCommunity,
  resolveShowdown,
  isGameOver,
  gameWinners,
  activePlayers,
  type GameState,
  type ExchangeAction,
} from './engine/game';
import { createRng } from './engine/cards';
import { decideFoldWithEmote, decideExchange, PERSONALITIES, type PersonalityId } from './engine/ai';
import { Title } from './components/Title';
import { Tutorial } from './components/Tutorial';
import { Table } from './components/Table';
import { ActionBar } from './components/ActionBar';
import { ShowdownReveal } from './components/ShowdownReveal';
import { ResultScreen } from './components/ResultScreen';
import { sfx } from './audio/sfx';
import { analytics } from './platform/analytics';
import * as S from './strings';

type Screen = 'title' | 'tutorial' | 'game' | 'result';

const TUTORIAL_SEEN_KEY = 'notme_tutorial_seen';
const AI_ORDER: PersonalityId[] = ['aggressive', 'steady', 'tricky'];

function personalityFor(id: number): PersonalityId {
  return AI_ORDER[id - 1] ?? 'steady';
}

export default function App() {
  const [rng] = useState(() => createRng(Date.now() ^ 0x9e3779b9));
  const [screen, setScreen] = useState<Screen>('title');
  const [state, setState] = useState<GameState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [emotes, setEmotes] = useState<Record<number, string>>({});
  const [decision1AiFolds, setDecision1AiFolds] = useState<Record<number, boolean> | null>(null);
  const [decision2AiFolds, setDecision2AiFolds] = useState<Record<number, boolean> | null>(null);
  const [exchangeQueue, setExchangeQueue] = useState<number[]>([]);
  const [showdownStage, setShowdownStage] = useState<0 | 1 | 2>(0);
  const [muted, setMuted] = useState(false);

  function computeAiRound(s: GameState) {
    const folds: Record<number, boolean> = {};
    const newEmotes: Record<number, string> = {};
    for (const p of activePlayers(s)) {
      if (p.isHuman) continue;
      const personality = PERSONALITIES[personalityFor(p.id)];
      const { fold, emote } = decideFoldWithEmote(s, p.id, personality, rng);
      folds[p.id] = fold;
      newEmotes[p.id] = emote;
    }
    return { folds, emotes: newEmotes };
  }

  function appendFoldLog(next: GameState, foldedIds: number[]) {
    const msgs = foldedIds.map((id) => S.FOLD_LOG(next.players.find((p) => p.id === id)!.name));
    if (msgs.length) setLog((l) => [...l, ...msgs].slice(-6));
  }

  function appendExchangeLog(current: GameState, actorId: number, action: ExchangeAction) {
    const actor = current.players.find((p) => p.id === actorId)!;
    let msg: string;
    if (action.type === 'pass') msg = S.EXCHANGE_PASS_LOG(actor.name);
    else if (action.type === 'drawDeck') msg = S.EXCHANGE_DECK_LOG(actor.name);
    else msg = S.EXCHANGE_STEAL_LOG(actor.name, current.players.find((p) => p.id === action.targetId)!.name);
    setLog((l) => [...l, msg].slice(-6));
  }

  function proceedAfterFoldRound(next: GameState, isFirstRound: boolean) {
    if (isFirstRound && activePlayers(next).length > 1) {
      setExchangeQueue(activePlayers(next).map((p) => p.id));
      setState({ ...next, phase: 'exchange' });
      return;
    }
    const { state: resolved, result } = resolveShowdown(next);
    setState(resolved);
    setShowdownStage(1);
    sfx.play('flip');
    analytics.track('showdown', { reason: result.reason });
    window.setTimeout(() => {
      setShowdownStage(2);
      const human = resolved.players.find((p) => p.isHuman)!;
      const humanWon = result.winnerIds.includes(human.id);
      sfx.play(result.winnerIds.length === 0 ? 'fold' : humanWon ? 'win' : 'lose');
    }, 1400);
  }

  // 交換フェーズの進行（AI は一定時間後に自動決定、人間の番では ActionBar 待ち）
  useEffect(() => {
    if (!state || state.phase !== 'exchange') return;

    if (exchangeQueue.length === 0) {
      const revealed = revealCommunity(state);
      const { folds, emotes: newEmotes } = computeAiRound(revealed);
      setEmotes((e) => ({ ...e, ...newEmotes }));
      const human = revealed.players.find((p) => p.isHuman)!;
      if (human.folded) {
        const timer = window.setTimeout(() => {
          const foldedIds = Object.entries(folds)
            .filter(([, f]) => f)
            .map(([id]) => Number(id));
          const resolved = applyFolds(revealed, foldedIds);
          appendFoldLog(resolved, foldedIds);
          proceedAfterFoldRound(resolved, false);
        }, 1000);
        return () => window.clearTimeout(timer);
      }
      setDecision2AiFolds(folds);
      setState(revealed);
      return;
    }

    const currentId = exchangeQueue[0];
    const player = state.players.find((p) => p.id === currentId)!;
    if (player.isHuman) return;

    const timer = window.setTimeout(() => {
      const personality = PERSONALITIES[personalityFor(currentId)];
      const action = decideExchange(state, currentId, personality, rng);
      appendExchangeLog(state, currentId, action);
      const next = applyExchange(state, currentId, action);
      sfx.play('exchange');
      setState(next);
      setExchangeQueue((q) => q.slice(1));
    }, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, exchangeQueue]);

  function startGame() {
    const next = dealHand(createGame(rng, 4));
    const { folds, emotes: newEmotes } = computeAiRound(next);
    setState(next);
    setDecision1AiFolds(folds);
    setEmotes(newEmotes);
    setLog([]);
    setShowdownStage(0);
    analytics.track('game_start');
    analytics.track('hand_start', { hand: next.handNumber });
    setScreen('game');
  }

  function handleTitleStart() {
    sfx.play('tap');
    const seen = localStorage.getItem(TUTORIAL_SEEN_KEY);
    if (seen) startGame();
    else setScreen('tutorial');
  }

  function handleTutorialFinish() {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
    startGame();
  }

  function handleDecision1Choice(stay: boolean) {
    if (!state || !decision1AiFolds) return;
    sfx.play(stay ? 'stay' : 'fold');
    analytics.track(stay ? 'stay' : 'fold', { round: 1 });
    const foldedIds = Object.entries(decision1AiFolds)
      .filter(([, f]) => f)
      .map(([id]) => Number(id));
    if (!stay) foldedIds.push(0);
    const next = applyFolds(state, foldedIds);
    appendFoldLog(next, foldedIds);
    setDecision1AiFolds(null);
    proceedAfterFoldRound(next, true);
  }

  function handleDecision2Choice(stay: boolean) {
    if (!state || !decision2AiFolds) return;
    sfx.play(stay ? 'stay' : 'fold');
    analytics.track(stay ? 'stay' : 'fold', { round: 2 });
    const foldedIds = Object.entries(decision2AiFolds)
      .filter(([, f]) => f)
      .map(([id]) => Number(id));
    if (!stay) foldedIds.push(0);
    const next = applyFolds(state, foldedIds);
    appendFoldLog(next, foldedIds);
    setDecision2AiFolds(null);
    proceedAfterFoldRound(next, false);
  }

  function handleHumanExchange(action: ExchangeAction) {
    if (!state) return;
    sfx.play('exchange');
    analytics.track(
      action.type === 'drawDeck' ? 'exchange_deck' : action.type === 'steal' ? 'exchange_steal' : 'exchange_pass',
    );
    appendExchangeLog(state, 0, action);
    const next = applyExchange(state, 0, action);
    setState(next);
    setExchangeQueue((q) => q.slice(1));
  }

  function dealNextHand(base: GameState, suddenDeath: boolean) {
    const next = dealHand(suddenDeath ? { ...base, isSuddenDeath: true, totalHands: base.totalHands + 1 } : base);
    const { folds, emotes: newEmotes } = computeAiRound(next);
    setState(next);
    setDecision1AiFolds(folds);
    setEmotes(newEmotes);
    setShowdownStage(0);
    analytics.track('hand_start', { hand: next.handNumber, suddenDeath });
    if (suddenDeath) setLog((l) => [...l, `${S.SUDDEN_DEATH_BADGE}！`].slice(-6));
  }

  function handleNextHand() {
    if (!state) return;
    if (isGameOver(state)) {
      const winners = gameWinners(state);
      if (winners.length > 1) {
        dealNextHand(state, true);
        return;
      }
      analytics.track('game_end');
      setScreen('result');
      return;
    }
    dealNextHand(state, false);
  }

  function handlePlayAgain() {
    startGame();
  }

  function toggleMute() {
    setMuted((m) => {
      sfx.setMuted(!m);
      return !m;
    });
  }

  function renderActionArea() {
    if (!state || showdownStage > 0) return null;

    if (state.phase === 'decision1' && decision1AiFolds) {
      return (
        <ActionBar mode="decision" onStay={() => handleDecision1Choice(true)} onFold={() => handleDecision1Choice(false)} />
      );
    }

    if (state.phase === 'decision2' && decision2AiFolds) {
      const human = state.players.find((p) => p.isHuman)!;
      if (human.folded) return <ActionBar mode="waiting" />;
      return (
        <ActionBar mode="decision" onStay={() => handleDecision2Choice(true)} onFold={() => handleDecision2Choice(false)} />
      );
    }

    if (state.phase === 'exchange') {
      const currentId = exchangeQueue[0];
      if (currentId === undefined) return <ActionBar mode="waiting" />;
      const current = state.players.find((p) => p.id === currentId);
      if (!current?.isHuman) return <ActionBar mode="waiting" />;
      const opponents = activePlayers(state).filter((p) => p.id !== 0);
      return (
        <ActionBar
          mode="exchange"
          opponents={opponents}
          onExchangeDeck={() => handleHumanExchange({ type: 'drawDeck' })}
          onExchangeSteal={(targetId) => handleHumanExchange({ type: 'steal', targetId })}
          onExchangePass={() => handleHumanExchange({ type: 'pass' })}
        />
      );
    }

    return null;
  }

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__brand">{S.APP_NAME}</span>
        <button className="btn btn--icon" onClick={toggleMute} aria-label={muted ? S.MUTE_OFF : S.MUTE_ON}>
          {muted ? '🔇' : '🔊'}
        </button>
      </header>

      <main className="app__main">
        {screen === 'title' && <Title onStart={handleTitleStart} />}
        {screen === 'tutorial' && <Tutorial onFinish={handleTutorialFinish} />}

        {screen === 'game' && state && (
          <>
            <Table
              state={state}
              emotes={emotes}
              actingPlayerId={state.phase === 'exchange' ? exchangeQueue[0] : undefined}
              showdownStage={showdownStage}
            />
            {renderActionArea()}
            <div className="app__log">
              {log.slice(-3).map((m, i) => (
                <div key={i} className="app__logLine">
                  {m}
                </div>
              ))}
            </div>
            {showdownStage > 0 && (
              <ShowdownReveal
                state={state}
                stage={showdownStage}
                onContinue={handleNextHand}
                isFinalHand={isGameOver(state) && gameWinners(state).length === 1}
              />
            )}
          </>
        )}

        {screen === 'result' && state && <ResultScreen players={state.players} onPlayAgain={handlePlayAgain} />}
      </main>
    </div>
  );
}
