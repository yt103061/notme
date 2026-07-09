// ハンド進行の状態機械。src/engine/game.ts のサーバー実行用コピー（内容は同一に保つ）。

import { type Card, type Rng, createDeck, shuffle, isRed, isFaceCard } from './cards.ts';
import { evaluateHand, compareHands, type HandRank } from './evaluator.ts';

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

export type BetChoice = 'fold' | 'stay' | 'raise' | 'big';

export const STARTING_STACK = 300;
export const ANTE = 10;
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
  hole: Card[];
  notMe: Card;
  folded: boolean;
  usedExchange: boolean;
  stack: number;
  staked: number;
  hint: Hint | null;
  stolenBy: number | null;
}

export type ExchangeAction =
  | { type: 'pass' }
  | { type: 'drawDeck' }
  | { type: 'steal'; targetId: number };

export interface HandResult {
  winnerIds: number[];
  reason: 'showdown' | 'walkover';
  ranks: Record<number, HandRank>;
  pot: number;
  chipDelta: Record<number, number>;
}

export interface GameState {
  players: PlayerState[];
  deck: Card[];
  community: Card[];
  handNumber: number;
  totalHands: number;
  phase: Phase;
  lastResult: HandResult | null;
  isSuddenDeath: boolean;
  pot: number;
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
      hint: randomHint(notMe, state.rng),
      stolenBy: null,
    };
  });
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

export function betAmountFor(player: PlayerState, choice: BetChoice): number {
  if (choice === 'fold') return 0;
  return Math.min(BET_AMOUNTS[choice], player.stack);
}

export function applyBets(state: GameState, choices: Record<number, BetChoice>): GameState {
  let pot = state.pot;
  const players = state.players.map((p) => {
    if (p.folded) return p;
    const choice = choices[p.id];
    if (choice === undefined) return p;
    if (choice === 'fold') return { ...p, folded: true };
    const amount = betAmountFor(p, choice);
    pot += amount;
    return { ...p, stack: p.stack - amount, staked: p.staked + amount };
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
      const actorOld = actor.notMe;
      const targetOld = target.notMe;
      actor.notMe = targetOld;
      target.notMe = actorOld;
      actor.usedExchange = true;
      actor.hint = randomHint(actor.notMe, state.rng);
      target.hint = randomHint(target.notMe, state.rng);
      actor.stolenBy = null;
    } else {
      const stolen = target.notMe;
      const idx = Math.floor(state.rng() * actor.hole.length);
      const replaced = deck.shift();
      if (replaced) {
        deck.push(actor.hole[idx]);
        actor.hole = actor.hole.map((c, i) => (i === idx ? replaced : c));
      }
      actor.notMe = stolen;
      actor.usedExchange = true;
      target.stolenBy = actor.id;

      const refill = deck.shift();
      if (refill) {
        target.notMe = refill;
        target.hint = randomHint(refill, state.rng);
      }
    }
  }

  return { ...state, deck, players };
}

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

export function gameWinners(state: GameState): PlayerState[] {
  const top = Math.max(...state.players.map((p) => p.stack));
  return state.players.filter((p) => p.stack === top);
}
