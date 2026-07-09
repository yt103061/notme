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
import { Table, type FlightLegSpec } from './components/Table';
import { ActionBar } from './components/ActionBar';
import { ShowdownReveal } from './components/ShowdownReveal';
import { ResultScreen } from './components/ResultScreen';
import { HelpModal } from './components/HelpModal';
import { RankingScreen } from './components/RankingScreen';
import { AccountModal } from './components/AccountModal';
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
  getAvatar,
  setAvatar,
  recordGameCompleted,
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
  const [flight, setFlight] = useState<{ legs: FlightLegSpec[]; nextState: GameState } | null>(null);
  const [heroToast, setHeroToast] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showVS, setShowVS] = useState(false);
  const [chipBalance, setChipBalance] = useState(() => getBalance());
  const [dailyBonus, setDailyBonus] = useState<DailyBonusStatus>(() => getDailyBonusStatus());
  const [chipDelta, setChipDelta] = useState(0);
  const [displayName, setName] = useState(() => getDisplayName());
  const [avatar, setAvatarState] = useState(() => getAvatar());

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

  function handleChangeAvatar(next: string) {
    setAvatarState(setAvatar(next));
  }

  function handleClaimBonus() {
    const result = claimDailyBonus();
    if (!result) return;
    sfx.play('win');
    setChipBalance(result.newBalance);
    setDailyBonus(getDailyBonusStatus());
  }

  /** そのプレイヤーの notMe が「表向きに見える」か「本人には見えない」かは、その人が人間かどうかだけで決まる */
  function appearanceForSeat(isHuman: boolean): 'faceUp' | 'hiddenSelf' {
    return isHuman ? 'hiddenSelf' : 'faceUp';
  }

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
   * 特殊ケース）かどうかを判定し、「カードが実際に飛ぶ」演出のための座席間フライトを組み立てる。
   * - お互い奪い合いの場合：actor↔target 間で同時に2本、交差して飛ぶ
   * - 通常時：target 座席から actor 座席へ1本。奪われた側にヒント、奪った側に手札ペナルティの
   *   トーストを添える（人間が当事者の時だけ）
   */
  function buildStealFlight(
    prev: GameState,
    next: GameState,
    actorId: number,
    targetId: number,
  ): { legs: FlightLegSpec[]; toast: string | null } {
    const actorBefore = prev.players.find((p) => p.id === actorId)!;
    const targetBefore = prev.players.find((p) => p.id === targetId)!;

    if (actorBefore.stolenBy === targetId) {
      return {
        legs: [
          {
            id: 'recip-a',
            card: actorBefore.notMe,
            fromSeat: actorId,
            toSeat: targetId,
            startAppearance: appearanceForSeat(actorBefore.isHuman),
            endAppearance: appearanceForSeat(targetBefore.isHuman),
          },
          {
            id: 'recip-b',
            card: targetBefore.notMe,
            fromSeat: targetId,
            toSeat: actorId,
            startAppearance: appearanceForSeat(targetBefore.isHuman),
            endAppearance: appearanceForSeat(actorBefore.isHuman),
          },
        ],
        toast: null,
      };
    }

    const targetAfter = next.players.find((p) => p.id === targetId)!;
    let toast: string | null = null;
    if (targetBefore.isHuman && targetAfter.hint) {
      toast = `${S.EVENT_HINT_GAINED}：${targetAfter.hint.label}`;
    }
    if (actorBefore.isHuman && findHolePenalty(prev, next, actorId)) {
      toast = S.EVENT_PENALTY_LABEL;
    }

    return {
      legs: [
        {
          id: 'steal',
          card: targetBefore.notMe,
          fromSeat: targetId,
          toSeat: actorId,
          startAppearance: appearanceForSeat(targetBefore.isHuman),
          endAppearance: appearanceForSeat(actorBefore.isHuman),
        },
      ],
      toast,
    };
  }

  /** 山札交換：座席↔卓中央へ2本（旧カードが中央へ、新カードが座席へ、少し遅れて） */
  function buildDeckSwapFlight(
    prev: GameState,
    next: GameState,
    actorId: number,
  ): { legs: FlightLegSpec[]; toast: string | null } {
    const before = prev.players.find((p) => p.id === actorId)!;
    const after = next.players.find((p) => p.id === actorId)!;
    const appearance = appearanceForSeat(before.isHuman);
    return {
      legs: [
        {
          id: 'deck-out',
          card: before.notMe,
          fromSeat: actorId,
          toSeat: 'center',
          startAppearance: appearance,
          endAppearance: appearance,
        },
        {
          id: 'deck-in',
          card: after.notMe,
          fromSeat: 'center',
          toSeat: actorId,
          startAppearance: appearance,
          endAppearance: appearance,
          delayMs: 260,
        },
      ],
      toast: null,
    };
  }

  function showHeroToast(text: string) {
    setHeroToast(text);
    window.setTimeout(() => setHeroToast((t) => (t === text ? null : t)), 2200);
  }

  /** カードフライトが着地した瞬間に、保留していた状態遷移をまとめてコミットする */
  function handleFlightSettle() {
    if (!flight) return;
    setState(flight.nextState);
    setFlight(null);
    setExchangeQueue((q) => q.slice(1));
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
      void recordGameCompleted();
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
    // カードフライト中は次のアクションを開始しない（着地まで足止めする）
    if (flight) return;

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
        const { legs, toast } = buildStealFlight(state, next, currentId, action.targetId);
        setFlight({ legs, nextState: next });
        if (toast) showHeroToast(toast);
      } else if (action.type === 'drawDeck') {
        sfx.play('exchange');
        const { legs, toast } = buildDeckSwapFlight(state, next, currentId);
        setFlight({ legs, nextState: next });
        if (toast) showHeroToast(toast);
      } else {
        // pass：フライトが発生しないので即座にコミットして次の手番へ
        setState(next);
        setExchangeQueue((q) => q.slice(1));
      }
    }, 950);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, exchangeQueue, flight]);

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
      const { legs, toast } = buildStealFlight(state, next, 0, action.targetId);
      setFlight({ legs, nextState: next });
      if (toast) showHeroToast(toast);
    } else if (action.type === 'drawDeck') {
      const { legs, toast } = buildDeckSwapFlight(state, next, 0);
      setFlight({ legs, nextState: next });
      if (toast) showHeroToast(toast);
    } else {
      setState(next);
      setExchangeQueue((q) => q.slice(1));
    }
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
    if (decisionReveal) return <ActionBar mode="waiting" message={S.REVEAL_WAITING} />;
    // カードフライト中は同じ手番のアクションを再度受け付けない
    if (flight) return <ActionBar mode="waiting" />;

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
            avatar={avatar}
            onChangeAvatar={handleChangeAvatar}
            onOpenRanking={() => setRankingOpen(true)}
            onOpenAccount={() => setAccountOpen(true)}
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
              flight={flight?.legs ?? null}
              onFlightSettle={handleFlightSettle}
              heroToast={heroToast}
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
      {rankingOpen && <RankingScreen onClose={() => setRankingOpen(false)} />}
      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
    </div>
  );
}
