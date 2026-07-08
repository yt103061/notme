import { useState } from 'react';
import { BET_AMOUNTS, type BetChoice, type PlayerState } from '../engine/game';
import * as S from '../strings';

interface DecisionModeProps {
  mode: 'decision';
  stack: number;
  onBet: (choice: BetChoice) => void;
}

interface ExchangeModeProps {
  mode: 'exchange';
  opponents: PlayerState[];
  onExchangeDeck: () => void;
  onExchangeSteal: (targetId: number) => void;
  onExchangePass: () => void;
}

interface WaitingModeProps {
  mode: 'waiting';
  message?: string;
}

type ActionBarProps = DecisionModeProps | ExchangeModeProps | WaitingModeProps;

export function ActionBar(props: ActionBarProps) {
  const [pickingTarget, setPickingTarget] = useState(false);

  if (props.mode === 'decision') {
    const { stack, onBet } = props;
    return (
      <div className="actionbar">
        <p className="actionbar__prompt">{S.YOUR_TURN_DECIDE}</p>
        <div className="actionbar__bets">
          <button className="btn btn--danger actionbar__betBtn" onClick={() => onBet('fold')}>
            {S.ACTION_FOLD}
          </button>
          <button className="btn btn--ghost actionbar__betBtn" onClick={() => onBet('stay')}>
            {S.ACTION_STAY}
            <span className="actionbar__betAmt">+{S.CHIP_ICON}{BET_AMOUNTS.stay}</span>
          </button>
          <button
            className="btn btn--secondary actionbar__betBtn"
            onClick={() => onBet('raise')}
            disabled={stack < BET_AMOUNTS.stay}
          >
            {S.ACTION_RAISE}
            <span className="actionbar__betAmt">+{S.CHIP_ICON}{Math.min(BET_AMOUNTS.raise, stack)}</span>
          </button>
          <button
            className="btn btn--primary actionbar__betBtn"
            onClick={() => onBet('big')}
            disabled={stack < BET_AMOUNTS.raise}
          >
            {S.ACTION_BIG}
            <span className="actionbar__betAmt">+{S.CHIP_ICON}{Math.min(BET_AMOUNTS.big, stack)}</span>
          </button>
        </div>
      </div>
    );
  }

  if (props.mode === 'exchange') {
    if (pickingTarget) {
      return (
        <div className="actionbar">
          <p className="actionbar__prompt">{S.PICK_STEAL_TARGET}</p>
          <div className="actionbar__row">
            {props.opponents.map((o) => (
              <button
                key={o.id}
                className="btn btn--secondary"
                onClick={() => {
                  setPickingTarget(false);
                  props.onExchangeSteal(o.id);
                }}
              >
                {o.name}
              </button>
            ))}
          </div>
          <button className="btn btn--ghost" onClick={() => setPickingTarget(false)}>
            {S.ACTION_BACK}
          </button>
        </div>
      );
    }
    return (
      <div className="actionbar">
        <p className="actionbar__prompt">{S.YOUR_TURN_EXCHANGE}</p>
        <div className="actionbar__row">
          <button className="btn btn--primary" onClick={props.onExchangeDeck}>
            {S.ACTION_EXCHANGE_DECK}
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => setPickingTarget(true)}
            disabled={props.opponents.length === 0}
          >
            {S.ACTION_EXCHANGE_STEAL}
          </button>
          <button className="btn btn--ghost" onClick={props.onExchangePass}>
            {S.ACTION_EXCHANGE_PASS}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="actionbar actionbar--waiting">
      <p className="actionbar__prompt">{props.message ?? S.WAITING_FOR_OTHERS}</p>
    </div>
  );
}
