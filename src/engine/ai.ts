// vs AI 用の意思決定。モンテカルロで自分の推定勝率を出し、人格パラメータで残る/降りる/交換を決める。
// AI は「自分視点で見える情報」だけを使う＝人間プレイヤーと同じ非対称情報の下で判断するため、
// AI の挙動そのものが読み合いのシグナルになる。
//
// チューニング方針：ショーダウンこそがこのゲームの最大の報酬（not me 開示の瞬間）なので、
// AI は「基本は勝負を受ける」側に寄せる。4人戦の平均勝率は 0.25 であり、閾値はそれを下回るように
// 設定して「明らかに負けている時だけ降りる」挙動にする。交換に投資したハンドは降りにくくなる
// （人間のサンクコスト心理の再現＝行動が読みやすくなり、かつ試合が動く）。

import { type Card, type Rng, createDeck, shuffle, cardKey } from './cards';
import { evaluateFive, compareHands } from './evaluator';
import { activePlayers, type GameState, type ExchangeAction, type Hint } from './game';

export type PersonalityId = 'aggressive' | 'steady' | 'tricky';

export interface Personality {
  id: PersonalityId;
  name: string;
  /** 場札公開前（①降り判断）の残留閾値。低いほど勝負を受ける */
  stayThresholdPreFlop: number;
  /** 場札公開後（②降り判断）の残留閾値 */
  stayThresholdPostFlop: number;
  /** 交換フェーズで相手の not me を奪いに行く積極性 0-1 */
  stealAggressiveness: number;
  /** 奪う価値があると感じる notMe の最低ランク */
  stealMinRank: number;
  /** 判断に乗せるランダムなゆらぎ（ブラフ・誤判断の余地） */
  bluffVariance: number;
}

export const PERSONALITIES: Record<PersonalityId, Personality> = {
  aggressive: {
    id: 'aggressive',
    name: '強気',
    stayThresholdPreFlop: 0.12,
    stayThresholdPostFlop: 0.24,
    stealAggressiveness: 0.8,
    stealMinRank: 8,
    bluffVariance: 0.1,
  },
  steady: {
    id: 'steady',
    name: '堅実',
    stayThresholdPreFlop: 0.2,
    stayThresholdPostFlop: 0.34,
    stealAggressiveness: 0.35,
    stealMinRank: 11,
    bluffVariance: 0.06,
  },
  tricky: {
    id: 'tricky',
    name: 'トリッキー',
    stayThresholdPreFlop: 0.15,
    stayThresholdPostFlop: 0.28,
    stealAggressiveness: 0.6,
    stealMinRank: 9,
    bluffVariance: 0.18,
  },
};

/** 交換に投資済みのハンドは降りにくくなる（サンクコスト心理の再現） */
const SUNK_COST_BONUS = 0.05;

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

export interface FoldDecision {
  fold: boolean;
  winProb: number;
}

/** round=1 は場札公開前、round=2 は場札公開後の降り判断 */
export function decideFoldWithEquity(
  state: GameState,
  playerId: number,
  personality: Personality,
  rng: Rng,
  round: 1 | 2 = 2,
): FoldDecision {
  const winProb = estimateWinProbability(state, playerId, TRIALS, rng);
  const player = state.players.find((p) => p.id === playerId);
  let threshold =
    round === 1 ? personality.stayThresholdPreFlop : personality.stayThresholdPostFlop;
  if (player?.usedExchange) threshold -= SUNK_COST_BONUS;
  const noise = (rng() - 0.5) * 2 * personality.bluffVariance;
  return { fold: winProb + noise < threshold, winProb };
}

export function decideFold(
  state: GameState,
  playerId: number,
  personality: Personality,
  rng: Rng,
  round: 1 | 2 = 2,
): boolean {
  return decideFoldWithEquity(state, playerId, personality, rng, round).fold;
}

export function decideExchange(
  state: GameState,
  playerId: number,
  personality: Personality,
  rng: Rng,
): ExchangeAction {
  const winProb = estimateWinProbability(state, playerId, TRIALS, rng);
  if (winProb > 0.65) return { type: 'pass' };

  const opponents = activePlayers(state).filter((p) => p.id !== playerId);
  if (opponents.length > 0 && rng() < personality.stealAggressiveness) {
    let target = opponents[0];
    for (const o of opponents) {
      if (o.notMe.rank > target.notMe.rank) target = o;
    }
    if (target.notMe.rank >= personality.stealMinRank) {
      return { type: 'steal', targetId: target.id };
    }
  }
  if (winProb < 0.42) return { type: 'drawDeck' };
  return { type: 'pass' };
}

// ----- リアクション（吹き出し） -----
// AI の一言は「本当に見えている情報」に基づくのが原則。プレイヤーはそれを読んで
// 自分の not me を逆算できる。トリッキーだけは時々逆のことを言う。

export type EmoteMood = 'confident' | 'nervous' | 'neutral';

const EMOTE_LINES: Record<EmoteMood, string[]> = {
  confident: ['いい感じかも♪', 'これは勝負でしょ', 'ふふ、残るよ', '手応えあり…！'],
  nervous: ['うーん、微妙…', 'これはキツいかも', '悩む〜…', '（そわそわ）'],
  neutral: ['どうしよっかな', '読めない展開…', 'さて、どうする？', '静かだね…'],
};

export function pickEmote(winProb: number, rng: Rng): { mood: EmoteMood; text: string } {
  const mood: EmoteMood = winProb >= 0.5 ? 'confident' : winProb <= 0.32 ? 'nervous' : 'neutral';
  const lines = EMOTE_LINES[mood];
  return { mood, text: lines[Math.floor(rng() * lines.length)] };
}

const NOTME_STRONG_LINES = [
  'うわ、いいカード見えてる…',
  'それ、自分だけ知らないんだよね…ふふ',
  'ちょっと羨ましいかも',
  '（あのカードは強い…）',
];
const NOTME_MID_LINES = ['ふーん、なるほどね', 'なんとも言えないカード', 'びみょ〜なライン'];
const NOTME_WEAK_LINES = [
  'ぷぷ、なんか和むカード',
  'あらら…',
  '見えてないほうが幸せかもよ？',
  '（チャンスかも）',
];

/** プレイヤーの notMe（AI には見えている）への一言。読み合いの主要シグナル */
export function reactToVisibleNotMe(rank: number, personality: Personality, rng: Rng): string {
  let pool: string[];
  if (rank >= 12) pool = NOTME_STRONG_LINES;
  else if (rank >= 7) pool = NOTME_MID_LINES;
  else pool = NOTME_WEAK_LINES;

  // トリッキーは時々真逆の反応でかく乱してくる
  if (personality.id === 'tricky' && rng() < 0.45) {
    pool = pool === NOTME_STRONG_LINES ? NOTME_WEAK_LINES : pool === NOTME_WEAK_LINES ? NOTME_STRONG_LINES : pool;
  }
  return pool[Math.floor(rng() * pool.length)];
}

const STEAL_LINES = ['それ、もらい！', 'いいカードはいただくね', 'ごめんね〜？', 'これで形勢逆転…！'];

export function pickStealLine(rng: Rng): string {
  return STEAL_LINES[Math.floor(rng() * STEAL_LINES.length)];
}
