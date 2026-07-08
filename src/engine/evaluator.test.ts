import { describe, it, expect } from 'vitest';
import type { Card } from './cards';
import { evaluateFive, evaluateHand, compareHands, HandCategory } from './evaluator';

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

describe('evaluateHand — hidden hand rescue (Texas Hold\'em style best-of)', () => {
  it('leaves pair-or-better hands untouched (rescue only applies to high card)', () => {
    const r = evaluateHand(hand('7S', '7H', '2D', '4C', '9S'));
    expect(r.category).toBe(HandCategory.OnePair);
  });

  it('leaves a genuine 5-card straight/flush untouched', () => {
    const r = evaluateHand(hand('9S', '8S', '7S', '6S', '5S'));
    expect(r.category).toBe(HandCategory.StraightFlush);
  });

  it('rescues a hidden 4-card flush within an otherwise high-card hand', () => {
    // 2S,5S,9S,KS all spades; 7H breaks the full flush/straight
    const r = evaluateHand(hand('2S', '5S', '9S', 'KS', '7H'));
    expect(evaluateFive(hand('2S', '5S', '9S', 'KS', '7H')).category).toBe(HandCategory.HighCard);
    expect(r.category).toBe(HandCategory.FourCardFlush);
  });

  it('rescues a hidden 4-card straight within an otherwise high-card hand', () => {
    // 4,5,6,7 across 4 different suits + KS breaks the full straight
    const r = evaluateHand(hand('4S', '5H', '6D', '7C', 'KS'));
    expect(evaluateFive(hand('4S', '5H', '6D', '7C', 'KS')).category).toBe(HandCategory.HighCard);
    expect(r.category).toBe(HandCategory.FourCardStraight);
  });

  it('rescues a hidden 4-card straight flush over a plain 4-card straight/flush', () => {
    // 4S,5S,6S,7S same suit AND consecutive; KH breaks the full hand
    const r = evaluateHand(hand('4S', '5S', '6S', '7S', 'KH'));
    expect(r.category).toBe(HandCategory.FourCardStraightFlush);
  });

  it('falls back to a 3-card flush when no 4-card rescue exists', () => {
    // 2S,5S,9S share a suit (3-flush); no 4-card subset is a straight or flush
    const cards = hand('2S', '5S', '9S', '7H', 'KD');
    expect(evaluateFive(cards).category).toBe(HandCategory.HighCard);
    const r = evaluateHand(cards);
    expect(r.category).toBe(HandCategory.ThreeCardFlush);
  });

  it('stays high card when no rescue exists at any size', () => {
    // suits capped at 2-per-suit and ranks spread out so no 3 are ever consecutive
    const cards = hand('2S', '5S', '9H', 'KH', '7D');
    expect(evaluateFive(cards).category).toBe(HandCategory.HighCard);
    const r = evaluateHand(cards);
    expect(r.category).toBe(HandCategory.HighCard);
  });

  it('a rescued 4-card flush beats a plain high card hand but loses to one pair', () => {
    const rescued = evaluateHand(hand('2S', '5S', '9S', 'KS', '7H'));
    const plainHighCard = evaluateHand(hand('2S', '5H', '9D', 'KC', '7C'));
    const onePair = evaluateHand(hand('3S', '3H', '4D', '8C', 'JC'));
    expect(compareHands(rescued, plainHighCard)).toBeGreaterThan(0);
    expect(compareHands(onePair, rescued)).toBeGreaterThan(0);
  });
});
