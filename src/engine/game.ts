// ハンド進行の状態機械。UI から独立した純粋ロジック（サーバー権威型へそのまま移植可能）。

import { type Card, type Rng, createDeck, shuffle, isRed, isFaceCard } from './cards';
import { evaluateFive, compareHands, type HandRank } from './evaluator';

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

export interface PlayerState {
  id: number;
  name: string;
  isHuman: boolean;
  hole: Card[]; // 手札2枚（本人のみ見える）
  notMe: Card; // 本人には見えず、他人には見える
  folded: boolean;
  usedExchange: boolean;
  score: number;
  hint: Hint | null; // 現在の notMe についてのヒント。配札時に必ず1つ付与され、notMe が変わるたびに引き直す
  stolenBy: number | null; // このハンドで自分の notMe を奪った相手の id（お互い奪い合いの検知用）
}

export type ExchangeAction =
  | { type: 'pass' }
  | { type: 'drawDeck' }
  | { type: 'steal'; targetId: number };

export interface HandResult {
  winnerIds: number[];
  reason: 'showdown' | 'walkover'; // walkover = 不戦勝（残り1人）
  ranks: Record<number, HandRank>;
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
    score: 0,
    hint: null,
    stolenBy: null,
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
    rng,
  };
}

export function dealHand(state: GameState): GameState {
  const deck = shuffle(createDeck(), state.rng);
  let cursor = 0;
  const players = state.players.map((p) => {
    const hole = [deck[cursor++], deck[cursor++]];
    const notMe = deck[cursor++];
    return {
      ...p,
      hole,
      notMe,
      folded: false,
      usedExchange: false,
      // 配札時点で全員に自分の notMe についてのベースヒントを1つ与える
      hint: randomHint(notMe, state.rng),
      stolenBy: null,
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
  };
}

export function activePlayers(state: GameState): PlayerState[] {
  return state.players.filter((p) => !p.folded);
}

/** 同時制の降り判断。降りたプレイヤーの id 配列を渡す */
export function applyFolds(state: GameState, foldedIds: number[]): GameState {
  const players = state.players.map((p) =>
    foldedIds.includes(p.id) ? { ...p, folded: true } : p,
  );
  return { ...state, players };
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

  if (remaining.length <= 1) {
    const winner = remaining[0];
    const scoredPlayers = state.players.map((p) => {
      if (winner && p.id === winner.id) return { ...p, score: p.score + 1 };
      return p;
    });
    const result: HandResult = {
      winnerIds: winner ? [winner.id] : [],
      reason: 'walkover',
      ranks: {},
    };
    return { state: { ...state, players: scoredPlayers, phase: 'handEnd', lastResult: result }, result };
  }

  const ranks: Record<number, HandRank> = {};
  for (const p of remaining) ranks[p.id] = evaluateFive(fullHand(p, state.community));

  let best = remaining[0];
  for (const p of remaining.slice(1)) {
    if (compareHands(ranks[p.id], ranks[best.id]) > 0) best = p;
  }
  const winnerIds = remaining
    .filter((p) => compareHands(ranks[p.id], ranks[best.id]) === 0)
    .map((p) => p.id);

  const scoredPlayers = state.players.map((p) => {
    if (p.folded) return p;
    if (winnerIds.includes(p.id)) return { ...p, score: p.score + (winnerIds.length > 1 ? 1 : 2) };
    return { ...p, score: p.score - 1 };
  });

  const result: HandResult = { winnerIds, reason: 'showdown', ranks };
  return { state: { ...state, players: scoredPlayers, phase: 'handEnd', lastResult: result }, result };
}

export function isGameOver(state: GameState): boolean {
  return state.handNumber >= state.totalHands;
}

export function gameWinners(state: GameState): PlayerState[] {
  const top = Math.max(...state.players.map((p) => p.score));
  return state.players.filter((p) => p.score === top);
}
