import { describe, it, expect } from 'vitest';
import type { Card } from './cards';
import { evaluateFive, compareHands, HandCategory } from './evaluator';

function c(spec: string): Card {
  // spec like "AS" "10H" "2D" "KC"
  const suit = spec.slice(-1) as Card['suit'];
  const rankStr = spec.slice(0, -1);
  const map: Record<string, number> = { A: 14, K: 13, Q: 12, J: 11, T: 10 };
  const rank = map[rankStr] ?? Number(rankStr);
  return { suit, rank };
}

function hand(...specs: string[]): Card[] {
  return specs.map(c);
}

describe('evaluateFive categories', () => {
  it('detects royal straight flush', () => {
    const r = evaluateFive(hand('AS', 'KS', 'QS', 'JS', 'TS'));
    expect(r.category).toBe(HandCategory.StraightFlush);
    expect(r.royal).toBe(true);
  });

  it('detects straight flush (non-royal)', () => {
    const r = evaluateFive(hand('9S', '8S', '7S', '6S', '5S'));
    expect(r.category).toBe(HandCategory.StraightFlush);
    expect(r.royal).toBe(false);
  });

  it('detects four of a kind', () => {
    const r = evaluateFive(hand('7S', '7H', '7D', '7C', '2C'));
    expect(r.category).toBe(HandCategory.FourOfAKind);
    expect(r.tiebreak[0]).toBe(7);
  });

  it('detects full house', () => {
    const r = evaluateFive(hand('7S', '7H', '7D', '2C', '2S'));
    expect(r.category).toBe(HandCategory.FullHouse);
    expect(r.tiebreak).toEqual([7, 2]);
  });

  it('detects flush', () => {
    const r = evaluateFive(hand('2S', '5S', '9S', 'JS', 'KS'));
    expect(r.category).toBe(HandCategory.Flush);
  });

  it('detects straight', () => {
    const r = evaluateFive(hand('4S', '5H', '6D', '7C', '8S'));
    expect(r.category).toBe(HandCategory.Straight);
    expect(r.tiebreak[0]).toBe(8);
  });

  it('detects ace-low straight (wheel)', () => {
    const r = evaluateFive(hand('AS', '2H', '3D', '4C', '5S'));
    expect(r.category).toBe(HandCategory.Straight);
    expect(r.tiebreak[0]).toBe(5);
  });

  it('does not treat ace-low as flush straight incorrectly for non-sequential', () => {
    const r = evaluateFive(hand('AS', '2H', '3D', '4C', '6S'));
    expect(r.category).toBe(HandCategory.HighCard);
  });

  it('detects three of a kind', () => {
    const r = evaluateFive(hand('7S', '7H', '7D', '2C', '9S'));
    expect(r.category).toBe(HandCategory.ThreeOfAKind);
  });

  it('detects two pair', () => {
    const r = evaluateFive(hand('7S', '7H', '2D', '2C', '9S'));
    expect(r.category).toBe(HandCategory.TwoPair);
    expect(r.tiebreak).toEqual([7, 2, 9]);
  });

  it('detects one pair', () => {
    const r = evaluateFive(hand('7S', '7H', '2D', '4C', '9S'));
    expect(r.category).toBe(HandCategory.OnePair);
  });

  it('detects high card', () => {
    const r = evaluateFive(hand('2S', '5H', '9D', 'JC', 'KS'));
    expect(r.category).toBe(HandCategory.HighCard);
  });

  it('throws on wrong card count', () => {
    expect(() => evaluateFive(hand('2S', '5H'))).toThrow();
  });
});

describe('compareHands kicker comparison', () => {
  it('higher category always wins', () => {
    const flush = evaluateFive(hand('2S', '5S', '9S', 'JS', 'KS'));
    const straight = evaluateFive(hand('4S', '5H', '6D', '7C', '8S'));
    expect(compareHands(flush, straight)).toBeGreaterThan(0);
  });

  it('same category resolved by kicker', () => {
    const pairKingsHighKicker = evaluateFive(hand('KS', 'KH', 'AS', '5C', '2D'));
    const pairKingsLowKicker = evaluateFive(hand('KS', 'KH', '9S', '5C', '2D'));
    expect(compareHands(pairKingsHighKicker, pairKingsLowKicker)).toBeGreaterThan(0);
  });

  it('identical hands compare equal', () => {
    const a = evaluateFive(hand('KS', 'KH', 'AS', '5C', '2D'));
    const b = evaluateFive(hand('KD', 'KC', 'AH', '5S', '2H'));
    expect(compareHands(a, b)).toBe(0);
  });

  it('two pair resolved by higher pair then kicker', () => {
    const twoPairAcesOverTwos = evaluateFive(hand('AS', 'AH', '2D', '2C', '9S'));
    const twoPairKingsOverQueens = evaluateFive(hand('KS', 'KH', 'QD', 'QC', '9S'));
    expect(compareHands(twoPairAcesOverTwos, twoPairKingsOverQueens)).toBeGreaterThan(0);
  });
});
