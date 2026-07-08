import type { Card } from '../engine/cards';
import { rankLabel, SUIT_SYMBOLS, isRed } from '../engine/cards';

export type CardVariant = 'faceUp' | 'hiddenSelf' | 'hiddenOpponent';

interface CardViewProps {
  card?: Card;
  variant: CardVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  highlighted?: boolean;
  flipping?: boolean;
}

export function CardView({ card, variant, size = 'md', highlighted, flipping }: CardViewProps) {
  const classes = ['card', `card--${size}`];
  if (highlighted) classes.push('card--highlighted');
  if (flipping) classes.push('card--flipping');

  if (variant === 'faceUp' && card) {
    classes.push('card--face', isRed(card) ? 'card--red' : 'card--black');
    return (
      <div className={classes.join(' ')}>
        <span className="card__rank">{rankLabel(card.rank)}</span>
        <span className="card__suit">{SUIT_SYMBOLS[card.suit]}</span>
      </div>
    );
  }

  if (variant === 'hiddenSelf') {
    classes.push('card--hidden-self');
    return (
      <div className={classes.join(' ')}>
        <span className="card__mystery">?</span>
      </div>
    );
  }

  classes.push('card--hidden-opponent');
  return <div className={classes.join(' ')} />;
}
