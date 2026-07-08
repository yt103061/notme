import * as S from '../strings';
import type { DailyBonusStatus } from '../platform/wallet';

interface TitleProps {
  onStart: () => void;
  chipBalance: number;
  buyInCost: number;
  canAfford: boolean;
  dailyBonus: DailyBonusStatus;
  onClaimBonus: () => void;
}

export function Title({ onStart, chipBalance, buyInCost, canAfford, dailyBonus, onClaimBonus }: TitleProps) {
  return (
    <div className="title">
      <div className="title__chipBadge">{S.CHIP_BALANCE_LABEL(chipBalance)}</div>

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
          🎁 {S.DAILY_BONUS_BUTTON}（+{dailyBonus.amount}{S.CHIP_ICON}）
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
      <p className="title__blurb">{S.TITLE_RULES_BLURB}</p>
    </div>
  );
}
