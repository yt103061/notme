// オンライン対戦のサーバー権威オーケストレーション。
// src/engine/game.ts（純関数・副作用なし）をそのまま再利用し、jsonb に永続化できる形へ
// ラップする。GameState.rng は関数なので直接は保存できない。代わりに mulberry32 の内部
// カウンタ（rngState）だけを永続化し、呼び出しのたびに rng クロージャを再構築する。

import {
  type GameState,
  type BetChoice,
  type ExchangeAction,
  createGame,
  dealHand,
  applyBets,
  applyExchange,
  revealCommunity,
  resolveShowdown,
  isGameOver,
  gameWinners,
  activePlayers,
} from './engine/game.ts';
import { type Card, type Rng } from './engine/cards.ts';

export function makeSerializableRng(seedState: number): { rng: Rng; getState: () => number } {
  let a = seedState >>> 0;
  const rng: Rng = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { rng, getState: () => a };
}

/** DB に保存する試合全体の形。game からは rng（関数）を除いたものを保持する */
export interface StoredMatch {
  game: Omit<GameState, 'rng'>;
  rngState: number;
  /** decision1/decision2 でこれまでに集まった賭け選択。全員揃うと一括適用される */
  pendingBets: Record<number, BetChoice> | null;
  /** exchange フェーズの残り手番（先頭が現在の手番） */
  exchangeQueue: number[] | null;
}

function withRng(game: Omit<GameState, 'rng'>, rng: Rng): GameState {
  return { ...game, rng } as GameState;
}

function stripRng(game: GameState): Omit<GameState, 'rng'> {
  const { rng: _rng, ...rest } = game;
  return rest;
}

export function initMatch(seed: number, seatNames: Record<number, string>): StoredMatch {
  const playerCount = Object.keys(seatNames).length;
  const { rng, getState } = makeSerializableRng(seed);
  let game = createGame(rng, playerCount);
  game = {
    ...game,
    players: game.players.map((p) => ({ ...p, isHuman: true, name: seatNames[p.id] ?? p.name })),
  };
  game = dealHand(game);
  return { game: stripRng(game), rngState: getState(), pendingBets: {}, exchangeQueue: null };
}

function dealNextHand(match: StoredMatch, suddenDeath: boolean): StoredMatch {
  const { rng, getState } = makeSerializableRng(match.rngState);
  let game = withRng(match.game, rng);
  if (suddenDeath) game = { ...game, isSuddenDeath: true, totalHands: game.totalHands + 1 };
  game = dealHand(game);
  return { ...match, game: stripRng(game), rngState: getState(), pendingBets: {}, exchangeQueue: null };
}

/**
 * 賭け選択を1人分投入する。全員（フォールドしていない全員）が出揃うまではバッファするだけ。
 * 揃ったら一括で applyBets し、①なら exchange フェーズへ、②なら ショーダウンへ進める。
 * 不正な手番・フェーズ違いは何もせずそのまま返す（サーバー側で必ず弾く）。
 */
export function submitBet(match: StoredMatch, seat: number, choice: BetChoice): StoredMatch {
  const { rng, getState } = makeSerializableRng(match.rngState);
  const game = withRng(match.game, rng);
  if (game.phase !== 'decision1' && game.phase !== 'decision2') return match;
  const active = activePlayers(game);
  if (!active.some((p) => p.id === seat)) return match;
  if (match.pendingBets?.[seat] !== undefined) return match; // 二重投票を無視

  const pending = { ...(match.pendingBets ?? {}), [seat]: choice };
  if (Object.keys(pending).length < active.length) {
    return { ...match, game: stripRng(game), rngState: getState(), pendingBets: pending };
  }

  const wasRound1 = game.phase === 'decision1';
  const applied = applyBets(game, pending);
  if (wasRound1 && activePlayers(applied).length > 1) {
    const queue = activePlayers(applied).map((p) => p.id);
    return {
      ...match,
      game: stripRng({ ...applied, phase: 'exchange' }),
      rngState: getState(),
      pendingBets: null,
      exchangeQueue: queue,
    };
  }
  const { state: resolved } = resolveShowdown(applied);
  return { ...match, game: stripRng(resolved), rngState: getState(), pendingBets: null, exchangeQueue: null };
}

/** 交換フェーズの1手番分。順番違いは無視する */
export function submitExchange(match: StoredMatch, seat: number, action: ExchangeAction): StoredMatch {
  const { rng, getState } = makeSerializableRng(match.rngState);
  const game = withRng(match.game, rng);
  if (game.phase !== 'exchange') return match;
  const queue = match.exchangeQueue ?? [];
  if (queue[0] !== seat) return match;

  const next = applyExchange(game, seat, action);
  const restQueue = queue.slice(1);
  if (restQueue.length === 0) {
    const revealed = revealCommunity(next);
    return { ...match, game: stripRng(revealed), rngState: getState(), pendingBets: {}, exchangeQueue: null };
  }
  return { ...match, game: stripRng(next), rngState: getState(), exchangeQueue: restQueue };
}

/** ショーダウン後「次のハンドへ」。誰が呼んでも進む（全員待たされるのを避けるため） */
export function continueMatch(match: StoredMatch): { match: StoredMatch; done: boolean } {
  const { rng, getState } = makeSerializableRng(match.rngState);
  const game = withRng(match.game, rng);
  if (game.phase !== 'handEnd') return { match, done: false };

  if (isGameOver(game)) {
    if (gameWinners(game).length > 1) {
      return {
        match: dealNextHand({ ...match, game: stripRng(game), rngState: getState() }, true),
        done: false,
      };
    }
    return {
      match: { ...match, game: stripRng({ ...game, phase: 'gameEnd' }), rngState: getState() },
      done: true,
    };
  }
  return { match: dealNextHand({ ...match, game: stripRng(game), rngState: getState() }, false), done: false };
}

const REDACTED_CARD: Card = { suit: 'S', rank: 0 };

/**
 * 指定した席の視点に絞り込んだ GameState を作る。
 * 本人：hole は見える、notMe はショーダウンまで隠す（自分の not me だけ見えない、が核）。
 * 他人：hole はショーダウンまで隠す、notMe は常に見える（相手の not me は自分に見えている）。
 * デッキの残り札は誰にも見せない。
 */
export function redactForSeat(game: GameState, seat: number): GameState {
  const reveal = game.phase === 'handEnd' || game.phase === 'gameEnd' || game.phase === 'showdown';
  const players = game.players.map((p) => {
    if (p.id === seat) return { ...p, notMe: reveal ? p.notMe : REDACTED_CARD };
    return { ...p, hole: reveal ? p.hole : [REDACTED_CARD, REDACTED_CARD] };
  });
  return { ...game, players, deck: [] };
}

export function loadGame(match: StoredMatch): GameState {
  const { rng } = makeSerializableRng(match.rngState);
  return withRng(match.game, rng);
}
