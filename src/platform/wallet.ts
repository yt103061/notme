// 永続チップウォレット。
// - localStorage を常にローカルキャッシュ／フォールバックとして使う（オフラインでも動く）
// - Supabase が設定されていれば、起動時に匿名アカウントでサーバーのプロフィールから残高を
//   ハイドレートし、以降の変更はバックグラウンドでサーバーへ同期する（サーバーが真実の源）
// どの経路でも読み取りは同期的（ローカルキャッシュ）なので、UI 側の実装は単純なまま。

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

const BALANCE_KEY = 'notme_chip_balance';
const LAST_BONUS_KEY = 'notme_last_bonus_date';
const BONUS_STREAK_KEY = 'notme_bonus_streak';
const NAME_KEY = 'notme_display_name';

export const STARTING_BALANCE = 1000;
/** ゲームに着席する際にウォレットから持ち込むスタック。ゲーム終了時に残りを払い戻す（キャッシュアウト） */
export const SIT_DOWN_STACK = 300;

const BONUS_BASE = 100;
const BONUS_STREAK_STEP = 20;
const BONUS_STREAK_CAP = 7;

let client: SupabaseClient | null = null;
let userId: string | null = null;

/** クラウド（Supabase）同期が有効に接続できているか */
export function isCloudActive(): boolean {
  return Boolean(client && userId);
}

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
  scheduleSync();
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

// ----- プロフィール（表示名） -----

export function getDisplayName(): string {
  const stored = localStorage.getItem(NAME_KEY);
  if (stored) return stored;
  // 未設定なら端末ローカルにデフォルトのハンドルを生成して保存する
  const generated = `プレイヤー${Math.floor(1000 + Math.random() * 9000)}`;
  localStorage.setItem(NAME_KEY, generated);
  return generated;
}

export function setDisplayName(name: string): string {
  const trimmed = name.trim().slice(0, 16) || getDisplayName();
  localStorage.setItem(NAME_KEY, trimmed);
  scheduleSync();
  return trimmed;
}

// ----- サーバー同期（Supabase） -----

let syncTimer: ReturnType<typeof setTimeout> | null = null;

/** 変更を少し遅延させてまとめてサーバーへ書き込む（連続操作でのスパムを避ける） */
function scheduleSync() {
  if (!client || !userId) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void pushProfile();
  }, 600);
}

async function pushProfile(): Promise<void> {
  if (!client || !userId) return;
  try {
    await client
      .from('profiles')
      .update({
        chip_balance: getBalance(),
        last_bonus_date: localStorage.getItem(LAST_BONUS_KEY),
        bonus_streak: readInt(BONUS_STREAK_KEY, 0),
        display_name: localStorage.getItem(NAME_KEY),
      })
      .eq('id', userId);
  } catch {
    // ネットワーク不調時はローカルキャッシュのみで続行（次の変更で再送される）
  }
}

/**
 * 起動時に呼ぶ。Supabase が有効なら匿名サインインし、サーバーのプロフィールから
 * ローカルキャッシュをハイドレートする。未設定・失敗時は localStorage のみで動作する。
 */
export async function initWallet(): Promise<void> {
  const c = await getSupabaseClient();
  if (!c) return; // localStorage-only モード（Supabase 未設定）
  try {
    let {
      data: { session },
    } = await c.auth.getSession();
    if (!session) {
      const { data, error } = await c.auth.signInAnonymously();
      if (error) throw error;
      session = data.session;
    }
    userId = session?.user?.id ?? null;
    if (!userId) return;
    client = c; // ここまで来たらクラウド同期を有効化する

    const { data: profile } = await c
      .from('profiles')
      .select('chip_balance, last_bonus_date, bonus_streak, display_name')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      // サーバーを真実の源としてローカルキャッシュを上書きする
      localStorage.setItem(BALANCE_KEY, String(profile.chip_balance ?? STARTING_BALANCE));
      localStorage.setItem(BONUS_STREAK_KEY, String(profile.bonus_streak ?? 0));
      if (profile.last_bonus_date) localStorage.setItem(LAST_BONUS_KEY, profile.last_bonus_date);
      else localStorage.removeItem(LAST_BONUS_KEY);
      if (profile.display_name) localStorage.setItem(NAME_KEY, profile.display_name);
      else await pushProfile(); // 表示名未設定ならローカル生成分をサーバーへ反映
    } else {
      // トリガーによる自動作成が間に合わなかった場合の保険：現在のローカル値で作成する
      await c.from('profiles').insert({
        id: userId,
        chip_balance: getBalance(),
        display_name: localStorage.getItem(NAME_KEY) ?? getDisplayName(),
      });
    }
  } catch {
    client = null;
    userId = null; // フォールバック：localStorage のみで続行
  }
}

/** ゲーム終了（キャッシュアウト）のたびに呼ぶ。サーバー側の games_played をアトミックに+1する */
export async function recordGameCompleted(): Promise<void> {
  if (!client || !userId) return;
  try {
    await client.rpc('increment_games_played');
  } catch {
    // ランキング用の副次的な記録なのでベストエフォート。失敗してもゲーム進行には影響しない
  }
}

export interface AccountUpgradeResult {
  ok: boolean;
  message: string;
}

/**
 * 匿名アカウントをメール+パスワードの本アカウントへアップグレードする。
 * 同じユーザーID（＝同じプロフィール・チップ残高）を維持したまま昇格するので、
 * 機種変更やブラウザデータ削除後もサインインし直せば引き継げるようになる。
 */
export async function upgradeAccount(email: string, password: string): Promise<AccountUpgradeResult> {
  if (!client || !userId) {
    return { ok: false, message: 'オフラインモードのため利用できません（通信環境を確認してください）' };
  }
  const { error } = await client.auth.updateUser({ email, password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: '確認メールを送信しました。メール内のリンクを開くと登録が完了します。' };
}
