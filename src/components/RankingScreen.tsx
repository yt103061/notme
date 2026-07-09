import { useEffect, useState } from 'react';
import { fetchLeaderboard, type LeaderboardEntry } from '../platform/ranking';
import * as S from '../strings';

interface RankingScreenProps {
  onClose: () => void;
}

export function RankingScreen({ onClose }: RankingScreenProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard(20).then((rows) => {
      if (!cancelled) setEntries(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="ranking" onClick={onClose}>
      <div className="ranking__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ranking__header">
          <h2 className="ranking__title">{S.RANKING_TITLE}</h2>
          <button className="btn btn--icon" onClick={onClose} aria-label={S.RANKING_CLOSE}>
            ✕
          </button>
        </div>
        <div className="ranking__body">
          {entries === null && <p className="ranking__empty">{S.RANKING_LOADING}</p>}
          {entries !== null && entries.length === 0 && <p className="ranking__empty">{S.RANKING_EMPTY}</p>}
          {entries?.map((entry, i) => (
            <div key={i} className={`ranking__row ${i === 0 ? 'ranking__row--top' : ''}`}>
              <span className="ranking__rank">{i + 1}</span>
              <span className="ranking__name">
                {entry.displayName}
                {i === 0 && ' 👑'}
              </span>
              <span className="ranking__games">{S.RANKING_GAMES_PLAYED(entry.gamesPlayed)}</span>
              <span className="ranking__chips">
                {S.CHIP_ICON} {entry.chipBalance.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
