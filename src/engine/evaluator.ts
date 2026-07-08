// 5枚固定のポーカー役判定。キッカーまで厳密に比較する（スートに優劣なし）。

import type { Card } from './cards';

export enum HandCategory {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
}

export interface HandRank {
  category: HandCategory;
  /** 強い順のタイブレーク値列。カテゴリが同じならこの列の辞書式比較で決着 */
  tiebreak: number[];
  /** A♠K♠Q♠J♠10♠ 相当（表示上ロイヤルストレートフラッシュ扱い） */
  royal: boolean;
}

/** ストレート判定。成立時はハイカードのランクを返す（A-5ローは5）。不成立は 0 */
function straightHigh(ranks: number[]): number {
  const sorted = [...ranks].sort((a, b) => b - a);
  if (new Set(sorted).size !== 5) return 0;
  if (sorted[0] - sorted[4] === 4) return sorted[0];
  // A-5 ロー（A,5,4,3,2）
  if (sorted[0] === 14 && sorted[1] === 5 && sorted[1] - sorted[4] === 3) return 5;
  return 0;
}

export function evaluateFive(cards: Card[]): HandRank {
  if (cards.length !== 5) throw new Error(`evaluateFive requires 5 cards, got ${cards.length}`);
  const ranks = cards.map((c) => c.rank);
  const isFlush = cards.every((c) => c.suit === cards[0].suit);
  const stHigh = straightHigh(ranks);

  if (isFlush && stHigh) {
    return { category: HandCategory.StraightFlush, tiebreak: [stHigh], royal: stHigh === 14 };
  }

  // ランクごとの枚数 → (枚数, ランク) の降順
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  const shape = groups.map((g) => g.count).join('');
  const tiebreak = groups.map((g) => g.rank);

  if (shape === '41') return { category: HandCategory.FourOfAKind, tiebreak, royal: false };
  if (shape === '32') return { category: HandCategory.FullHouse, tiebreak, royal: false };
  if (isFlush) return { category: HandCategory.Flush, tiebreak, royal: false };
  if (stHigh) return { category: HandCategory.Straight, tiebreak: [stHigh], royal: false };
  if (shape === '311') return { category: HandCategory.ThreeOfAKind, tiebreak, royal: false };
  if (shape === '221') return { category: HandCategory.TwoPair, tiebreak, royal: false };
  if (shape === '2111') return { category: HandCategory.OnePair, tiebreak, royal: false };
  return { category: HandCategory.HighCard, tiebreak, royal: false };
}

/** a が強ければ正、b が強ければ負、完全同値なら 0 */
export function compareHands(a: HandRank, b: HandRank): number {
  if (a.category !== b.category) return a.category - b.category;
  const len = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < len; i++) {
    const diff = (a.tiebreak[i] ?? 0) - (b.tiebreak[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
