import type { Card } from '../engine/cards';
import { CardView } from './CardView';
import * as S from '../strings';

interface HelpModalProps {
  onClose: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

function c(suit: Card['suit'], rank: number): Card {
  return { suit, rank };
}

// 強い順の役一覧と実例。CATEGORY_LABELS のインデックスは HandCategory の並びと対応する
const HAND_EXAMPLES: { category: number; cards: Card[] }[] = [
  { category: 14, cards: [c('S', 9), c('S', 8), c('S', 7), c('S', 6), c('S', 5)] },
  { category: 13, cards: [c('S', 7), c('H', 7), c('D', 7), c('C', 7), c('S', 13)] },
  { category: 12, cards: [c('S', 12), c('H', 12), c('D', 12), c('C', 4), c('S', 4)] },
  { category: 11, cards: [c('H', 14), c('H', 11), c('H', 8), c('H', 6), c('H', 3)] },
  { category: 10, cards: [c('S', 8), c('H', 7), c('D', 6), c('C', 5), c('S', 4)] },
  { category: 9, cards: [c('S', 9), c('H', 9), c('D', 9), c('C', 14), c('S', 5)] },
  { category: 8, cards: [c('S', 11), c('H', 11), c('D', 6), c('C', 6), c('S', 12)] },
  { category: 7, cards: [c('S', 10), c('H', 10), c('D', 14), c('C', 7), c('S', 3)] },
  // ここから下は「お宝役」：5枚全体はハイカードだが、中に隠れた3〜4枚役があるケース
  { category: 6, cards: [c('S', 4), c('S', 5), c('S', 6), c('S', 7)] },
  { category: 5, cards: [c('S', 2), c('S', 6), c('S', 9), c('S', 13)] },
  { category: 4, cards: [c('S', 5), c('S', 6), c('S', 7)] },
  { category: 3, cards: [c('S', 5), c('H', 6), c('D', 7), c('C', 8)] },
  { category: 2, cards: [c('S', 2), c('S', 7), c('S', 11)] },
  { category: 1, cards: [c('S', 7), c('H', 8), c('D', 9)] },
  { category: 0, cards: [c('S', 14), c('H', 13), c('D', 8), c('C', 5), c('S', 2)] },
];

export function HelpModal({ onClose, muted, onToggleMute }: HelpModalProps) {
  return (
    <div className="help" onClick={onClose}>
      <div className="help__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="help__header">
          <h2 className="help__title">{S.HELP_TITLE}</h2>
          <button className="btn btn--icon" onClick={onClose} aria-label={S.HELP_CLOSE}>
            ✕
          </button>
        </div>

        <div className="help__body">
          <h3 className="help__section">{S.HELP_HANDS_SECTION}</h3>
          <div className="help__hands">
            {HAND_EXAMPLES.map((h, i) => (
              <div key={h.category} className="help__handRow">
                <span className="help__handRank">{i + 1}</span>
                <span className="help__handName">{S.CATEGORY_LABELS[h.category]}</span>
                <span className="help__handCards">
                  {h.cards.map((card, j) => (
                    <CardView key={j} card={card} variant="faceUp" size="xs" />
                  ))}
                </span>
              </div>
            ))}
          </div>
          <p className="help__note">{S.HELP_ROYAL_NOTE}</p>
          <p className="help__note">{S.HIDDEN_HAND_NOTE}</p>

          <h3 className="help__section">{S.HELP_RULES_SECTION}</h3>
          <ul className="help__rules">
            {S.HELP_RULE_LINES.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>

          <h3 className="help__section">{S.HELP_SCORING_SECTION}</h3>
          <div className="help__scores">
            {S.HELP_SCORE_ROWS.map(([label, value]) => (
              <div key={label} className="help__scoreRow">
                <span>{label}</span>
                <span className="help__scoreValue">{value}</span>
              </div>
            ))}
          </div>

          <h3 className="help__section">{S.HELP_CHIPS_SECTION}</h3>
          <ul className="help__rules">
            {S.HELP_CHIPS_LINES.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>

          <h3 className="help__section">{S.HELP_SOUND_SECTION}</h3>
          <div className="help__scoreRow help__soundRow">
            <span>{S.HELP_SOUND_LABEL}</span>
            <button
              className={`help__toggle ${muted ? '' : 'help__toggle--on'}`}
              onClick={onToggleMute}
              aria-label={muted ? S.MUTE_OFF : S.MUTE_ON}
            >
              <span className="help__toggleKnob" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
