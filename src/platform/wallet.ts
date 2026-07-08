// 永続チップウォレット。localStorage にブラウザ内で保存する（Phase 1 はサーバー同期なし）。
// ゲーム参加費・最終得点に応じた払い戻し・デイリーボーナス（連続日数で微増）を扱う。

const BALANCE_KEY = 'notme_chip_balance';
const LAST_BONUS_KEY = 'notme_last_bonus_date';
const BONUS_STREAK_KEY = 'notme_bonus_streak';

export const STARTING_BALANCE = 1000;
/** ゲームに着席する際にウォレットから持ち込むスタック。ゲーム終了時に残りを払い戻す（キャッシュアウト） */
export const SIT_DOWN_STACK = 300;

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

export function canSitDown(): boolean {
  return getBalance() >= SIT_DOWN_STACK;
}

/** 着席：ウォレットからスタック分を持ち出す。持ち込んだスタック額を返す */
export function sitDown(): number {
  setBalance(getBalance() - SIT_DOWN_STACK);
  return SIT_DOWN_STACK;
}

/** キャッシュアウト：ゲーム終了時に残りスタックをウォレットへ払い戻す。純増減も返す */
export function cashOut(finalStack: number): { delta: number; newBalance: number } {
  const newBalance = addChips(finalStack);
  return { delta: finalStack - SIT_DOWN_STACK, newBalance };
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
