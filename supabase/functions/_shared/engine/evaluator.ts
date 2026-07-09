// 4枚ポーカーの役判定。src/engine/evaluator.ts のサーバー実行用コピー（内容は同一に保つ）。

import type { Card } from './cards.ts';

export enum HandCategory {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  Straight = 3,
  Flush = 4,
  ThreeOfAKind = 5,
  StraightFlush = 6,
  FourOfAKind = 7,
}

export interface HandRank {
  category: HandCategory;
  tiebreak: number[];
  royal: boolean;
  usedCards: Card[];
}

function straightHigh(ranks: number[], size: number): number {
  const sorted = [...ranks].sort((a, b) => b - a);
  if (new Set(sorted).size !== size) return 0;
  if (sorted[0] - sorted[size - 1] === size - 1) return sorted[0];
  if (sorted[0] === 14 && sorted[1] === size && sorted[1] - sorted[size - 1] === size - 2) {
    return sorted[1];
  }
  return 0;
}

export function evaluateFour(cards: Card[]): HandRank {
  if (cards.length !== 4) throw new Error(`evaluateFour requires 4 cards, got ${cards.length}`);
  const ranks = cards.map((c) => c.rank);
  const isFlush = cards.every((c) => c.suit === cards[0].suit);
  const stHigh = straightHigh(ranks, 4);

  if (isFlush && stHigh) {
    return { category: HandCategory.StraightFlush, tiebreak: [stHigh], royal: stHigh === 14, usedCards: cards };
  }

  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  const shape = groups.map((g) => g.count).join('');
  const tiebreak = groups.map((g) => g.rank);

  if (shape === '4') return { category: HandCategory.FourOfAKind, tiebreak, royal: false, usedCards: cards };
  if (shape === '31') return { category: HandCategory.ThreeOfAKind, tiebreak, royal: false, usedCards: cards };
  if (isFlush) return { category: HandCategory.Flush, tiebreak, royal: false, usedCards: cards };
  if (stHigh) return { category: HandCategory.Straight, tiebreak: [stHigh], royal: false, usedCards: cards };
  if (shape === '22') return { category: HandCategory.TwoPair, tiebreak, royal: false, usedCards: cards };
  if (shape === '211') return { category: HandCategory.OnePair, tiebreak, royal: false, usedCards: cards };
  return { category: HandCategory.HighCard, tiebreak, royal: false, usedCards: cards };
}

export function compareHands(a: HandRank, b: HandRank): number {
  if (a.category !== b.category) return a.category - b.category;
  const len = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < len; i++) {
    const diff = (a.tiebreak[i] ?? 0) - (b.tiebreak[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [first, ...rest] = items;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

export function evaluateHand(cards: Card[]): HandRank {
  if (cards.length === 4) return evaluateFour(cards);
  if (cards.length !== 5) throw new Error(`evaluateHand requires 4 or 5 cards, got ${cards.length}`);
  let best: HandRank | null = null;
  for (const subset of combinations(cards, 4)) {
    const candidate = evaluateFour(subset);
    if (!best || compareHands(candidate, best) > 0) best = candidate;
  }
  return best!;
}
