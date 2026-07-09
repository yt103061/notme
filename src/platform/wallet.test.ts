import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getBalance,
  addChips,
  canSitDown,
  sitDown,
  cashOut,
  getDailyBonusStatus,
  claimDailyBonus,
  STARTING_BALANCE,
  SIT_DOWN_STACK,
} from './wallet';

// テスト間で完全に独立させるため、localStorage をインメモリのモックに差し替える
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createMemoryStorage());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('wallet', () => {
  it('starts new players with the default balance', () => {
    expect(getBalance()).toBe(STARTING_BALANCE);
  });

  it('draws the sit-down stack from the wallet and reports affordability', () => {
    expect(canSitDown()).toBe(true);
    const stack = sitDown();
    expect(stack).toBe(SIT_DOWN_STACK);
    expect(getBalance()).toBe(STARTING_BALANCE - SIT_DOWN_STACK);
  });

  it('never lets the balance go negative', () => {
    addChips(-1_000_000);
    expect(getBalance()).toBe(0);
  });

  it('cashing out a winning stack adds net winnings to the wallet', () => {
    sitDown(); // wallet -= 300
    const { delta, newBalance } = cashOut(500); // 300 持ち込みが 500 になって戻る
    expect(delta).toBe(500 - SIT_DOWN_STACK);
    expect(newBalance).toBe(STARTING_BALANCE - SIT_DOWN_STACK + 500);
    expect(getBalance()).toBe(newBalance);
  });

  it('cashing out a busted stack leaves the sit-down cost as the net loss', () => {
    sitDown();
    const { delta, newBalance } = cashOut(0);
    expect(delta).toBe(-SIT_DOWN_STACK);
    expect(newBalance).toBe(STARTING_BALANCE - SIT_DOWN_STACK);
  });

  it('daily bonus is available for a brand new player and grants the base amount at streak 1', () => {
    const status = getDailyBonusStatus();
    expect(status.available).toBe(true);
    expect(status.streak).toBe(1);
    expect(status.amount).toBeGreaterThan(0);
  });

  it('claiming the bonus updates the balance and makes it unavailable again today', () => {
    const result = claimDailyBonus();
    expect(result).not.toBeNull();
    expect(getBalance()).toBe(STARTING_BALANCE + result!.amount);
    expect(getDailyBonusStatus().available).toBe(false);
    expect(claimDailyBonus()).toBeNull();
  });

  it('consecutive-day claims increase the streak and bonus amount', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T09:00:00'));

    const day1 = claimDailyBonus()!;
    expect(day1.streak).toBe(1);

    vi.setSystemTime(new Date('2026-01-02T09:00:00'));
    const day2Status = getDailyBonusStatus();
    expect(day2Status.available).toBe(true);
    expect(day2Status.streak).toBe(2);
    expect(day2Status.amount).toBeGreaterThan(day1.amount);

    const day2 = claimDailyBonus()!;
    expect(day2.streak).toBe(2);
  });

  it('a missed day resets the streak back to 1', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T09:00:00'));
    claimDailyBonus();

    // 1日飛ばして3日目に請求 → 連続でないのでストリークは1に戻る
    vi.setSystemTime(new Date('2026-01-03T09:00:00'));
    expect(getDailyBonusStatus().streak).toBe(1);
  });
});
