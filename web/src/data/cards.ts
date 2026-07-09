// デモ用カード定義。画像アセットは使わず、色+記号+グラデーションで絵柄を表現する。
export type CardKind = "creature" | "buff";

export interface CardDef {
  id: string;
  name: string;
  cost: number;
  attack?: number;
  hp?: number;
  kind: CardKind;
  rarity: "common" | "rare";
  symbol: string; // 絵柄代わりの絵文字
  hue: number; // 枠・グラデーションの色相
}

export const CARD_DEFS: CardDef[] = [
  { id: "sprout", name: "スプラウト", cost: 1, attack: 1, hp: 2, kind: "creature", rarity: "common", symbol: "🌱", hue: 120 },
  { id: "pebble", name: "ペブル", cost: 1, attack: 1, hp: 3, kind: "creature", rarity: "common", symbol: "🪨", hue: 30 },
  { id: "ember", name: "エンバー", cost: 2, attack: 2, hp: 2, kind: "creature", rarity: "common", symbol: "🔥", hue: 10 },
  { id: "gust", name: "ガスト", cost: 2, attack: 2, hp: 1, kind: "creature", rarity: "common", symbol: "🌪️", hue: 190 },
  { id: "shell", name: "シェル", cost: 3, attack: 2, hp: 5, kind: "creature", rarity: "common", symbol: "🐚", hue: 200 },
  { id: "spark", name: "スパーク", cost: 3, attack: 4, hp: 2, kind: "creature", rarity: "common", symbol: "⚡", hue: 50 },
  { id: "growth", name: "グロウス", cost: 2, kind: "buff", rarity: "common", symbol: "✨", hue: 280 },
  { id: "wolf", name: "ムーンウルフ", cost: 4, attack: 4, hp: 4, kind: "creature", rarity: "rare", symbol: "🐺", hue: 260 },
  { id: "phoenix", name: "フェニクス", cost: 5, attack: 5, hp: 4, kind: "creature", rarity: "rare", symbol: "🦅", hue: 15 },
  { id: "dragon", name: "エルダードラゴン", cost: 6, attack: 7, hp: 6, kind: "creature", rarity: "rare", symbol: "🐉", hue: 330 },
];

export interface CardInstance {
  uid: string;
  def: CardDef;
  currentHp?: number;
  currentAttack?: number;
}

let uidCounter = 0;
export function makeInstance(defId: string): CardInstance {
  const def = CARD_DEFS.find((d) => d.id === defId);
  if (!def) throw new Error(`unknown card def: ${defId}`);
  uidCounter += 1;
  return {
    uid: `${defId}-${uidCounter}-${Math.random().toString(36).slice(2, 7)}`,
    def,
    currentHp: def.hp,
    currentAttack: def.attack,
  };
}

export function buildDeck(): CardInstance[] {
  const pool = CARD_DEFS.flatMap((d) => [d.id, d.id, d.id]);
  const deck = pool.map((id) => makeInstance(id));
  // シャッフル
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
