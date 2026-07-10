// ハンド進行の状態機械。UI から独立した純粋ロジック（サーバー権威型へそのまま移植可能）。
//
// チップ制：各プレイヤーはゲーム開始時にウォレットから持ち込んだ「スタック」を持ち、
// 各ハンドでアンティ＋2回の賭けラウンド（①②の降り判断のタイミング）でポットにチップを積む。
// ショーダウンの勝者がポットを総取りする。賭けは「せーの」同時制で、フォールド／ステイ／
// レイズ／大勝負から選ぶ。大きく賭けるほど勝てば大きく、負ければ大きく失う（＝自信・ブラフの読み合い）。

import { type Card, type Rng, createDeck, shuffle, isRed, isFaceCard } from './cards';
import { evaluateHand, compareHands, type HandRank } from './evaluator';

export type Phase =
  | 'deal'
  | 'decision1'
  | 'exchange'
  | 'flop'
  | 'decision2'
  | 'showdown'
  | 'handEnd'
  | 'gameEnd';

export type HintKind = 'parity' | 'range' | 'face' | 'color';

export interface Hint {
  kind: HintKind;
  label: string;
}

/** 各ハンドの賭け選択。せーの同時制で選ぶ */
export type BetChoice = 'fold' | 'stay' | 'raise' | 'big';
export type TellKind = 'snap' | 'steady' | 'tank' | 'panic';

export interface DecisionTell {
  choice: BetChoice;
  tell: TellKind;
  wavered: boolean;
  reaction: string;
  elapsedMs: number;
}

export type BetInput = BetChoice | DecisionTell;

export function normalizeBetInput(input: BetInput): DecisionTell {
  if (typeof input !== 'string') return input;
  return { choice: input, tell: 'steady', wavered: false, reaction: '…', elapsedMs: 0 };
}

/** ゲーム開始時に全員へ配るスタック（ウォレットから持ち込むチップ） */
export const STARTING_STACK = 300;
/** 各ハンド開始時に全員が積むアンティ */
export const ANTE = 10;
/** 賭け選択ごとの、そのラウンドでポットに積むチップ */
export const BET_AMOUNTS: Record<Exclude<BetChoice, 'fold'>, number> = {
  stay: 15,
  raise: 40,
  big: 90,
};

export function betLabel(choice: BetChoice): string {
  if (choice === 'fold') return 'フォールド';
  return `+${BET_AMOUNTS[choice]}`;
}

export interface PlayerState {
  id: number;
  name: string;
  isHuman: boolean;
  hole: Card[]; // 手札2枚（本人のみ見える）
  notMe: Card; // 本人には見えず、他人には見える
  folded: boolean;
  usedExchange: boolean;
  stack: number; // 手持ちチップ
  staked: number; // このハンドでポットに積んだ累計
  hint: Hint | null; // 現在の notMe についてのヒント。配札時に必ず1つ付与され、notMe が変わるたびに引き直す
  stolenBy: number | null; // このハンドで自分の notMe を奪った相手の id（お互い奪い合いの検知用）
  lastTell: DecisionTell | null; // 直近のベットで漏れたテル（思考時間・迷い・リアクション）
}

export type ExchangeAction =
  | { type: 'pass' }
  | { type: 'drawDeck' }
  | { type: 'steal'; targetId: number };

export interface HandResult {
  winnerIds: number[];
  reason: 'showdown' | 'walkover'; // walkover = 不戦勝（残り1人）
  ranks: Record<number, HandRank>;
  pot: number;
  /** このハンドでの各プレイヤーの純チップ増減（勝者は +ポット−自分の積み、他は −積み） */
  chipDelta: Record<number, number>;
}

export interface GameState {
  players: PlayerState[];
  deck: Card[];
  community: Card[];
  handNumber: number; // 1-indexed
  totalHands: number;
  phase: Phase;
  lastResult: HandResult | null;
  isSuddenDeath: boolean;
  pot: number;
  /** このハンド開始時（アンティ前）の各プレイヤーのスタック。純増減の算出に使う */
  handStartStack: Record<number, number>;
  rng: Rng;
}

const NAMES = ['あなた', 'ミライ', 'ケイ', 'ソラ'];

