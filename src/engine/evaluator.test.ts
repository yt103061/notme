import { describe, it, expect } from 'vitest';
import { evaluateFour, evaluateHand, compareHands, HandCategory } from './evaluator';
import type { Card } from './cards';

function c(suit: Card['suit'], rank: number): Card {
  return { suit, rank };
}

describe('evaluateFour — 4枚役のカテゴリ判定', () => {
  it('フォーカードを検出する', () => {
    const r = evaluateFour([c('S', 9), c('H', 9), c('D', 9), c('C', 9)]);
    expect(r.category).toBe(HandCategory.FourOfAKind);
    expect(r.tiebreak).toEqual([9]);
  });

  it('ストレートフラッシュを検出する', () => {
    const r = evaluateFour([c('S', 8), c('S', 7), c('S', 6), c('S', 5)]);
    expect(r.category).toBe(HandCategory.StraightFlush);
    expect(r.tiebreak).toEqual([8]);
    expect(r.royal).toBe(false);
  });

  it('同スート A-K-Q-J はロイヤル扱いになる', () => {
    const r = evaluateFour([c('H', 14), c('H', 13), c('H', 12), c('H', 11)]);
    expect(r.category).toBe(HandCategory.StraightFlush);
    expect(r.royal).toBe(true);
  });

  it('A-4-3-2 のウィーラーストレートは 4 ハイになる', () => {
    const r = evaluateFour([c('S', 14), c('H', 4), c('D', 3), c('C', 2)]);
    expect(r.category).toBe(HandCategory.Straight);
    expect(r.tiebreak).toEqual([4]);
  });

  it('スリーカードを検出し、キッカーまで比較する', () => {
    const a = evaluateFour([c('S', 12), c('H', 12), c('D', 12), c('C', 9)]);
    const b = evaluateFour([c('S', 12), c('H', 12), c('C', 12), c('D', 5)]);
    expect(a.category).toBe(HandCategory.ThreeOfAKind);
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  it('フラッシュを検出する', () => {
    const r = evaluateFour([c('D', 14), c('D', 11), c('D', 8), c('D', 3)]);
    expect(r.category).toBe(HandCategory.Flush);
    expect(r.tiebreak).toEqual([14, 11, 8, 3]);
  });

  it('ツーペア／ワンペア／ハイカードを区別する', () => {
    expect(evaluateFour([c('S', 11), c('H', 11), c('D', 6), c('C', 6)]).category).toBe(
      HandCategory.TwoPair,
    );
    expect(evaluateFour([c('S', 10), c('H', 10), c('D', 14), c('C', 7)]).category).toBe(
      HandCategory.OnePair,
    );
    expect(evaluateFour([c('S', 14), c('H', 13), c('D', 8), c('C', 5)]).category).toBe(
      HandCategory.HighCard,
    );
  });

  it('序列：フォーカード＞SF＞スリーカード＞フラッシュ＞ストレート＞ツーペア＞ペア＞ハイカード', () => {
    const quads = evaluateFour([c('S', 2), c('H', 2), c('D', 2), c('C', 2)]);
    const sf = evaluateFour([c('S', 8), c('S', 7), c('S', 6), c('S', 5)]);
    const trips = evaluateFour([c('S', 3), c('H', 3), c('D', 3), c('C', 9)]);
    const flush = evaluateFour([c('D', 14), c('D', 11), c('D', 8), c('D', 3)]);
    const straight = evaluateFour([c('S', 14), c('H', 13), c('D', 12), c('C', 11)]);
    const twoPair = evaluateFour([c('S', 14), c('H', 14), c('D', 13), c('C', 13)]);
    const pair = evaluateFour([c('S', 14), c('H', 14), c('D', 13), c('C', 12)]);
    const high = evaluateFour([c('S', 14), c('H', 13), c('D', 12), c('C', 10)]);
    const ordered = [quads, sf, trips, flush, straight, twoPair, pair, high];
    for (let i = 0; i < ordered.length - 1; i++) {
      expect(compareHands(ordered[i], ordered[i + 1])).toBeGreaterThan(0);
    }
  });
});

describe('evaluateHand — 5枚から一番強い4枚を選ぶ', () => {
  it('5枚中に隠れたフラッシュ4枚を見つけ、余り1枚を usedCards から外す', () => {
    const spare = c('H', 2);
    const r = evaluateHand([c('S', 13), c('S', 9), c('S', 6), c('S', 3), spare]);
    expect(r.category).toBe(HandCategory.Flush);
    expect(r.usedCards).toHaveLength(4);
    expect(r.usedCards).not.toContainEqual(spare);
  });

  it('5枚中に隠れたストレート4枚を見つける', () => {
    const r = evaluateHand([c('S', 9), c('H', 8), c('D', 7), c('C', 6), c('S', 13)]);
    expect(r.category).toBe(HandCategory.Straight);
    expect(r.tiebreak).toEqual([9]);
  });

  it('ペアよりフラッシュ、フラッシュよりスリーカードを優先する', () => {
    // ペアもフラッシュ4枚も作れる → フラッシュが勝つ
    const flushOverPair = evaluateHand([c('S', 10), c('S', 8), c('S', 5), c('S', 2), c('H', 10)]);
    expect(flushOverPair.category).toBe(HandCategory.Flush);
    // スリーカードもフラッシュも作れる → スリーカードが勝つ
    const tripsOverFlush = evaluateHand([c('S', 10), c('S', 8), c('S', 5), c('H', 10), c('D', 10)]);
    expect(tripsOverFlush.category).toBe(HandCategory.ThreeOfAKind);
  });

  it('ペア＋ペア＋余り1枚はツーペアになる', () => {
    const r = evaluateHand([c('S', 11), c('H', 11), c('D', 6), c('C', 6), c('S', 2)]);
    expect(r.category).toBe(HandCategory.TwoPair);
    expect(r.tiebreak).toEqual([11, 6]);
  });

  it('フルハウス相当（トリオ＋ペア）はスリーカード＋強キッカーとして採用される', () => {
    const r = evaluateHand([c('S', 9), c('H', 9), c('D', 9), c('C', 4), c('S', 4)]);
    expect(r.category).toBe(HandCategory.ThreeOfAKind);
    expect(r.tiebreak).toEqual([9, 4]);
  });

  it('何もなければハイカード（強い4枚が選ばれ、最弱の1枚が捨てられる）', () => {
    const weakest = c('C', 2);
    const r = evaluateHand([c('S', 14), c('H', 12), c('D', 9), c('S', 5), weakest]);
    expect(r.category).toBe(HandCategory.HighCard);
    expect(r.tiebreak).toEqual([14, 12, 9, 5]);
    expect(r.usedCards).not.toContainEqual(weakest);
  });

  it('キッカー差で勝敗が決まる（同カテゴリ比較）', () => {
    const a = evaluateHand([c('S', 14), c('H', 14), c('D', 13), c('C', 9), c('S', 2)]);
    const b = evaluateHand([c('D', 14), c('C', 14), c('H', 13), c('S', 8), c('H', 2)]);
    expect(a.category).toBe(HandCategory.OnePair);
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  it('完全同値なら 0 を返す（引き分け）', () => {
    const a = evaluateHand([c('S', 14), c('H', 13), c('D', 12), c('C', 10), c('S', 3)]);
    const b = evaluateHand([c('D', 14), c('C', 13), c('H', 12), c('S', 10), c('H', 3)]);
    expect(compareHands(a, b)).toBe(0);
  });
});
