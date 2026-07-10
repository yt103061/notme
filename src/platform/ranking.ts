// チップ獲得数ランキング。Supabase 未設定・オフライン時は空配列を返す（呼び出し側で「見られません」表示）。

import { getSupabaseClient } from './supabase';

export interface LeaderboardEntry {
  displayName: string;
  chipBalance: number;
  gamesPlayed: number;
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const client = await getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client.rpc('get_leaderboard', { limit_count: limit });
  if (error || !data) return [];
  return (data as { display_name: string; chip_balance: number; games_played: number }[]).map((row) => ({
    displayName: row.display_name,
    chipBalance: row.chip_balance,
    gamesPlayed: row.games_played,
  }));
}
