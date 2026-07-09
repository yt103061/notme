// カードと山札。src/engine/cards.ts のサーバー実行用コピー（内容は同一に保つ）。

export type Suit = 'S' | 'H' | 'D' | 'C';
/** 2..14（14 = A） */
export type Rank = number;

export interface Card {
  suit: Suit;
  rank: Rank;
}

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

export type Rng = () => number;

/** mulberry32 */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) deck.push({ suit, rank });
  }
  return deck;
}

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function cardKey(c: Card): string {
  return `${c.suit}${c.rank}`;
}

export function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

const RANK_LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export function rankLabel(rank: Rank): string {
  return RANK_LABELS[rank] ?? String(rank);
}

export const SUIT_SYMBOLS: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };

export function cardLabel(c: Card): string {
  return `${SUIT_SYMBOLS[c.suit]}${rankLabel(c.rank)}`;
}

export function isRed(c: Card): boolean {
  return c.suit === 'H' || c.suit === 'D';
}

/** J/Q/K */
export function isFaceCard(c: Card): boolean {
  return c.rank >= 11 && c.rank <= 13;
}
