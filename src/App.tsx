import { useEffect, useState } from 'react';
import {
  createGame,
  dealHand,
  applyBets,
  applyExchange,
  revealCommunity,
  resolveShowdown,
  isGameOver,
  gameWinners,
  activePlayers,
  betAmountFor,
  type GameState,
  type ExchangeAction,
  type BetChoice,
} from './engine/game';
import { createRng } from './engine/cards';
import {
  decideBet,
  decideExchange,
  pickEmote,
  reactToVisibleNotMe,
  pickStealLine,
  PERSONALITIES,
  type PersonalityId,
} from './engine/ai';
import { Title } from './components/Title';
import { Tutorial } from './components/Tutorial';
import { VSIntro } from './components/VSIntro';
import { Table } from './components/Table';
import { ActionBar } from './components/ActionBar';
import { ShowdownReveal } from './components/ShowdownReveal';
import { ResultScreen } from './components/ResultScreen';
import { HelpModal } from './components/HelpModal';
import { ExchangeEvent, type ExchangeEventData } from './components/ExchangeEvent';
import { sfx } from './audio/sfx';
import { analytics } from './platform/analytics';
import {
  getBalance,
  canSitDown,
  sitDown,
  cashOut,
  getDailyBonusStatus,
  claimDailyBonus,
  initWallet,
  getDisplayName,
  setDisplayName,
  SIT_DOWN_STACK,
  type DailyBonusStatus,
} from './platform/wallet';
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
  const [aiBets, setAiBets] = useState<Record<number, BetChoice> | null>(null);
  const [exchangeQueue, setExchangeQueue] = useState<number[]>([]);
  const [decisionReveal, setDecisionReveal] = useState<Record<number, BetChoice> | null>(null);
  const [showdownOpen, setShowdownOpen] = useState(false);
  const [exchangeEvent, setExchangeEvent] = useState<ExchangeEventData | null>(null);
  const [muted, setMuted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showVS, setShowVS] = useState(false);
  const [chipBalance, setChipBalance] = useState(() => getBalance());
  const [dailyBonus, setDailyBonus] = useState<DailyBonusStatus>(() => getDailyBonusStatus());
  const [chipDelta, setChipDelta] = useState(0);
  const [displayName, setName] = useState(() => getDisplayName());

  // 起動時にクラウド（Supabase）からウォレット／プロフィールをハイドレートする。
  // 未設定・失敗時は localStorage の値のまま（フォールバック）。
  useEffect(() => {
    let cancelled = false;
    initWallet().then(() => {
      if (cancelled) return;
      setChipBalance(getBalance());
      setDailyBonus(getDailyBonusStatus());
      setName(getDisplayName());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleRename(name: string) {
    setName(setDisplayName(name));
  }

  function handleClaimBonus() {
    const result = claimDailyBonus();
    if (!result) return;
    sfx.play('win');
    setChipBalance(result.newBalance);
    setDailyBonus(getDailyBonusStatus());
  }

  /**
   * 奪う＝対称的な notMe 交換。prev（適用前）と next（適用後）を見比べて演出データを組み立てる。
   * 自分が当事者（actor/target）なら、自分が手放した「元のnot me」は相手のものになった瞬間に
   * 見える情報になるので、そのカードを開示する。新しく受け取った札は引き続き自分からは見えない。
   */
  /** 奪った側の手札ペナルティで実際にどちらの1枚が入れ替わったかを前後比較で特定する（一方的な略奪の時のみ発生） */
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

  /**
   * 奪う：prev（適用前）を見て、target が既に actor から奪われていた（＝お互い奪い合いの
   * 特殊ケース）かどうかを判定し、演出データを組み立てる。
   * - お互い奪い合いの場合：単純な notMe 交換として演出する（山札もペナルティも関与しない）
   * - 通常時：actor が target の notMe を一方的に奪う。奪われた側にはヒント、奪った側には
   *   手札ペナルティを明示する
   */
  function buildStealEvent(prev: GameState, next: GameState, actorId: number, targetId: number): ExchangeEventData {
    const actorBefore = prev.players.find((p) => p.id === actorId)!;
    const targetBefore = prev.players.find((p) => p.id === targetId)!;
    const actorAfter = next.players.find((p) => p.id === actorId)!;
    const targetAfter = next.players.find((p) => p.id === targetId)!;

    if (actorBefore.stolenBy === targetId) {
      // お互い奪い合いの特殊ケース
      const perspective: 'actor' | 'target' | 'spectator' = actorBefore.isHuman
        ? 'actor'
        : targetBefore.isHuman
          ? 'target'
          : 'spectator';
      return {
        type: 'steal',
        mode: 'reciprocalSwap',
        actorName: actorBefore.name,
        targetName: targetBefore.name,
        perspective,
        yourOldCard:
          perspective === 'actor' ? targetAfter.notMe : perspective === 'target' ? actorAfter.notMe : null,
        spectatorCards:
          perspective === 'spectator'
            ? { actorOldCard: actorBefore.notMe, targetOldCard: targetBefore.notMe }
            : null,
      };
    }

    return {
      type: 'steal',
      mode: 'oneSided',
      actorName: actorBefore.name,
      targetName: targetBefore.name,
      actorIsHuman: actorBefore.isHuman,
      targetIsHuman: targetBefore.isHuman,
      revealedCard: actorBefore.isHuman ? null : targetBefore.notMe,
      hint: targetAfter.hint,
      holePenalty: actorBefore.isHuman ? findHolePenalty(prev, next, actorId) : null,
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

  /** そのラウンドの AI 全員の賭け判断と勝率をまとめて計算 */
  function computeAiRound(s: GameState, r: 1 | 2) {
    const bets: Record<number, BetChoice> = {};
    const equities: Record<number, number> = {};
    for (const p of activePlayers(s)) {
      if (p.isHuman) continue;
      const { choice, winProb } = decideBet(s, p.id, personalityFor(p.id), rng, r);
      bets[p.id] = choice;
      equities[p.id] = winProb;
    }
    return { bets, equities };
  }

  function appendLog(msg: string) {
    setLog((l) => [...l, msg].slice(-6));
  }

  function appendBetLog(s: GameState, choices: Record<number, BetChoice>) {
    for (const p of activePlayers(s)) {
      const choice = choices[p.id];
      if (choice === undefined) continue;
      if (choice === 'fold') appendLog(S.FOLD_LOG(p.name));
      else if (choice !== 'stay') appendLog(S.BET_LOG(p.name, betAmountFor(p, choice)));
    }
  }

  // ----- ハンド開始 -----

  function dealNext(base: GameState, suddenDeath: boolean) {
    const next = dealHand(
      suddenDeath ? { ...base, isSuddenDeath: true, totalHands: base.totalHands + 1 } : base,
    );
    const { bets, equities } = computeAiRound(next, 1);
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
    setAiBets(bets);
    setEmotes(newEmotes);
    setDecisionReveal(null);
    setShowdownOpen(false);
    sfx.play('deal');
    analytics.track('hand_start', { hand: next.handNumber, suddenDeath });
    if (suddenDeath) appendLog(`${S.SUDDEN_DEATH_BADGE}！`);
  }

  function startGame() {
    if (!canSitDown()) return;
    sitDown();
    setChipBalance(getBalance());
    setChipDelta(0);
    setLog([]);
    analytics.track('game_start');
    dealNext(createGame(rng, 4), false);
    setShowVS(true);
    setScreen('game');
  }

  function handleTitleStart() {
    sfx.play('tap');
    if (!canSitDown()) return;
    if (localStorage.getItem(TUTORIAL_SEEN_KEY)) startGame();
    else setScreen('tutorial');
  }

  function handleTutorialFinish() {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
    startGame();
  }

  // ----- せーの同時公開 -----

  function runDecisionReveal(s: GameState, choices: Record<number, BetChoice>, r: 1 | 2) {
    setDecisionReveal(choices);
    const ids = activePlayers(s).map((p) => p.id);
    ids.forEach((id, i) => {
      window.setTimeout(() => sfx.play(choices[id] === 'fold' ? 'fold' : 'pop'), 250 + i * 220);
    });
    const total = 250 + ids.length * 220 + 900;
    window.setTimeout(() => {
      setDecisionReveal(null);
      const next = applyBets(s, choices);
      appendBetLog(s, choices);
      if (r === 1 && activePlayers(next).length > 1) {
        setExchangeQueue(activePlayers(next).map((p) => p.id));
        setState({ ...next, phase: 'exchange' });
      } else {
        resolveAndShow(next);
      }
    }, total);
  }

  function handleBet(choice: BetChoice) {
    if (!state || !aiBets) return;
    sfx.play('tap');
    analytics.track(choice === 'fold' ? 'fold' : 'bet', { round, choice });
    const choices: Record<number, BetChoice> = { ...aiBets, 0: choice };
    setAiBets(null);
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
      const human = state.players.find((p) => p.isHuman)!;
      const { delta, newBalance } = cashOut(human.stack);
      setChipDelta(delta);
      setChipBalance(newBalance);
      setDailyBonus(getDailyBonusStatus());
      analytics.track('game_end', { stack: human.stack, chipDelta: delta });
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
        const { bets, equities } = computeAiRound(revealed, 2);

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
          window.setTimeout(() => runDecisionReveal(revealed, bets, 2), 1100);
        } else {
          setAiBets(bets);
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
    else {
      const target = current.players.find((p) => p.id === action.targetId)!;
      appendLog(
        actor.stolenBy === target.id
          ? S.RECIPROCAL_STEAL_LOG(actor.name, target.name)
          : S.EXCHANGE_STEAL_LOG(actor.name, target.name),
      );
    }
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

    if ((state.phase === 'decision1' || state.phase === 'decision2') && aiBets) {
      const human = state.players.find((p) => p.isHuman)!;
      if (human.folded) return <ActionBar mode="waiting" />;
      return <ActionBar mode="decision" stack={human.stack} onBet={handleBet} />;
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
        {screen === 'title' && (
          <Title
            onStart={handleTitleStart}
            chipBalance={chipBalance}
            buyInCost={SIT_DOWN_STACK}
            canAfford={canSitDown()}
            dailyBonus={dailyBonus}
            onClaimBonus={handleClaimBonus}
            displayName={displayName}
            onRename={handleRename}
          />
        )}
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
            {showVS && <VSIntro onDone={() => setShowVS(false)} />}
          </>
        )}

        {screen === 'result' && state && (
          <ResultScreen
            players={state.players}
            onPlayAgain={handlePlayAgain}
            chipDelta={chipDelta}
            chipBalance={chipBalance}
            canAfford={canSitDown()}
            dailyBonus={dailyBonus}
            onClaimBonus={handleClaimBonus}
          />
        )}
      </main>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} muted={muted} onToggleMute={toggleMute} />}
    </div>
  );
}
