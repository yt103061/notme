// ランキング。Supabase 未設定・オフライン時は空配列を返す（呼び出し側で「見られません」表示）。

import { getSupabaseClient } from './supabase';

export type LeaderboardCategory = 'total_chips' | 'pvp_wins' | 'pvp_win_rate' | 'games_played';
export type LeaderboardPeriod = 'all' | 'monthly' | 'weekly';

export interface LeaderboardEntry {
  displayName: string;
  chipBalance: number;
  gamesPlayed: number;
  pvpWins: number;
  pvpGames: number;
  score: number;
}

function scoreFor(row: LeaderboardEntry, category: LeaderboardCategory): number {
  if (category === 'pvp_wins') return row.pvpWins;
  if (category === 'pvp_win_rate') return row.pvpGames > 0 ? Math.round((row.pvpWins / row.pvpGames) * 1000) / 10 : 0;
  if (category === 'games_played') return row.gamesPlayed;
  return row.chipBalance;
}

export async function fetchLeaderboard(
  limit = 20,
  category: LeaderboardCategory = 'total_chips',
  period: LeaderboardPeriod = 'all',
): Promise<LeaderboardEntry[]> {
  const client = await getSupabaseClient();
  if (!client) return [];

  const v2 = await client.rpc('get_leaderboard_v2', {
    limit_count: limit,
    category_key: category,
    period_key: period,
  });
  if (!v2.error && v2.data) {
    return (v2.data as {
      display_name: string;
      chip_balance: number;
      games_played: number;
      pvp_wins?: number;
      pvp_games?: number;
      score?: number;
    }[]).map((row) => {
      const entry = {
        displayName: row.display_name,
        chipBalance: row.chip_balance,
        gamesPlayed: row.games_played,
        pvpWins: row.pvp_wins ?? 0,
        pvpGames: row.pvp_games ?? 0,
        score: row.score ?? 0,
      };
      return { ...entry, score: entry.score || scoreFor(entry, category) };
    });
  }

  const { data, error } = await client.rpc('get_leaderboard', { limit_count: limit });
  if (error || !data) return [];
  return (data as { display_name: string; chip_balance: number; games_played: number }[])
    .map((row) => {
      const entry = {
        displayName: row.display_name,
        chipBalance: row.chip_balance,
        gamesPlayed: row.games_played,
        pvpWins: 0,
        pvpGames: 0,
        score: 0,
      };
      return { ...entry, score: scoreFor(entry, category) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
