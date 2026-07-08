import { useEffect, useState } from 'react';
import type { Card } from '../engine/cards';
import { CardView } from './CardView';
import { FlipCard } from './FlipCard';
import * as S from '../strings';

export type ExchangeEventData =
  | {
      type: 'steal';
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
    const isBigMoment = event.type === 'steal' && event.perspective !== 'spectator';
    const dismissTimer = window.setTimeout(onDismiss, isBigMoment ? 3000 : 2400);
    return () => {
      window.clearTimeout(flipTimer);
      window.clearTimeout(dismissTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (event.type === 'steal') {
    return (
      <div className="exevent">
        <div className={`exevent__panel ${event.perspective === 'target' ? 'exevent__panel--alert' : ''}`}>
          <div className="exevent__icon">🔀</div>
          <p className="exevent__title">{S.EVENT_STEAL_TITLE}</p>
          <p className="exevent__headline">
            {event.perspective === 'target'
              ? S.EVENT_STEAL_FROM_YOU(event.actorName)
              : event.perspective === 'actor'
                ? S.EVENT_STEAL_LINE_YOU(event.targetName)
                : S.EVENT_STEAL_LINE(event.actorName, event.targetName)}
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
