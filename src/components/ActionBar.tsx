import { useState } from 'react';
import type { PlayerState } from '../engine/game';
import * as S from '../strings';

interface DecisionModeProps {
  mode: 'decision';
  onStay: () => void;
  onFold: () => void;
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
    return (
      <div className="actionbar">
        <p className="actionbar__prompt">{S.YOUR_TURN_DECIDE}</p>
        <div className="actionbar__row">
          <button className="btn btn--primary" onClick={props.onStay}>
            {S.ACTION_STAY}
          </button>
          <button className="btn btn--danger" onClick={props.onFold}>
            {S.ACTION_FOLD}
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
