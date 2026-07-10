import { useEffect, useState } from 'react';
import {
  fetchLeaderboard,
  type LeaderboardCategory,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from '../platform/ranking';
import * as S from '../strings';

interface RankingScreenProps {
  onClose: () => void;
}

const CATEGORIES: { key: LeaderboardCategory; label: string; metric: string }[] = [
  { key: 'total_chips', label: '総チップ', metric: 'TOTAL' },
  { key: 'pvp_wins', label: '対人勝利', metric: 'PVP WINS' },
  { key: 'pvp_win_rate', label: '対人勝率', metric: 'PVP RATE' },
  { key: 'games_played', label: 'プレイ数', metric: 'GAMES' },
];

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'all', label: '全期間' },
  { key: 'monthly', label: '月間' },
  { key: 'weekly', label: '週間' },
];

function scoreLabel(entry: LeaderboardEntry, category: LeaderboardCategory): string {
  if (category === 'pvp_wins') return `${entry.pvpWins}勝`;
  if (category === 'pvp_win_rate') return entry.pvpGames > 0 ? `${entry.score}%` : '—';
  if (category === 'games_played') return S.RANKING_GAMES_PLAYED(entry.gamesPlayed);
  return `${S.CHIP_ICON} ${entry.chipBalance.toLocaleString()}`;
}

export function RankingScreen({ onClose }: RankingScreenProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [category, setCategory] = useState<LeaderboardCategory>('total_chips');
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    fetchLeaderboard(20, category, period).then((rows) => {
      if (!cancelled) setEntries(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [category, period]);

  const activeCategory = CATEGORIES.find((c) => c.key === category)!;

  return (
    <div className="ranking" onClick={onClose}>
      <div className="ranking__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ranking__header">
          <div>
            <p className="ranking__kicker">{activeCategory.metric}</p>
            <h2 className="ranking__title">{S.RANKING_TITLE}</h2>
          </div>
          <button className="btn btn--icon" onClick={onClose} aria-label={S.RANKING_CLOSE}>
            ✕
          </button>
        </div>

        <div className="ranking__filters" aria-label="ランキング種別">
          {CATEGORIES.map((item) => (
            <button
              key={item.key}
              className={`ranking__filter ${category === item.key ? 'ranking__filter--active' : ''}`}
              onClick={() => setCategory(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="ranking__periods" aria-label="ランキング期間">
          {PERIODS.map((item) => (
            <button
              key={item.key}
              className={`ranking__period ${period === item.key ? 'ranking__period--active' : ''}`}
              onClick={() => setPeriod(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="ranking__body">
          {entries === null && <p className="ranking__empty">{S.RANKING_LOADING}</p>}
          {entries !== null && entries.length === 0 && <p className="ranking__empty">{S.RANKING_EMPTY}</p>}
          {entries?.map((entry, i) => (
            <div key={`${entry.displayName}-${i}`} className={`ranking__row ${i === 0 ? 'ranking__row--top' : ''}`}>
              <span className="ranking__rank">{i + 1}</span>
              <span className="ranking__name">
                {entry.displayName}
                {i === 0 && ' 👑'}
              </span>
              <span className="ranking__games">
                対人 {entry.pvpWins}/{entry.pvpGames} · {S.RANKING_GAMES_PLAYED(entry.gamesPlayed)}
              </span>
              <span className="ranking__chips">{scoreLabel(entry, category)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
