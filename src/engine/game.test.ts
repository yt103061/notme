import { describe, it, expect } from 'vitest';
import { createRng, type Card } from './cards';
import {
  createGame,
  dealHand,
  applyFolds,
  applyExchange,
  revealCommunity,
  resolveShowdown,
  isGameOver,
  gameWinners,
  type GameState,
  type PlayerState,
} from './game';

function c(suit: Card['suit'], rank: number): Card {
  return { suit, rank };
}

function basePlayer(id: number, hole: Card[], notMe: Card): PlayerState {
  return {
    id,
    name: `P${id}`,
    isHuman: id === 0,
    hole,
    notMe,
    folded: false,
    usedExchange: false,
    score: 0,
    hint: null,
    stolenBy: null,
  };
}

describe('dealHand', () => {
  it('deals 2 hole + 1 notMe per player, opens the 1st community card, and reduces the deck', () => {
    const rng = createRng(42);
    let state = createGame(rng, 4);
    state = dealHand(state);

    expect(state.handNumber).toBe(1);
    expect(state.phase).toBe('decision1');
    // ①降り判断の時点で場札1枚目が公開されている
    expect(state.community).toHaveLength(1);
    for (const p of state.players) {
      expect(p.hole).toHaveLength(2);
      expect(p.folded).toBe(false);
      expect(p.usedExchange).toBe(false);
      // 配札時点で全員に自分のnotMeについてのベースヒントが1つ与えられる
      expect(p.hint).not.toBeNull();
    }
    // 52 - (2+1)*4 - 場札1 = 39
    expect(state.deck).toHaveLength(39);

    const seen = new Set<string>();
    for (const card of [...state.players.flatMap((p) => [...p.hole, p.notMe]), ...state.community]) {
      const key = `${card.suit}${card.rank}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

describe('applyFolds', () => {
  it('marks specified players as folded', () => {
    const rng = createRng(1);
    let state = createGame(rng, 4);
    state = dealHand(state);
    state = applyFolds(state, [1, 2]);
    expect(state.players.find((p) => p.id === 1)!.folded).toBe(true);
    expect(state.players.find((p) => p.id === 2)!.folded).toBe(true);
    expect(state.players.find((p) => p.id === 0)!.folded).toBe(false);
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
    // old notMe (C6) pushed to bottom of deck
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
    // target が今後 actor から奪い返した時に相殺できるよう、誰に奪われたかを記録する
    expect(target.stolenBy).toBe(0);
  });

  it('reciprocal steal (B steals back from A within the same hand) resolves as a clean swap, no penalty stacking', () => {
    // まず 0(A) が 1(B) から奪う（通常の一方的な略奪）
    let state = setupState([c('H', 2), c('S', 8)]);
    state = applyExchange(state, 0, { type: 'steal', targetId: 1 });

    const afterFirstSteal = state.players.find((p) => p.id === 1)!;
    expect(afterFirstSteal.stolenBy).toBe(0); // A に奪われたことを記録済み

    const cardsBeforeSecondSteal = {
      actorNotMe: state.players.find((p) => p.id === 1)!.notMe, // B の現在の notMe（山札補充分）
      targetNotMe: state.players.find((p) => p.id === 0)!.notMe, // A の現在の notMe（B から奪ったもの）
    };
    const actorHoleBefore = state.players.find((p) => p.id === 1)!.hole;
    const deckBefore = state.deck.length;

    // 次に 1(B) が 0(A) から奪い返す → お互い様の特殊ケース
    state = applyExchange(state, 1, { type: 'steal', targetId: 0 });

    const actor = state.players.find((p) => p.id === 1)!; // B
    const target = state.players.find((p) => p.id === 0)!; // A

    // 単純な現在の notMe 交換になる（山札には触れない）
    expect(actor.notMe).toEqual(cardsBeforeSecondSteal.targetNotMe);
    expect(target.notMe).toEqual(cardsBeforeSecondSteal.actorNotMe);
    expect(actor.usedExchange).toBe(true);
    // 手札ペナルティは発生しない
    expect(actor.hole).toEqual(actorHoleBefore);
    // 山札も一切関与しない
    expect(state.deck).toHaveLength(deckBefore);
    // 双方ヒントが引き直される
    expect(actor.hint).not.toBeNull();
    expect(target.hint).not.toBeNull();
    // 相殺済みなのでフラグはクリアされる
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
  function stateWith(players: PlayerState[], community: Card[]): GameState {
    return {
      players,
      deck: [],
      community,
      handNumber: 1,
      totalHands: 4,
      phase: 'showdown',
      lastResult: null,
      isSuddenDeath: false,
      rng: createRng(1),
    };
  }

  it('awards +2 to sole winner and -1 to remaining loser', () => {
    const winner = basePlayer(0, [c('S', 14), c('S', 13)], c('S', 12)); // ハイカード A,K,Q,9
    const loser = basePlayer(1, [c('H', 2), c('H', 3)], c('H', 8)); // ハイカード 9,8,5,3（ストレートもフラッシュも無し）
    const community = [c('D', 5), c('C', 9)];
    const state = stateWith([winner, loser], community);
    const { state: next, result } = resolveShowdown(state);
    expect(result.reason).toBe('showdown');
    expect(result.winnerIds).toEqual([0]);
    expect(next.players.find((p) => p.id === 0)!.score).toBe(2);
    expect(next.players.find((p) => p.id === 1)!.score).toBe(-1);
  });

  it('folded players are excluded from scoring', () => {
    const winner = basePlayer(0, [c('S', 14), c('S', 13)], c('S', 12));
    const loser = basePlayer(1, [c('H', 2), c('H', 3)], c('H', 8));
    const folded = basePlayer(2, [c('C', 6), c('C', 7)], c('C', 8));
    folded.folded = true;
    const community = [c('D', 5), c('C', 9)];
    const state = stateWith([winner, loser, folded], community);
    const { state: next } = resolveShowdown(state);
    expect(next.players.find((p) => p.id === 2)!.score).toBe(0);
  });

  it('splits the pot with +1 each on an exact tie', () => {
    const p0 = basePlayer(0, [c('S', 10), c('S', 9)], c('S', 8));
    const p1 = basePlayer(1, [c('H', 10), c('H', 9)], c('H', 8));
    const community = [c('D', 2), c('C', 3)];
    const state = stateWith([p0, p1], community);
    const { state: next, result } = resolveShowdown(state);
    expect(result.winnerIds.sort()).toEqual([0, 1]);
    expect(next.players.find((p) => p.id === 0)!.score).toBe(1);
    expect(next.players.find((p) => p.id === 1)!.score).toBe(1);
  });

  it('walkover: sole remaining player scores +1 without a showdown', () => {
    const winner = basePlayer(0, [c('S', 2), c('S', 3)], c('S', 4));
    const folded1 = basePlayer(1, [c('H', 2), c('H', 3)], c('H', 4));
    folded1.folded = true;
    const folded2 = basePlayer(2, [c('C', 2), c('C', 3)], c('C', 4));
    folded2.folded = true;
    const state = stateWith([winner, folded1, folded2], []);
    const { state: next, result } = resolveShowdown(state);
    expect(result.reason).toBe('walkover');
    expect(result.winnerIds).toEqual([0]);
    expect(next.players.find((p) => p.id === 0)!.score).toBe(1);
  });

  it('everyone folded: no winner, no score change', () => {
    const p0 = basePlayer(0, [c('S', 2), c('S', 3)], c('S', 4));
    const p1 = basePlayer(1, [c('H', 2), c('H', 3)], c('H', 4));
    p0.folded = true;
    p1.folded = true;
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

  it('gameWinners returns all players tied for the top score', () => {
    const rng = createRng(2);
    const state = createGame(rng, 3);
    state.players[0].score = 5;
    state.players[1].score = 5;
    state.players[2].score = 1;
    const winners = gameWinners(state);
    expect(winners.map((p) => p.id).sort()).toEqual([0, 1]);
  });
});
