// ポーカー役判定。5枚を基本としつつ、5枚がハイカード（役なし）の場合に限り、
// 4枚・3枚のサブセットに隠れたストレート／フラッシュ／ストレートフラッシュがないか探す
// 「お宝役」レスキュー機構を備える（テキサスホールデム的に「組める役の中で一番強いもの」を採用）。
// キッカーまで厳密に比較する（スートに優劣なし）。

import type { Card } from './cards';

export enum HandCategory {
  HighCard = 0,
  // 以下はハイカードのみ成立する場合に「お宝役」として発掘される特殊カテゴリ
  ThreeCardStraight = 1,
  ThreeCardFlush = 2,
  FourCardStraight = 3,
  ThreeCardStraightFlush = 4,
  FourCardFlush = 5,
  FourCardStraightFlush = 6,
  OnePair = 7,
  TwoPair = 8,
  ThreeOfAKind = 9,
  Straight = 10,
  Flush = 11,
  FullHouse = 12,
  FourOfAKind = 13,
  StraightFlush = 14,
}

export interface HandRank {
  category: HandCategory;
  /** 強い順のタイブレーク値列。カテゴリが同じならこの列の辞書式比較で決着 */
  tiebreak: number[];
  /** A♠K♠Q♠J♠10♠ 相当（表示上ロイヤルストレートフラッシュ扱い） */
  royal: boolean;
}

/** ストレート判定。ranks は必ず size 個。成立時はハイカードのランクを返す（A-low ウィーラーは size を返す）。不成立は 0 */
function straightHigh(ranks: number[], size: number): number {
  const sorted = [...ranks].sort((a, b) => b - a);
  if (new Set(sorted).size !== size) return 0;
  if (sorted[0] - sorted[size - 1] === size - 1) return sorted[0];
  // A-low ウィーラー系（5枚: A,5,4,3,2／4枚: A,4,3,2／3枚: A,3,2）
  if (sorted[0] === 14 && sorted[1] === size && sorted[1] - sorted[size - 1] === size - 2) {
    return sorted[1];
  }
  return 0;
}

export function evaluateFive(cards: Card[]): HandRank {
  if (cards.length !== 5) throw new Error(`evaluateFive requires 5 cards, got ${cards.length}`);
  const ranks = cards.map((c) => c.rank);
  const isFlush = cards.every((c) => c.suit === cards[0].suit);
  const stHigh = straightHigh(ranks, 5);

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

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [first, ...rest] = items;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

/** 指定サイズ(3 or 4)の全サブセットから、隠れたストレート／フラッシュ／ストレートフラッシュの最強候補を探す */
function bestPartial(cards: Card[], size: 3 | 4): HandRank | null {
  let best: HandRank | null = null;
  for (const subset of combinations(cards, size)) {
    const ranks = subset.map((c) => c.rank).sort((a, b) => b - a);
    const isFlush = subset.every((c) => c.suit === subset[0].suit);
    const high = straightHigh(ranks, size);

    let category: HandCategory | undefined;
    let tiebreak = ranks;
    if (isFlush && high) {
      category = size === 4 ? HandCategory.FourCardStraightFlush : HandCategory.ThreeCardStraightFlush;
      tiebreak = [high];
    } else if (isFlush) {
      category = size === 4 ? HandCategory.FourCardFlush : HandCategory.ThreeCardFlush;
    } else if (high) {
      category = size === 4 ? HandCategory.FourCardStraight : HandCategory.ThreeCardStraight;
      tiebreak = [high];
    }
    if (category === undefined) continue;

    const candidate: HandRank = { category, tiebreak, royal: false };
    if (!best || compareHands(candidate, best) > 0) best = candidate;
  }
  return best;
}

/**
 * 5枚から最も強い役を選ぶ（テキサスホールデム的な「組める役の中で一番強いもの」方式）。
 * ペア以上はどのサブセットで見ても5枚評価だけで自動的に検出されるため対象外。
 * 5枚全体がハイカードの時だけ、4枚・3枚に隠れたストレート／フラッシュ／ストレートフラッシュを
 * 探し、見つかればそれをお宝役として採用する。
 */
export function evaluateHand(cards: Card[]): HandRank {
  const five = evaluateFive(cards);
  if (five.category !== HandCategory.HighCard) return five;

  const four = bestPartial(cards, 4);
  const three = bestPartial(cards, 3);
  if (four && (!three || compareHands(four, three) >= 0)) return four;
  if (three) return three;
  return five;
}
