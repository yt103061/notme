// 4枚ポーカーの役判定。5枚（手札2＋not me 1＋場札2）から自由に4枚を選び、
// 組める中で一番強い4枚役を採用する。
//
// 役の序列はカジノの Four Card Poker に準拠する。スリーカードがフラッシュ／ストレートより
// 強いのは、4枚勝負では組が圧倒的に出にくいため（C(52,4)=270,725 通り中：
// フォーカード 13 ＜ ストレートフラッシュ 44 ＜ スリーカード 2,496
// ＜ ストレート 2,772 ＜ ツーペア 2,808 ＜ フラッシュ 2,816 ＜ ワンペア 82,368）。
// フラッシュ＞ストレート＞ツーペアの並びは出現数の差が2%未満のため、
// 5枚ポーカーに慣れたプレイヤーの直感を優先して踏襲している。
// キッカーまで厳密に比較する（スートに優劣なし）。

import type { Card } from './cards';

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
  /** 強い順のタイブレーク値列。カテゴリが同じならこの列の辞書式比較で決着 */
  tiebreak: number[];
  /** A-K-Q-J 同スート（表示上ロイヤルストレートフラッシュ扱い） */
  royal: boolean;
  /** 役に採用された4枚。UI が「使わなかった1枚」を暗く表示するために使う */
  usedCards: Card[];
}

/** ストレート判定。ranks は必ず size 個。成立時はハイカードのランクを返す（A-low ウィーラーは size を返す）。不成立は 0 */
function straightHigh(ranks: number[], size: number): number {
  const sorted = [...ranks].sort((a, b) => b - a);
  if (new Set(sorted).size !== size) return 0;
  if (sorted[0] - sorted[size - 1] === size - 1) return sorted[0];
  // A-low ウィーラー系（4枚: A,4,3,2）
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

  // ランクごとの枚数 → (枚数, ランク) の降順
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

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [first, ...rest] = items;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

/**
 * 5枚から自由に4枚を選び、組める中で一番強い4枚役を採用する。
 * 採用された4枚は usedCards に入る（UI が「使わなかった1枚」を示すため）。
 */
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
