import { useEffect, useState } from 'react';
import type { Card } from '../engine/cards';
import type { Hint } from '../engine/game';
import { CardView } from './CardView';
import { FlipCard } from './FlipCard';
import * as S from '../strings';

export type ExchangeEventData =
  | {
      type: 'steal';
      actorName: string;
      targetName: string;
      actorIsHuman: boolean;
      targetIsHuman: boolean;
      /** 奪った側から見て見える札。actorIsHuman の場合は自分のnot meになるため非公開(null) */
      revealedCard: Card | null;
      /** 奪われた側が補充で得たヒント（targetIsHuman の時だけ意味を持つ） */
      hint: Hint | null;
      /** 奪った側のペナルティで山札と入れ替わった手札（actorIsHuman の時だけ意味を持つ） */
      holePenalty: { index: 0 | 1; before: Card; after: Card } | null;
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
      event.type === 'steal' && (event.targetIsHuman || (event.actorIsHuman && !!event.holePenalty));
    const dismissTimer = window.setTimeout(onDismiss, isBigMoment ? 3200 : 2400);
    return () => {
      window.clearTimeout(flipTimer);
      window.clearTimeout(dismissTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (event.type === 'steal') {
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
