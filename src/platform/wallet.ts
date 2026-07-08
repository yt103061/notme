// 永続チップウォレット。localStorage にブラウザ内で保存する（Phase 1 はサーバー同期なし）。
// ゲーム参加費・最終得点に応じた払い戻し・デイリーボーナス（連続日数で微増）を扱う。

const BALANCE_KEY = 'notme_chip_balance';
const LAST_BONUS_KEY = 'notme_last_bonus_date';
const BONUS_STREAK_KEY = 'notme_bonus_streak';

export const STARTING_BALANCE = 1000;
export const BUY_IN_COST = 100;
/** 最終スコア1点あたりのチップ換算レート */
export const SCORE_TO_CHIP_RATE = 50;

const BONUS_BASE = 100;
const BONUS_STREAK_STEP = 20;
const BONUS_STREAK_CAP = 7;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readInt(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function getBalance(): number {
  const raw = localStorage.getItem(BALANCE_KEY);
  if (raw === null) {
    localStorage.setItem(BALANCE_KEY, String(STARTING_BALANCE));
    return STARTING_BALANCE;
  }
  return readInt(BALANCE_KEY, STARTING_BALANCE);
}

function setBalance(amount: number): number {
  const clamped = Math.max(0, Math.round(amount));
  localStorage.setItem(BALANCE_KEY, String(clamped));
  return clamped;
}

export function addChips(amount: number): number {
  return setBalance(getBalance() + amount);
}

export function canAffordBuyIn(): boolean {
  return getBalance() >= BUY_IN_COST;
}

/** ゲーム開始時の参加費を徴収する */
export function chargeBuyIn(): number {
  return setBalance(getBalance() - BUY_IN_COST);
}

/** 最終スコアをチップ増減に変換して反映する */
export function applyGameResult(finalScore: number): { delta: number; newBalance: number } {
  const delta = finalScore * SCORE_TO_CHIP_RATE;
  const newBalance = addChips(delta);
  return { delta, newBalance };
}

export interface DailyBonusStatus {
  available: boolean;
  /** 今claimした場合に得られる額 */
  amount: number;
  /** 今claimした場合の連続日数 */
  streak: number;
}

export function getDailyBonusStatus(): DailyBonusStatus {
  const lastDate = localStorage.getItem(LAST_BONUS_KEY);
  const today = dateKey(new Date());
  const currentStreak = readInt(BONUS_STREAK_KEY, 0);

  if (lastDate === today) {
    return { available: false, amount: 0, streak: currentStreak };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isConsecutive = lastDate === dateKey(yesterday);
  const nextStreak = isConsecutive ? Math.min(currentStreak + 1, BONUS_STREAK_CAP) : 1;
  const amount = BONUS_BASE + (nextStreak - 1) * BONUS_STREAK_STEP;
  return { available: true, amount, streak: nextStreak };
}

export function claimDailyBonus(): { amount: number; newBalance: number; streak: number } | null {
  const status = getDailyBonusStatus();
  if (!status.available) return null;
  localStorage.setItem(LAST_BONUS_KEY, dateKey(new Date()));
  localStorage.setItem(BONUS_STREAK_KEY, String(status.streak));
  const newBalance = addChips(status.amount);
  return { amount: status.amount, newBalance, streak: status.streak };
}
