import { useEffect, useState } from 'react';
import { BET_AMOUNTS, type BetChoice, type DecisionTell, type PlayerState, type TellKind } from '../engine/game';
import { CardView } from './CardView';
import * as S from '../strings';

interface DecisionModeProps {
  mode: 'decision';
  stack: number;
  onBet: (choice: BetChoice, tell: DecisionTell) => void;
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
  const [decisionStartedAt, setDecisionStartedAt] = useState(() => Date.now());
  const [hoveredChoices, setHoveredChoices] = useState<BetChoice[]>([]);

  useEffect(() => {
    setDecisionStartedAt(Date.now());
    setHoveredChoices([]);
  }, [props.mode]);

  function markIntent(choice: BetChoice) {
    setHoveredChoices((items) => (items[items.length - 1] === choice ? items : [...items, choice]));
  }

  function tellFor(choice: BetChoice): DecisionTell {
    const elapsedMs = Date.now() - decisionStartedAt;
    const tell: TellKind = elapsedMs < 1400 ? 'snap' : elapsedMs < 4200 ? 'steady' : elapsedMs < 8500 ? 'tank' : 'panic';
    const unique = new Set([...hoveredChoices, choice]);
    const wavered = unique.size > 1;
    const reaction = choice === 'big' ? '😏 勝負' : choice === 'raise' ? '🤔 上げる' : choice === 'fold' ? '… 降り' : '🙂 様子見';
    return { choice, tell, wavered, reaction, elapsedMs };
  }

  if (props.mode === 'decision') {
    const { stack, onBet } = props;
    return (
      <div className="actionbar">
        <div className="actionbar__heading">
          <span className="actionbar__kicker">{S.ACTION_DOCK_DECISION_LABEL}</span>
          <p className="actionbar__prompt">{S.YOUR_TURN_DECIDE}</p>
        </div>
        <div className="actionbar__bets">
          <button className="btn btn--danger actionbar__betBtn" onPointerEnter={() => markIntent('fold')} onFocus={() => markIntent('fold')} onClick={() => onBet('fold', tellFor('fold'))}>
            <span>{S.ACTION_FOLD}</span>
            <span className="actionbar__help">{S.ACTION_FOLD_HELP}</span>
          </button>
          <button className="btn btn--ghost actionbar__betBtn" onPointerEnter={() => markIntent('stay')} onFocus={() => markIntent('stay')} onClick={() => onBet('stay', tellFor('stay'))}>
            <span>{S.ACTION_STAY}</span>
            <span className="actionbar__betAmt">+{S.CHIP_ICON}{BET_AMOUNTS.stay}</span>
            <span className="actionbar__help">{S.ACTION_STAY_HELP}</span>
          </button>
          <button
            className="btn btn--secondary actionbar__betBtn"
            onPointerEnter={() => markIntent('raise')}
            onFocus={() => markIntent('raise')}
            onClick={() => onBet('raise', tellFor('raise'))}
            disabled={stack < BET_AMOUNTS.stay}
          >
            <span>{S.ACTION_RAISE}</span>
            <span className="actionbar__betAmt">+{S.CHIP_ICON}{Math.min(BET_AMOUNTS.raise, stack)}</span>
            <span className="actionbar__help">{S.ACTION_RAISE_HELP}</span>
          </button>
          <button
            className="btn btn--primary actionbar__betBtn"
            onPointerEnter={() => markIntent('big')}
            onFocus={() => markIntent('big')}
            onClick={() => onBet('big', tellFor('big'))}
            disabled={stack < BET_AMOUNTS.raise}
          >
            <span>{S.ACTION_BIG}</span>
            <span className="actionbar__betAmt">+{S.CHIP_ICON}{Math.min(BET_AMOUNTS.big, stack)}</span>
            <span className="actionbar__help">{S.ACTION_BIG_HELP}</span>
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
                className="btn btn--secondary actionbar__targetBtn"
                onClick={() => {
                  setPickingTarget(false);
                  props.onExchangeSteal(o.id);
                }}
              >
                <CardView card={o.notMe} variant="faceUp" size="xs" highlighted />
                <span>{o.name}</span>
                <span className="actionbar__help">{S.ACTION_TARGET_STEAL_HELP}</span>
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
        <div className="actionbar__heading">
          <span className="actionbar__kicker">{S.ACTION_DOCK_EXCHANGE_LABEL}</span>
          <p className="actionbar__prompt">{S.YOUR_TURN_EXCHANGE}</p>
        </div>
        <div className="actionbar__row">
          <button className="btn btn--primary actionbar__commandBtn" onClick={props.onExchangeDeck}>
            <span>{S.ACTION_EXCHANGE_DECK}</span>
            <span className="actionbar__help">{S.ACTION_EXCHANGE_DECK_HELP}</span>
          </button>
          <button
            className="btn btn--secondary actionbar__commandBtn"
            onClick={() => setPickingTarget(true)}
            disabled={props.opponents.length === 0}
          >
            <span>{S.ACTION_EXCHANGE_STEAL}</span>
            <span className="actionbar__help">{S.ACTION_EXCHANGE_STEAL_HELP}</span>
          </button>
          <button className="btn btn--ghost actionbar__commandBtn" onClick={props.onExchangePass}>
            <span>{S.ACTION_EXCHANGE_PASS}</span>
            <span className="actionbar__help">{S.ACTION_EXCHANGE_PASS_HELP}</span>
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
