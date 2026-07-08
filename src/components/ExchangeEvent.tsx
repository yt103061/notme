import { useEffect, useState } from 'react';
import type { Card } from '../engine/cards';
import type { Hint } from '../engine/game';
import { CardView } from './CardView';
import { FlipCard } from './FlipCard';
import * as S from '../strings';

export type ExchangeEventData =
  | {
      type: 'steal';
      mode: 'oneSided';
      actorName: string;
      targetName: string;
      actorIsHuman: boolean;
      targetIsHuman: boolean;
      /** 奪った札。actorIsHuman の場合は自分のnot me化して見えなくなるため非公開(null) */
      revealedCard: Card | null;
      /** 奪われた側が補充で得たヒント（targetIsHuman の時だけ意味を持つ） */
      hint: Hint | null;
      /** 奪った側の手札ペナルティ（actorIsHuman の時だけ意味を持つ） */
      holePenalty: { index: 0 | 1; before: Card; after: Card } | null;
    }
  | {
      type: 'steal';
      mode: 'reciprocalSwap';
      actorName: string;
      targetName: string;
      /** 今この画面を見ている人間が、この交換でどの役だったか */
      perspective: 'actor' | 'target' | 'spectator';
      /** perspective が actor/target の時：自分が元々持っていて相手に渡った札（渡った瞬間に見える情報になる） */
      yourOldCard: Card | null;
      /** perspective が spectator（AI同士）の時：もともと公開情報なのでそのまま両方見せる */
      spectatorCards: { actorOldCard: Card; targetOldCard: Card } | null;
    }
  | {
      type: 'deckSwap';
      actorName: string;
      actorIsHuman: boolean;
      /** actorIsHuman なら常に null（自分のnot meは見えない） */
      revealedBefore: Card | null;
      revealedAfter: Card | null;
    };

interface ExchangeEventProps {
  event: ExchangeEventData;
  onDismiss: () => void;
}

export function ExchangeEvent({ event, onDismiss }: ExchangeEventProps) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const flipTimer = window.setTimeout(() => setFlipped(true), 180);
    const isBigMoment =
      (event.type === 'steal' && event.mode === 'oneSided' && (event.targetIsHuman || event.actorIsHuman)) ||
      (event.type === 'steal' && event.mode === 'reciprocalSwap' && event.perspective !== 'spectator');
    const dismissTimer = window.setTimeout(onDismiss, isBigMoment ? 3200 : 2400);
    return () => {
      window.clearTimeout(flipTimer);
      window.clearTimeout(dismissTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (event.type === 'steal' && event.mode === 'oneSided') {
    return (
      <div className="exevent">
        <div className={`exevent__panel ${event.targetIsHuman ? 'exevent__panel--alert' : ''}`}>
          <div className="exevent__icon">🫳</div>
          <p className="exevent__title">{S.EVENT_STEAL_TITLE}</p>
          <p className="exevent__headline">
            {event.targetIsHuman
              ? S.EVENT_STEAL_FROM_YOU(event.actorName)
              : S.EVENT_STEAL_LINE(event.actorName, event.targetName)}
          </p>
          <div className="exevent__cardRow">
            {event.revealedCard ? (
              <FlipCard card={event.revealedCard} revealed={flipped} size="md" glow />
            ) : (
              <CardView variant="hiddenSelf" size="md" />
            )}
          </div>
          {!event.revealedCard && <p className="exevent__mystery">{S.EVENT_MYSTERY_NOTE}</p>}
          {event.targetIsHuman && event.hint && (
            <div className="exevent__hintBox">
              <span className="exevent__hintLabel">{S.EVENT_HINT_GAINED}</span>
              <span className="exevent__hintValue">{event.hint.label}</span>
            </div>
          )}
          {event.actorIsHuman && event.holePenalty && (
            <div className="exevent__penalty">
              <span className="exevent__penaltyLabel">{S.EVENT_PENALTY_LABEL}</span>
              <div className="exevent__cardRow exevent__cardRow--swap">
                <CardView card={event.holePenalty.before} variant="faceUp" size="sm" />
                <span className="exevent__arrow">→</span>
                <FlipCard card={event.holePenalty.after} revealed={flipped} size="sm" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (event.type === 'steal' && event.mode === 'reciprocalSwap') {
    return (
      <div className="exevent">
        <div className="exevent__panel">
          <div className="exevent__icon">🔀</div>
          <p className="exevent__title">{S.EVENT_RECIPROCAL_TITLE}</p>
          <p className="exevent__headline">
            {event.perspective === 'target'
              ? S.EVENT_RECIPROCAL_FROM_YOU(event.actorName)
              : event.perspective === 'actor'
                ? S.EVENT_RECIPROCAL_LINE_YOU(event.targetName)
                : S.EVENT_RECIPROCAL_LINE(event.actorName, event.targetName)}
          </p>

          {event.perspective === 'spectator' && event.spectatorCards ? (
            <div className="exevent__cardRow exevent__cardRow--swap">
              <CardView card={event.spectatorCards.actorOldCard} variant="faceUp" size="sm" />
              <span className="exevent__arrow">⇄</span>
              <CardView card={event.spectatorCards.targetOldCard} variant="faceUp" size="sm" />
            </div>
          ) : (
            <>
              <p className="exevent__subLabel">{S.EVENT_YOUR_OLD_CARD}</p>
              <div className="exevent__cardRow">
                <FlipCard card={event.yourOldCard!} revealed={flipped} size="md" glow />
              </div>
              <p className="exevent__mystery">{S.EVENT_MYSTERY_NOTE}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="exevent">
      <div className="exevent__panel">
        <div className="exevent__icon">🔄</div>
        <p className="exevent__title">{S.EVENT_SWAP_TITLE}</p>
        <p className="exevent__headline">
          {event.actorIsHuman ? S.EVENT_SWAP_LINE_YOU : S.EVENT_SWAP_LINE(event.actorName)}
        </p>
        <div className="exevent__cardRow exevent__cardRow--swap">
          {event.revealedBefore ? (
            <CardView card={event.revealedBefore} variant="faceUp" size="sm" />
          ) : (
            <CardView variant="hiddenSelf" size="sm" />
          )}
          <span className="exevent__arrow">→</span>
          {event.revealedAfter ? (
            <FlipCard card={event.revealedAfter} revealed={flipped} size="sm" glow />
          ) : (
            <CardView variant="hiddenSelf" size="sm" />
          )}
        </div>
      </div>
    </div>
  );
}
