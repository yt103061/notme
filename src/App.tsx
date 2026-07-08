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
import {
  decideFoldWithEquity,
  decideExchange,
  pickEmote,
  reactToVisibleNotMe,
  pickStealLine,
  PERSONALITIES,
  type PersonalityId,
} from './engine/ai';
import { Title } from './components/Title';
import { Tutorial } from './components/Tutorial';
import { Table } from './components/Table';
import { ActionBar } from './components/ActionBar';
import { ShowdownReveal } from './components/ShowdownReveal';
import { ResultScreen } from './components/ResultScreen';
import { HelpModal } from './components/HelpModal';
import { ExchangeEvent, type ExchangeEventData } from './components/ExchangeEvent';
import { sfx } from './audio/sfx';
import { analytics } from './platform/analytics';
import * as S from './strings';

type Screen = 'title' | 'tutorial' | 'game' | 'result';

const TUTORIAL_SEEN_KEY = 'notme_tutorial_seen';
const AI_ORDER: PersonalityId[] = ['aggressive', 'steady', 'tricky'];

function personalityFor(id: number) {
  return PERSONALITIES[AI_ORDER[id - 1] ?? 'steady'];
}

export default function App() {
  const [rng] = useState(() => createRng(Date.now() ^ 0x9e3779b9));
  const [screen, setScreen] = useState<Screen>('title');
  const [state, setState] = useState<GameState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [emotes, setEmotes] = useState<Record<number, string>>({});
  const [round, setRound] = useState<1 | 2>(1);
  const [aiFolds, setAiFolds] = useState<Record<number, boolean> | null>(null);
  const [exchangeQueue, setExchangeQueue] = useState<number[]>([]);
  const [decisionReveal, setDecisionReveal] = useState<Record<number, boolean> | null>(null);
  const [showdownOpen, setShowdownOpen] = useState(false);
  const [exchangeEvent, setExchangeEvent] = useState<ExchangeEventData | null>(null);
  const [muted, setMuted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  /** 奪った側の手札ペナルティで実際にどちらの1枚が入れ替わったかを前後比較で特定する */
  function findHolePenalty(prev: GameState, next: GameState, actorId: number) {
    const before = prev.players.find((p) => p.id === actorId)!.hole;
    const after = next.players.find((p) => p.id === actorId)!.hole;
    for (let i = 0; i < before.length; i++) {
      if (before[i].suit !== after[i].suit || before[i].rank !== after[i].rank) {
        return { index: i as 0 | 1, before: before[i], after: after[i] };
      }
    }
    return null;
  }

  /** 奪う: prev（適用前）と next（適用後）を見比べて演出データを組み立てる */
  function buildStealEvent(prev: GameState, next: GameState, actorId: number, targetId: number): ExchangeEventData {
    const actor = prev.players.find((p) => p.id === actorId)!;
    const target = prev.players.find((p) => p.id === targetId)!;
    const targetAfter = next.players.find((p) => p.id === targetId)!;
    return {
      type: 'steal',
      actorName: actor.name,
      targetName: target.name,
      actorIsHuman: actor.isHuman,
      targetIsHuman: target.isHuman,
      // 奪った札は actor が人間なら自分のnot me化して見えなくなる。それ以外は常に公開情報
      revealedCard: actor.isHuman ? null : target.notMe,
      hint: targetAfter.hint,
      // 奪った側の手札ペナルティ。自分の手札は常に見えるので、何が起きたかを明示する
      holePenalty: actor.isHuman ? findHolePenalty(prev, next, actorId) : null,
    };
  }

  /** 山札交換: actor が人間なら前後とも非公開（本人には常に見えないため） */
  function buildDeckSwapEvent(prev: GameState, next: GameState, actorId: number): ExchangeEventData {
    const before = prev.players.find((p) => p.id === actorId)!;
    const after = next.players.find((p) => p.id === actorId)!;
    return {
      type: 'deckSwap',
      actorName: before.name,
      actorIsHuman: before.isHuman,
      revealedBefore: before.isHuman ? null : before.notMe,
      revealedAfter: before.isHuman ? null : after.notMe,
    };
  }

  /** そのラウンドの AI 全員の降り判断と勝率をまとめて計算 */
  function computeAiRound(s: GameState, r: 1 | 2) {
    const folds: Record<number, boolean> = {};
    const equities: Record<number, number> = {};
    for (const p of activePlayers(s)) {
      if (p.isHuman) continue;
      const { fold, winProb } = decideFoldWithEquity(s, p.id, personalityFor(p.id), rng, r);
      folds[p.id] = fold;
      equities[p.id] = winProb;
    }
    return { folds, equities };
  }

  function appendLog(msg: string) {
    setLog((l) => [...l, msg].slice(-6));
  }

  function appendFoldLog(next: GameState, foldedIds: number[]) {
    for (const id of foldedIds) appendLog(S.FOLD_LOG(next.players.find((p) => p.id === id)!.name));
  }

  // ----- ハンド開始 -----

  function dealNext(base: GameState, suddenDeath: boolean) {
    const next = dealHand(
      suddenDeath ? { ...base, isSuddenDeath: true, totalHands: base.totalHands + 1 } : base,
    );
    const { folds, equities } = computeAiRound(next, 1);
    const human = next.players.find((p) => p.isHuman)!;

    // 配られた瞬間の AI リアクション。「あなたの not me」への反応が読み合いの主要シグナルになる
    const newEmotes: Record<number, string> = {};
    for (const p of next.players) {
      if (p.isHuman) continue;
      const roll = rng();
      if (roll < 0.55) {
        newEmotes[p.id] = reactToVisibleNotMe(human.notMe.rank, personalityFor(p.id), rng);
      } else if (roll < 0.8) {
        newEmotes[p.id] = pickEmote(equities[p.id], rng).text;
      }
    }

    setState(next);
    setRound(1);
    setAiFolds(folds);
    setEmotes(newEmotes);
    setDecisionReveal(null);
    setShowdownOpen(false);
    sfx.play('deal');
    analytics.track('hand_start', { hand: next.handNumber, suddenDeath });
    if (suddenDeath) appendLog(`${S.SUDDEN_DEATH_BADGE}！`);
  }

  function startGame() {
    setLog([]);
    analytics.track('game_start');
    dealNext(createGame(rng, 4), false);
    setScreen('game');
  }

  function handleTitleStart() {
    sfx.play('tap');
    if (localStorage.getItem(TUTORIAL_SEEN_KEY)) startGame();
    else setScreen('tutorial');
  }

  function handleTutorialFinish() {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
    startGame();
  }

  // ----- せーの同時公開 -----

  function runDecisionReveal(s: GameState, choices: Record<number, boolean>, r: 1 | 2) {
    setDecisionReveal(choices);
    const ids = activePlayers(s).map((p) => p.id);
    ids.forEach((id, i) => {
      window.setTimeout(() => sfx.play(choices[id] ? 'fold' : 'pop'), 250 + i * 220);
    });
    const total = 250 + ids.length * 220 + 900;
    window.setTimeout(() => {
      setDecisionReveal(null);
      const foldedIds = ids.filter((id) => choices[id]);
      const next = applyFolds(s, foldedIds);
      appendFoldLog(next, foldedIds);
      if (r === 1 && activePlayers(next).length > 1) {
        setExchangeQueue(activePlayers(next).map((p) => p.id));
        setState({ ...next, phase: 'exchange' });
      } else {
        resolveAndShow(next);
      }
    }, total);
  }

  function handleDecisionChoice(stay: boolean) {
    if (!state || !aiFolds) return;
    sfx.play('tap');
    analytics.track(stay ? 'stay' : 'fold', { round });
    const choices: Record<number, boolean> = { ...aiFolds, 0: !stay };
    setAiFolds(null);
    runDecisionReveal(state, choices, round);
  }

  // ----- ショーダウン -----

  function resolveAndShow(next: GameState) {
    const { state: resolved, result } = resolveShowdown(next);
    analytics.track('showdown', { reason: result.reason });
    setState(resolved);
    setShowdownOpen(true);
  }

  function handleNextHand() {
    if (!state) return;
    sfx.play('tap');
    if (isGameOver(state)) {
      if (gameWinners(state).length > 1) {
        dealNext(state, true);
        return;
      }
      analytics.track('game_end');
      setShowdownOpen(false);
      setScreen('result');
      return;
    }
    dealNext(state, false);
  }

  // ----- 交換フェーズ（AI は自動、人間は ActionBar 待ち） -----

  useEffect(() => {
    if (!state || state.phase !== 'exchange') return;
    // イベントバナー表示中は次のアクションを開始しない（バナーを読む時間を確保する）
    if (exchangeEvent) return;

    if (exchangeQueue.length === 0) {
      const timer = window.setTimeout(() => {
        const revealed = revealCommunity(state);
        const { folds, equities } = computeAiRound(revealed, 2);

        const newEmotes: Record<number, string> = {};
        for (const p of activePlayers(revealed)) {
          if (p.isHuman) continue;
          if (rng() < 0.75) newEmotes[p.id] = pickEmote(equities[p.id], rng).text;
        }
        setEmotes(newEmotes);
        setRound(2);
        setState(revealed);

        const human = revealed.players.find((p) => p.isHuman)!;
        if (human.folded) {
          window.setTimeout(() => runDecisionReveal(revealed, folds, 2), 1100);
        } else {
          setAiFolds(folds);
        }
      }, 400);
      return () => window.clearTimeout(timer);
    }

    const currentId = exchangeQueue[0];
    const actor = state.players.find((p) => p.id === currentId)!;
    if (actor.isHuman) return;

    const timer = window.setTimeout(() => {
      const action = decideExchange(state, currentId, personalityFor(currentId), rng);
      appendExchangeLog(state, currentId, action);
      const next = applyExchange(state, currentId, action);

      if (action.type === 'steal') {
        sfx.play('exchange');
        setEmotes((e) => ({ ...e, [currentId]: pickStealLine(rng) }));
        setExchangeEvent(buildStealEvent(state, next, currentId, action.targetId));
      } else if (action.type === 'drawDeck') {
        sfx.play('exchange');
        setExchangeEvent(buildDeckSwapEvent(state, next, currentId));
      }

      // 進行自体は即座に。次のプレイヤーの手番はバナーが消えるまで上の早期returnで足止めされる
      setState(next);
      setExchangeQueue((q) => q.slice(1));
    }, 950);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, exchangeQueue, exchangeEvent]);

  function appendExchangeLog(current: GameState, actorId: number, action: ExchangeAction) {
    const actor = current.players.find((p) => p.id === actorId)!;
    if (action.type === 'pass') appendLog(S.EXCHANGE_PASS_LOG(actor.name));
    else if (action.type === 'drawDeck') appendLog(S.EXCHANGE_DECK_LOG(actor.name));
    else
      appendLog(
        S.EXCHANGE_STEAL_LOG(actor.name, current.players.find((p) => p.id === action.targetId)!.name),
      );
  }

  function handleHumanExchange(action: ExchangeAction) {
    if (!state) return;
    sfx.play('exchange');
    analytics.track(
      action.type === 'drawDeck'
        ? 'exchange_deck'
        : action.type === 'steal'
          ? 'exchange_steal'
          : 'exchange_pass',
    );
    appendExchangeLog(state, 0, action);
    const next = applyExchange(state, 0, action);

    if (action.type === 'steal') {
      setExchangeEvent(buildStealEvent(state, next, 0, action.targetId));
    } else if (action.type === 'drawDeck') {
      setExchangeEvent(buildDeckSwapEvent(state, next, 0));
    }

    setState(next);
    setExchangeQueue((q) => q.slice(1));
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
    if (!state || showdownOpen) return null;
    if (decisionReveal) return <ActionBar mode="waiting" message={S.DECISION_REVEAL_BANNER} />;
    // 事件バナー表示中は同じ手番のアクションを再度受け付けない
    if (exchangeEvent) return <ActionBar mode="waiting" />;

    if ((state.phase === 'decision1' || state.phase === 'decision2') && aiFolds) {
      const human = state.players.find((p) => p.isHuman)!;
      if (human.folded) return <ActionBar mode="waiting" />;
      return (
        <ActionBar
          mode="decision"
          onStay={() => handleDecisionChoice(true)}
          onFold={() => handleDecisionChoice(false)}
        />
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
        <button
          className="btn btn--icon"
          onClick={() => {
            sfx.play('tap');
            setHelpOpen(true);
          }}
          aria-label={S.HELP_BUTTON_LABEL}
        >
          ?
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
              decisionReveal={decisionReveal}
            />
            {renderActionArea()}
            <div className="app__log">
              {log.slice(-3).map((m, i) => (
                <div key={i} className="app__logLine">
                  {m}
                </div>
              ))}
            </div>
            {decisionReveal && <div className="revealBanner">{S.DECISION_REVEAL_BANNER}</div>}
            {exchangeEvent && (
              <ExchangeEvent event={exchangeEvent} onDismiss={() => setExchangeEvent(null)} />
            )}
            {showdownOpen && (
              <ShowdownReveal
                state={state}
                onContinue={handleNextHand}
                isFinalHand={isGameOver(state) && gameWinners(state).length === 1}
              />
            )}
          </>
        )}

        {screen === 'result' && state && <ResultScreen players={state.players} onPlayAgain={handlePlayAgain} />}
      </main>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} muted={muted} onToggleMute={toggleMute} />}
    </div>
  );
}