export function createGame(rng: Rng, playerCount = 4): GameState {
  const players: PlayerState[] = Array.from({ length: playerCount }, (_, i) => ({
    id: i,
    name: NAMES[i] ?? `Player${i}`,
    isHuman: i === 0,
    hole: [],
    notMe: { suit: 'S', rank: 2 },
    folded: false,
    usedExchange: false,
    stack: STARTING_STACK,
    staked: 0,
    hint: null,
    stolenBy: null,
    lastTell: null,
  }));
  return {
    players,
    deck: [],
    community: [],
    handNumber: 0,
    totalHands: 4,
    phase: 'gameEnd',
    lastResult: null,
    isSuddenDeath: false,
    pot: 0,
    handStartStack: {},
    rng,
  };
}

export function dealHand(state: GameState): GameState {
  const deck = shuffle(createDeck(), state.rng);
  let cursor = 0;
  const handStartStack: Record<number, number> = {};
  let pot = 0;
  const players = state.players.map((p) => {
    handStartStack[p.id] = p.stack;
    const ante = Math.min(ANTE, p.stack);
    pot += ante;
    const hole = [deck[cursor++], deck[cursor++]];
    const notMe = deck[cursor++];
    return {
      ...p,
      hole,
      notMe,
      folded: false,
      usedExchange: false,
      stack: p.stack - ante,
      staked: ante,
      // 配札時点で全員に自分の notMe についてのベースヒントを1つ与える
      hint: randomHint(notMe, state.rng),
      stolenBy: null,
      lastTell: null,
    };
  });
  // 場札の1枚目は配札と同時に公開する。判断材料ゼロでの①降り判断を避けるため
  const community = [deck[cursor++]];
  return {
    ...state,
    players,
    deck: deck.slice(cursor),
    community,
    handNumber: state.handNumber + 1,
    phase: 'decision1',
    lastResult: null,
    pot,
    handStartStack,
  };
}

export function activePlayers(state: GameState): PlayerState[] {
  return state.players.filter((p) => !p.folded);
}

/** そのラウンドで実際にポットへ積む額（スタック不足なら残り全部＝オールイン） */
export function betAmountFor(player: PlayerState, choice: BetChoice): number {
  if (choice === 'fold') return 0;
  return Math.min(BET_AMOUNTS[choice], player.stack);
}

/**
 * 同時制の賭け判断。各プレイヤーの選択（フォールド／ステイ／レイズ／大勝負）を適用し、
 * ステイ以上はそのラウンドのチップをポットへ積む。
 */
export function applyBets(state: GameState, choices: Record<number, BetInput>): GameState {
  let pot = state.pot;
  const players = state.players.map((p) => {
    if (p.folded) return p;
    const input = choices[p.id];
    if (input === undefined) return p;
    const tell = normalizeBetInput(input);
    const choice = tell.choice;
    if (choice === 'fold') return { ...p, folded: true, lastTell: tell };
    const amount = betAmountFor(p, choice);
    pot += amount;
    return { ...p, stack: p.stack - amount, staked: p.staked + amount, lastTell: tell };
  });
  return { ...state, players, pot };
}

function randomHint(card: Card, rng: Rng): Hint {
  const options: Hint[] = [
    { kind: 'parity', label: card.rank % 2 === 0 ? '偶数' : '奇数' },
    { kind: 'range', label: card.rank >= 8 ? '8以上' : '7以下' },
    { kind: 'face', label: isFaceCard(card) || card.rank === 14 ? '絵札かA' : '絵札でもAでもない' },
    { kind: 'color', label: isRed(card) ? '赤' : '黒' },
  ];
  return options[Math.floor(rng() * options.length)];
}

