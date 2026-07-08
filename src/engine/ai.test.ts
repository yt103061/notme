import { describe, it, expect } from 'vitest';
import { createRng, type Card } from './cards';
import type { GameState, PlayerState } from './game';
import { estimateWinProbability, decideFold, decideExchange, PERSONALITIES } from './ai';

function c(suit: Card['suit'], rank: number): Card {
  return { suit, rank };
}

function player(id: number, hole: Card[], notMe: Card, extra: Partial<PlayerState> = {}): PlayerState {
  return {
    id,
    name: `P${id}`,
    isHuman: false,
    hole,
    notMe,
    folded: false,
    usedExchange: false,
    score: 0,
    hint: null,
    ...extra,
  };
}

function state(players: PlayerState[], community: Card[] = []): GameState {
  return {
    players,
    deck: [],
    community,
    handNumber: 1,
    totalHands: 4,
    phase: 'decision1',
    lastResult: null,
    isSuddenDeath: false,
    rng: createRng(11),
  };
}

describe('estimateWinProbability', () => {
  it('returns 1 when there are no active opponents', () => {
    const s = state([player(0, [c('S', 14), c('S', 13)], c('S', 12))]);
    const p = estimateWinProbability(s, 0, 100, createRng(1));
    expect(p).toBe(1);
  });

  it('gives a strong hole pair a higher win probability than a weak one', () => {
    const opponent = player(1, [c('H', 5), c('H', 6)], c('D', 2));
    const strong = state([player(0, [c('S', 14), c('C', 14)], c('S', 2)), opponent]);
    const weak = state([player(0, [c('S', 3), c('C', 4)], c('S', 2)), opponent]);

    const strongProb = estimateWinProbability(strong, 0, 500, createRng(123));
    const weakProb = estimateWinProbability(weak, 0, 500, createRng(123));

    expect(strongProb).toBeGreaterThan(weakProb);
  });

  it('stays within [0, 1]', () => {
    const s = state([
      player(0, [c('S', 7), c('H', 2)], c('C', 9)),
      player(1, [c('D', 5), c('D', 6)], c('H', 11)),
      player(2, [c('C', 3), c('S', 4)], c('D', 13)),
    ]);
    const p = estimateWinProbability(s, 0, 200, createRng(9));
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('respects an active hint constraint on the unknown notMe card', () => {
    const s = state([
      player(0, [c('S', 7), c('H', 2)], c('C', 9), { hint: { kind: 'range', label: '8以上' } }),
      player(1, [c('D', 5), c('D', 6)], c('H', 11)),
    ]);
    // Should not throw and should produce a valid probability even with the hint filter applied.
    const p = estimateWinProbability(s, 0, 200, createRng(4));
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});

describe('decideFold', () => {
  it('stays in with an overwhelmingly strong hole pair', () => {
    const s = state([
      player(0, [c('S', 14), c('C', 14)], c('S', 2)),
      player(1, [c('H', 3), c('H', 4)], c('D', 2)),
    ]);
    const folded = decideFold(s, 0, PERSONALITIES.steady, createRng(55), 2);
    expect(folded).toBe(false);
  });

  it('folds with an overwhelmingly weak hole pair against strong visible opponent notMe', () => {
    const s = state([
      player(0, [c('S', 3), c('C', 4)], c('S', 2)),
      player(1, [c('H', 13), c('H', 14)], c('D', 14)),
      player(2, [c('C', 12), c('C', 13)], c('H', 13)),
    ]);
    const folded = decideFold(s, 0, PERSONALITIES.steady, createRng(55), 2);
    expect(folded).toBe(true);
  });

  it('pre-flop thresholds are looser than post-flop for every personality (bias toward showdowns)', () => {
    for (const p of Object.values(PERSONALITIES)) {
      expect(p.stayThresholdPreFlop).toBeLessThan(p.stayThresholdPostFlop);
      // 4人戦の平均勝率 0.25 を下回るプリフロップ閾値＝「基本は勝負を受ける」設計
      expect(p.stayThresholdPreFlop).toBeLessThan(0.25);
    }
  });

  it('is more willing to stay pre-flop than post-flop with the same mediocre hand', () => {
    const s = state([
      player(0, [c('S', 9), c('C', 7)], c('S', 2)),
      player(1, [c('H', 4), c('H', 10)], c('D', 8)),
      player(2, [c('C', 6), c('C', 3)], c('H', 5)),
      player(3, [c('D', 3), c('D', 9)], c('S', 10)),
    ]);
    let stayedPre = 0;
    let stayedPost = 0;
    const runs = 12;
    for (let seed = 0; seed < runs; seed++) {
      if (!decideFold(s, 0, PERSONALITIES.steady, createRng(seed), 1)) stayedPre++;
      if (!decideFold(s, 0, PERSONALITIES.steady, createRng(seed), 2)) stayedPost++;
    }
    expect(stayedPre).toBeGreaterThanOrEqual(stayedPost);
    // 並のハンドでもプリフロップでは大半残る（AIが降りすぎない）
    expect(stayedPre).toBeGreaterThan(runs / 2);
  });
});

describe('decideExchange', () => {
  it('passes when already in a strong position', () => {
    const s = state([
      player(0, [c('S', 14), c('C', 14)], c('S', 13)),
      player(1, [c('H', 3), c('H', 4)], c('D', 2)),
    ]);
    const action = decideExchange(s, 0, PERSONALITIES.steady, createRng(3));
    expect(action.type).toBe('pass');
  });

  it('never targets itself when stealing', () => {
    const s = state([
      player(0, [c('S', 3), c('C', 4)], c('S', 2)),
      player(1, [c('H', 5), c('H', 6)], c('D', 13)),
      player(2, [c('C', 7), c('C', 8)], c('H', 12)),
    ]);
    for (let seed = 0; seed < 20; seed++) {
      const action = decideExchange(s, 0, PERSONALITIES.aggressive, createRng(seed));
      if (action.type === 'steal') {
        expect(action.targetId).not.toBe(0);
      }
    }
  });
});
