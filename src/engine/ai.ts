// vs AI 用の意思決定。モンテカルロで自分の推定勝率を出し、人格パラメータで残る/降りる/交換を決める。
// AI は「自分視点で見える情報」だけを使う＝人間プレイヤーと同じ非対称情報の下で判断するため、
// AI の挙動そのものが読み合いのシグナルになる。

import { type Card, type Rng, createDeck, shuffle, cardKey } from './cards';
import { evaluateFive, compareHands } from './evaluator';
import { activePlayers, type GameState, type ExchangeAction, type Hint } from './game';

export type PersonalityId = 'aggressive' | 'steady' | 'tricky';

export interface Personality {
  id: PersonalityId;
  name: string;
  /** この推定勝率を下回ったら降りる（ノイズ加算前のベースライン） */
  stayThreshold: number;
  /** 交換フェーズで相手の not me を奪いに行く積極性 0-1 */
  stealAggressiveness: number;
  /** 判断に乗せるランダムなゆらぎ（ブラフ・誤判断の余地） */
  bluffVariance: number;
}

export const PERSONALITIES: Record<PersonalityId, Personality> = {
  aggressive: {
    id: 'aggressive',
    name: '強気',
    stayThreshold: 0.36,
    stealAggressiveness: 0.75,
    bluffVariance: 0.12,
  },
  steady: {
    id: 'steady',
    name: '堅実',
    stayThreshold: 0.52,
    stealAggressiveness: 0.3,
    bluffVariance: 0.05,
  },
  tricky: {
    id: 'tricky',
    name: 'トリッキー',
    stayThreshold: 0.45,
    stealAggressiveness: 0.55,
    bluffVariance: 0.22,
  },
};

function hintFilter(hint: Hint | null): (c: Card) => boolean {
  if (!hint) return () => true;
  switch (hint.kind) {
    case 'parity':
      return (c) => (hint.label === '偶数' ? c.rank % 2 === 0 : c.rank % 2 === 1);
    case 'range':
      return (c) => (hint.label === '8以上' ? c.rank >= 8 : c.rank <= 7);
    case 'face':
      return (c) => {
        const isFaceOrAce = (c.rank >= 11 && c.rank <= 13) || c.rank === 14;
        return hint.label === '絵札かA' ? isFaceOrAce : !isFaceOrAce;
      };
    case 'color':
      return (c) => {
        const red = c.suit === 'H' || c.suit === 'D';
        return hint.label === '赤' ? red : !red;
      };
  }
}

/** プレイヤー視点でのモンテカルロ勝率推定（0〜1） */
export function estimateWinProbability(
  state: GameState,
  playerId: number,
  trials: number,
  rng: Rng,
): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 0;
  const opponents = activePlayers(state).filter((p) => p.id !== playerId);
  if (opponents.length === 0) return 1;

  const used = new Set<string>();
  for (const c of player.hole) used.add(cardKey(c));
  for (const p of activePlayers(state)) used.add(cardKey(p.notMe));
  for (const c of state.community) used.add(cardKey(c));

  const available = createDeck().filter((c) => !used.has(cardKey(c)));
  const passesHint = hintFilter(player.hint);

  let wins = 0;
  let ties = 0;

  for (let t = 0; t < trials; t++) {
    const pool = shuffle(available, rng);
    let myNotMeIdx = pool.findIndex(passesHint);
    if (myNotMeIdx === -1) myNotMeIdx = 0;
    const myNotMe = pool[myNotMeIdx];
    const rest = pool.filter((_, i) => i !== myNotMeIdx);

    let cursor = 0;
    const oppHoles = opponents.map(() => [rest[cursor++], rest[cursor++]]);
    let community = state.community;
    if (community.length < 2) community = [rest[cursor++], rest[cursor++]];

    const myHand = evaluateFive([...player.hole, myNotMe, ...community]);

    let beaten = false;
    let tied = false;
    for (let i = 0; i < opponents.length; i++) {
      const oppHand = evaluateFive([...oppHoles[i], opponents[i].notMe, ...community]);
      const cmp = compareHands(myHand, oppHand);
      if (cmp < 0) {
        beaten = true;
        break;
      }
      if (cmp === 0) tied = true;
    }
    if (!beaten) {
      if (tied) ties++;
      else wins++;
    }
  }

  return (wins + ties * 0.5) / trials;
}

const TRIALS = 300;

export function decideFold(
  state: GameState,
  playerId: number,
  personality: Personality,
  rng: Rng,
): boolean {
  const winProb = estimateWinProbability(state, playerId, TRIALS, rng);
  const noise = (rng() - 0.5) * 2 * personality.bluffVariance;
  return winProb + noise < personality.stayThreshold;
}

export interface FoldDecision {
  fold: boolean;
  emote: string;
}

/** decideFold と同じ判断ロジックに加え、UI 用の一言リアクションもまとめて返す */
export function decideFoldWithEmote(
  state: GameState,
  playerId: number,
  personality: Personality,
  rng: Rng,
): FoldDecision {
  const winProb = estimateWinProbability(state, playerId, TRIALS, rng);
  const noise = (rng() - 0.5) * 2 * personality.bluffVariance;
  const fold = winProb + noise < personality.stayThreshold;
  const emote = pickEmote(winProb, rng);
  return { fold, emote: emote.text };
}

export function decideExchange(
  state: GameState,
  playerId: number,
  personality: Personality,
  rng: Rng,
): ExchangeAction {
  const winProb = estimateWinProbability(state, playerId, TRIALS, rng);
  if (winProb > 0.62) return { type: 'pass' };

  const opponents = activePlayers(state).filter((p) => p.id !== playerId);
  if (opponents.length > 0 && rng() < personality.stealAggressiveness) {
    let target = opponents[0];
    for (const o of opponents) {
      if (o.notMe.rank > target.notMe.rank) target = o;
    }
    if (target.notMe.rank >= 9) {
      return { type: 'steal', targetId: target.id };
    }
  }
  if (winProb < 0.45) return { type: 'drawDeck' };
  return { type: 'pass' };
}

export type EmoteMood = 'confident' | 'nervous' | 'neutral';

const EMOTE_LINES: Record<EmoteMood, string[]> = {
  confident: ['いい感じかも', 'これは残るしかない', 'ふふ、勝負する'],
  nervous: ['うーん、微妙…', 'ちょっと弱気かも', '悩むところだね'],
  neutral: ['どうしようかな', 'さて、どうする', '読めないな'],
};

export function pickEmote(winProb: number, rng: Rng): { mood: EmoteMood; text: string } {
  const mood: EmoteMood = winProb >= 0.58 ? 'confident' : winProb <= 0.4 ? 'nervous' : 'neutral';
  const lines = EMOTE_LINES[mood];
  return { mood, text: lines[Math.floor(rng() * lines.length)] };
}
