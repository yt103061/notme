import { describe, it, expect } from 'vitest';
import { createRng, type Card } from './cards';
import {
  createGame,
  dealHand,
  applyBets,
  applyExchange,
  revealCommunity,
  resolveShowdown,
  isGameOver,
  gameWinners,
  betAmountFor,
  ANTE,
  BET_AMOUNTS,
  STARTING_STACK,
  type GameState,
  type PlayerState,
} from './game';

function c(suit: Card['suit'], rank: number): Card {
  return { suit, rank };
}

function basePlayer(
  id: number,
  hole: Card[],
  notMe: Card,
  extra: Partial<PlayerState> = {},
): PlayerState {
  return {
    id,
    name: `P${id}`,
    isHuman: id === 0,
    hole,
    notMe,
    folded: false,
    usedExchange: false,
    stack: STARTING_STACK,
    staked: 0,
    hint: null,
    stolenBy: null,
    ...extra,
  };
}

describe('dealHand', () => {
  it('deals 2 hole + 1 notMe, opens 1st community, antes everyone into the pot, reduces the deck', () => {
    const rng = createRng(42);
    let state = createGame(rng, 4);
    state = dealHand(state);

    expect(state.handNumber).toBe(1);
    expect(state.phase).toBe('decision1');
    expect(state.community).toHaveLength(1);
    // 全員がアンティを積み、ポットに集まる
    expect(state.pot).toBe(ANTE * 4);
    for (const p of state.players) {
      expect(p.hole).toHaveLength(2);
      expect(p.stack).toBe(STARTING_STACK - ANTE);
      expect(p.staked).toBe(ANTE);
      expect(p.hint).not.toBeNull();
      expect(state.handStartStack[p.id]).toBe(STARTING_STACK);
    }
    expect(state.deck).toHaveLength(39);

    const seen = new Set<string>();
    for (const card of [...state.players.flatMap((p) => [...p.hole, p.notMe]), ...state.community]) {
      const key = `${card.suit}${card.rank}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

describe('applyBets', () => {
  it('folds are marked, stayers add their bet to the pot and to their stake', () => {
    const rng = createRng(1);
    let state = createGame(rng, 4);
    state = dealHand(state);
    const potBefore = state.pot;
    const stackBefore = state.players.find((p) => p.id === 3)!.stack;

    state = applyBets(state, { 0: 'raise', 1: 'fold', 2: 'stay', 3: 'big' });

    expect(state.players.find((p) => p.id === 1)!.folded).toBe(true);
    expect(state.players.find((p) => p.id === 0)!.folded).toBe(false);
    // ポットは stay/raise/big の合計だけ増える（fold は積まない）
    expect(state.pot).toBe(potBefore + BET_AMOUNTS.raise + BET_AMOUNTS.stay + BET_AMOUNTS.big);
    // big を選んだプレイヤーはスタックが減り、staked が増える
    const p3 = state.players.find((p) => p.id === 3)!;
    expect(p3.stack).toBe(stackBefore - BET_AMOUNTS.big);
    expect(p3.staked).toBe(ANTE + BET_AMOUNTS.big);
  });

  it('a bet is capped at the available stack (all-in), never going negative', () => {
    const short = basePlayer(0, [c('S', 4), c('S', 5)], c('C', 6), { stack: 30, staked: 10 });
    expect(betAmountFor(short, 'big')).toBe(30);
  });
});

describe('applyExchange', () => {
  function setupState(deckCards: Card[]): GameState {
    const rng = createRng(7);
    const actor = basePlayer(0, [c('S', 4), c('S', 5)], c('C', 6));
    const target = basePlayer(1, [c('H', 9), c('H', 10)], c('D', 11));
    const bystander = basePlayer(2, [c('C', 2), c('C', 3)], c('S', 13));
    return {
      players: [actor, target, bystander],
      deck: deckCards,
      community: [],
      handNumber: 1,
      totalHands: 4,
      phase: 'exchange',
      lastResult: null,
      isSuddenDeath: false,
      pot: 30,
      handStartStack: { 0: STARTING_STACK, 1: STARTING_STACK, 2: STARTING_STACK },
      rng,
    };
  }

  it('drawDeck replaces own notMe unseen, refreshes the hint, and is irreversible', () => {
    const newCard = c('D', 14);
    let state = setupState([newCard, c('S', 2), c('S', 3)]);
    state = applyExchange(state, 0, { type: 'drawDeck' });
    const actor = state.players.find((p) => p.id === 0)!;
    expect(actor.notMe).toEqual(newCard);
    expect(actor.usedExchange).toBe(true);
    expect(actor.hint).not.toBeNull();
    expect(state.deck[state.deck.length - 1]).toEqual(c('C', 6));
  });

  it('steal takes target notMe, penalizes actor hole, refills target with a hint (default one-sided steal)', () => {
    const holeReplacement = c('H', 2);
    const targetRefill = c('S', 8);
    let state = setupState([holeReplacement, targetRefill]);

    const originalTargetNotMe = state.players.find((p) => p.id === 1)!.notMe;
    state = applyExchange(state, 0, { type: 'steal', targetId: 1 });

    const actor = state.players.find((p) => p.id === 0)!;
    const target = state.players.find((p) => p.id === 1)!;

    expect(actor.notMe).toEqual(originalTargetNotMe);
    expect(actor.usedExchange).toBe(true);
    expect(actor.hole).toContainEqual(holeReplacement);
    expect(actor.hole).toHaveLength(2);

    expect(target.notMe).toEqual(targetRefill);
    expect(target.hint).not.toBeNull();
    expect(target.stolenBy).toBe(0);
  });

  it('reciprocal steal (B steals back from A within the same hand) resolves as a clean swap, no penalty stacking', () => {
    let state = setupState([c('H', 2), c('S', 8)]);
    state = applyExchange(state, 0, { type: 'steal', targetId: 1 });

    const afterFirstSteal = state.players.find((p) => p.id === 1)!;
    expect(afterFirstSteal.stolenBy).toBe(0);

    const cardsBeforeSecondSteal = {
      actorNotMe: state.players.find((p) => p.id === 1)!.notMe,
      targetNotMe: state.players.find((p) => p.id === 0)!.notMe,
    };
    const actorHoleBefore = state.players.find((p) => p.id === 1)!.hole;
    const deckBefore = state.deck.length;

    state = applyExchange(state, 1, { type: 'steal', targetId: 0 });

    const actor = state.players.find((p) => p.id === 1)!;
    const target = state.players.find((p) => p.id === 0)!;

    expect(actor.notMe).toEqual(cardsBeforeSecondSteal.targetNotMe);
    expect(target.notMe).toEqual(cardsBeforeSecondSteal.actorNotMe);
    expect(actor.usedExchange).toBe(true);
    expect(actor.hole).toEqual(actorHoleBefore);
    expect(state.deck).toHaveLength(deckBefore);
    expect(actor.hint).not.toBeNull();
    expect(target.hint).not.toBeNull();
    expect(actor.stolenBy).toBeNull();
  });

  it('steal does nothing if target is folded', () => {
    let state = setupState([c('H', 2), c('S', 8)]);
    state.players[1].folded = true;
    const before = state.players.find((p) => p.id === 0)!.notMe;
    state = applyExchange(state, 0, { type: 'steal', targetId: 1 });
    expect(state.players.find((p) => p.id === 0)!.notMe).toEqual(before);
  });

  it('does nothing once usedExchange is already true', () => {
    let state = setupState([c('D', 14)]);
    state.players[0].usedExchange = true;
    const before = state.players.find((p) => p.id === 0)!.notMe;
    state = applyExchange(state, 0, { type: 'drawDeck' });
    expect(state.players.find((p) => p.id === 0)!.notMe).toEqual(before);
  });
});

describe('revealCommunity', () => {
  it('adds the 2nd community card and advances to decision2', () => {
    const rng = createRng(3);
    let state = createGame(rng, 2);
    state = dealHand(state);
    const deckBefore = state.deck.length;
    const firstCard = state.community[0];
    state = revealCommunity(state);
    expect(state.community).toHaveLength(2);
    expect(state.community[0]).toEqual(firstCard);
    expect(state.deck).toHaveLength(deckBefore - 1);
    expect(state.phase).toBe('decision2');
  });
});

describe('resolveShowdown', () => {
  /** staked を差し引いた後の状態を作る。handStartStack = stack + staked（賭ける前の持ち分） */
  function stateWith(players: PlayerState[], community: Card[]): GameState {
    const pot = players.reduce((sum, p) => sum + p.staked, 0);
    const handStartStack: Record<number, number> = {};
    for (const p of players) handStartStack[p.id] = p.stack + p.staked;
    return {
      players,
      deck: [],
      community,
      handNumber: 1,
      totalHands: 4,
      phase: 'showdown',
      lastResult: null,
      isSuddenDeath: false,
      pot,
      handStartStack,
      rng: createRng(1),
    };
  }

  it('winner takes the whole pot; chipDelta reflects net win/loss', () => {
    const winner = basePlayer(0, [c('S', 14), c('S', 13)], c('S', 12), { stack: 200, staked: 100 });
    const loser = basePlayer(1, [c('H', 2), c('H', 3)], c('H', 8), { stack: 200, staked: 100 });
    const state = stateWith([winner, loser], [c('D', 5), c('C', 9)]);
    const { state: next, result } = resolveShowdown(state);

    expect(result.reason).toBe('showdown');
    expect(result.winnerIds).toEqual([0]);
    expect(result.pot).toBe(200);
    // 勝者は pot 200 を得て 200 -> 400、純増 +100。敗者は 200 のまま、純減 -100
    expect(next.players.find((p) => p.id === 0)!.stack).toBe(400);
    expect(next.players.find((p) => p.id === 1)!.stack).toBe(200);
    expect(result.chipDelta[0]).toBe(100);
    expect(result.chipDelta[1]).toBe(-100);
  });

  it('folded players are excluded from the pot and only lose what they staked', () => {
    const winner = basePlayer(0, [c('S', 14), c('S', 13)], c('S', 12), { stack: 200, staked: 100 });
    const loser = basePlayer(1, [c('H', 2), c('H', 3)], c('H', 8), { stack: 200, staked: 100 });
    const folded = basePlayer(2, [c('C', 6), c('C', 7)], c('C', 8), {
      stack: 290,
      staked: 10,
      folded: true,
    });
    const state = stateWith([winner, loser, folded], [c('D', 5), c('C', 9)]);
    const { state: next, result } = resolveShowdown(state);
    // 降りたプレイヤーはスタック不変、純減はアンティ分のみ
    expect(next.players.find((p) => p.id === 2)!.stack).toBe(290);
    expect(result.chipDelta[2]).toBe(-10);
  });

  it('splits the pot on an exact tie (chipDelta 0 each when equally staked)', () => {
    const p0 = basePlayer(0, [c('S', 10), c('S', 9)], c('S', 8), { stack: 200, staked: 100 });
    const p1 = basePlayer(1, [c('H', 10), c('H', 9)], c('H', 8), { stack: 200, staked: 100 });
    const state = stateWith([p0, p1], [c('D', 2), c('C', 3)]);
    const { state: next, result } = resolveShowdown(state);
    expect(result.winnerIds.sort()).toEqual([0, 1]);
    expect(next.players.find((p) => p.id === 0)!.stack).toBe(300);
    expect(next.players.find((p) => p.id === 1)!.stack).toBe(300);
    expect(result.chipDelta[0]).toBe(0);
    expect(result.chipDelta[1]).toBe(0);
  });

  it('walkover: sole remaining player takes the pot', () => {
    const winner = basePlayer(0, [c('S', 2), c('S', 3)], c('S', 4), { stack: 200, staked: 100 });
    const folded1 = basePlayer(1, [c('H', 2), c('H', 3)], c('H', 4), {
      stack: 290,
      staked: 10,
      folded: true,
    });
    const folded2 = basePlayer(2, [c('C', 2), c('C', 3)], c('C', 4), {
      stack: 290,
      staked: 10,
      folded: true,
    });
    const state = stateWith([winner, folded1, folded2], []);
    const { state: next, result } = resolveShowdown(state);
    expect(result.reason).toBe('walkover');
    expect(result.winnerIds).toEqual([0]);
    // pot = 100 + 10 + 10 = 120。勝者 200 -> 320、純増 +20
    expect(result.pot).toBe(120);
    expect(next.players.find((p) => p.id === 0)!.stack).toBe(320);
    expect(result.chipDelta[0]).toBe(20);
  });

  it('everyone folded: no winner', () => {
    const p0 = basePlayer(0, [c('S', 2), c('S', 3)], c('S', 4), { folded: true });
    const p1 = basePlayer(1, [c('H', 2), c('H', 3)], c('H', 4), { folded: true });
    const state = stateWith([p0, p1], []);
    const { result } = resolveShowdown(state);
    expect(result.reason).toBe('walkover');
    expect(result.winnerIds).toEqual([]);
  });
});

describe('game end / winners', () => {
  it('isGameOver true once handNumber reaches totalHands', () => {
    const rng = createRng(5);
    let state = createGame(rng, 4);
    expect(isGameOver(state)).toBe(false);
    for (let i = 0; i < 4; i++) state = dealHand(state);
    expect(isGameOver(state)).toBe(true);
  });

  it('gameWinners returns all players tied for the largest stack', () => {
    const rng = createRng(2);
    const state = createGame(rng, 3);
    state.players[0].stack = 500;
    state.players[1].stack = 500;
    state.players[2].stack = 100;
    const winners = gameWinners(state);
    expect(winners.map((p) => p.id).sort()).toEqual([0, 1]);
  });
});
