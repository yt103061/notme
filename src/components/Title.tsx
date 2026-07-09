import { useState } from 'react';
import * as S from '../strings';
import type { DailyBonusStatus } from '../platform/wallet';

interface TitleProps {
  onStart: () => void;
  chipBalance: number;
  buyInCost: number;
  canAfford: boolean;
  dailyBonus: DailyBonusStatus;
  onClaimBonus: () => void;
  displayName: string;
  onRename: (name: string) => void;
  onOpenRanking: () => void;
  onOpenAccount: () => void;
}

export function Title({
  onStart,
  chipBalance,
  buyInCost,
  canAfford,
  dailyBonus,
  onClaimBonus,
  displayName,
  onRename,
  onOpenRanking,
  onOpenAccount,
}: TitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== displayName) onRename(next);
    else setDraft(displayName);
  }

  return (
    <div className="title">
      <div className="title__profile">
        <span className="title__profileAvatar" aria-hidden>
          🙂
        </span>
        {editing ? (
          <input
            className="title__nameInput"
            value={draft}
            autoFocus
            maxLength={16}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraft(displayName);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            className="title__profileName"
            onClick={() => {
              setDraft(displayName);
              setEditing(true);
            }}
          >
            <span className="title__nameText">{displayName}</span>
            <span className="title__editIcon" aria-hidden>
              ✎
            </span>
          </button>
        )}
        <span className="title__profileChips">{S.CHIP_BALANCE_LABEL(chipBalance)}</span>
      </div>

      <div className="title__fan" aria-hidden>
        <div className="title__fanCard title__fanCard--l" />
        <div className="title__fanCard title__fanCard--r" />
        <div className="title__fanCard title__fanCard--c">
          <span>?</span>
        </div>
      </div>
      <h1 className="title__name">{S.APP_NAME}</h1>
      <p className="title__subtitle">{S.APP_SUBTITLE}</p>
      <p className="title__hook">{S.HOOK_LINE}</p>

      {dailyBonus.available ? (
        <button className="btn btn--secondary title__bonusBtn" onClick={onClaimBonus}>
          🎁 {S.DAILY_BONUS_BUTTON}（+{dailyBonus.amount}
          {S.CHIP_ICON}）
        </button>
      ) : (
        <p className="title__bonusClaimed">{S.DAILY_BONUS_ALREADY_CLAIMED}</p>
      )}

      {canAfford ? (
        <button className="btn btn--primary btn--large" onClick={onStart}>
          {S.TITLE_START}
        </button>
      ) : (
        <div className="title__insufficient">
          <p className="title__insufficientTitle">{S.INSUFFICIENT_CHIPS_TITLE}</p>
          <p className="title__insufficientBody">{S.INSUFFICIENT_CHIPS_BODY}</p>
        </div>
      )}
      <p className="title__buyIn">{S.BUY_IN_LABEL(buyInCost)}</p>

      <div className="title__linkRow">
        <button className="btn btn--ghost" onClick={onOpenRanking}>
          {S.RANKING_BUTTON}
        </button>
        <button className="btn btn--ghost" onClick={onOpenAccount}>
          {S.ACCOUNT_BUTTON}
        </button>
      </div>

      <p className="title__blurb">{S.TITLE_RULES_BLURB}</p>
    </div>
  );
}