export function applyExchange(state: GameState, actorId: number, action: ExchangeAction): GameState {
  const deck = state.deck.slice();
  const players = state.players.map((p) => ({ ...p }));
  const actor = players.find((p) => p.id === actorId);
  if (!actor || actor.folded || actor.usedExchange) return state;

  if (action.type === 'drawDeck') {
    const newCard = deck.shift();
    if (newCard) {
      deck.push(actor.notMe);
      actor.notMe = newCard;
      actor.hint = randomHint(newCard, state.rng);
    }
    actor.usedExchange = true;
  } else if (action.type === 'steal') {
    const target = players.find((p) => p.id === action.targetId);
    if (!target || target.id === actor.id || target.folded) return state;

    if (actor.stolenBy === target.id) {
      // お互い奪い合いの特殊ケース：target が先にこのハンドで actor から奪っていた
      // （A→B の後の B→A）。二重にペナルティ／補充を重ねると挙動が読みにくくなるため、
      // このケースだけは単純に現在の notMe を交換する形で決着する
      const actorOld = actor.notMe;
      const targetOld = target.notMe;
      actor.notMe = targetOld;
      target.notMe = actorOld;
      actor.usedExchange = true;
      actor.hint = randomHint(actor.notMe, state.rng);
      target.hint = randomHint(target.notMe, state.rng);
      actor.stolenBy = null;
    } else {
      // 通常時は一方的な略奪：actor が target の notMe を奪う
      const stolen = target.notMe;
      // 奪った側のペナルティ：手札1枚をランダムに山札交換（見ずに引き替え）
      const idx = Math.floor(state.rng() * actor.hole.length);
      const replaced = deck.shift();
      if (replaced) {
        deck.push(actor.hole[idx]);
        actor.hole = actor.hole.map((c, i) => (i === idx ? replaced : c));
      }
      actor.notMe = stolen;
      actor.usedExchange = true;
      target.stolenBy = actor.id;

      // 奪われた側の補填：新しい notMe とヒント
      const refill = deck.shift();
      if (refill) {
        target.notMe = refill;
        target.hint = randomHint(refill, state.rng);
      }
    }
  }
  // pass は何もしない

  return { ...state, deck, players };
}

/** 交換フェーズ後に場札の2枚目を公開する（1枚目は配札時に公開済み） */
export function revealCommunity(state: GameState): GameState {
  const deck = state.deck.slice();
  const community = [...state.community, deck.shift()!];
  return { ...state, deck, community, phase: 'decision2' };
}

function fullHand(p: PlayerState, community: Card[]): Card[] {
  return [...p.hole, p.notMe, ...community];
}

export function resolveShowdown(state: GameState): { state: GameState; result: HandResult } {
  const remaining = activePlayers(state);
  const pot = state.pot;

  const buildDelta = (players: PlayerState[]): Record<number, number> => {
    const delta: Record<number, number> = {};
    for (const p of players) delta[p.id] = p.stack - (state.handStartStack[p.id] ?? p.stack);
    return delta;
  };

  if (remaining.length <= 1) {
    const winner = remaining[0];
    const scoredPlayers = state.players.map((p) =>
      winner && p.id === winner.id ? { ...p, stack: p.stack + pot } : p,
    );
    const result: HandResult = {
      winnerIds: winner ? [winner.id] : [],
      reason: 'walkover',
      ranks: {},
      pot,
      chipDelta: buildDelta(scoredPlayers),
    };
    return {
      state: { ...state, players: scoredPlayers, phase: 'handEnd', lastResult: result, pot: 0 },
      result,
    };
  }

  const ranks: Record<number, HandRank> = {};
  for (const p of remaining) ranks[p.id] = evaluateHand(fullHand(p, state.community));

  let best = remaining[0];
  for (const p of remaining.slice(1)) {
    if (compareHands(ranks[p.id], ranks[best.id]) > 0) best = p;
  }
  const winnerIds = remaining
    .filter((p) => compareHands(ranks[p.id], ranks[best.id]) === 0)
    .map((p) => p.id);

  // ポットは勝者で山分け。端数は最初の勝者に寄せる
  const share = Math.floor(pot / winnerIds.length);
  const remainder = pot - share * winnerIds.length;
  const scoredPlayers = state.players.map((p) => {
    if (!winnerIds.includes(p.id)) return p;
    const extra = p.id === winnerIds[0] ? remainder : 0;
    return { ...p, stack: p.stack + share + extra };
  });

  const result: HandResult = {
    winnerIds,
    reason: 'showdown',
    ranks,
    pot,
    chipDelta: buildDelta(scoredPlayers),
  };
  return {
    state: { ...state, players: scoredPlayers, phase: 'handEnd', lastResult: result, pot: 0 },
    result,
  };
}

export function isGameOver(state: GameState): boolean {
  return state.handNumber >= state.totalHands;
}

/** 最終順位はスタック（持ちチップ）で決まる */
export function gameWinners(state: GameState): PlayerState[] {
  const top = Math.max(...state.players.map((p) => p.stack));
  return state.players.filter((p) => p.stack === top);
}
