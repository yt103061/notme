import type { GameState } from '../engine/game';
import { CardView } from './CardView';
import * as S from '../strings';

interface ShowdownRevealProps {
  state: GameState;
  stage: 0 | 1 | 2;
  onContinue: () => void;
  isFinalHand: boolean;
}

export function ShowdownReveal({ state, stage, onContinue, isFinalHand }: ShowdownRevealProps) {
  const result = state.lastResult;
  if (!result || stage === 0) return null;

  const active = state.players.filter((p) => !p.folded);

  return (
    <div className="showdown">
      <h2 className="showdown__title">{S.SHOWDOWN_TITLE}</h2>

      {result.reason === 'walkover' ? (
        <p className="showdown__walkover">
          {result.winnerIds.length > 0
            ? S.WALKOVER_LOG(state.players.find((p) => p.id === result.winnerIds[0])!.name)
            : S.MUTUAL_FOLD_LOG}
        </p>
      ) : (
        <div className="showdown__hands">
          {active.map((p) => {
            const rank = result.ranks[p.id];
            const isWinner = result.winnerIds.includes(p.id);
            const cards = [...p.hole, p.notMe, ...state.community];
            return (
              <div key={p.id} className={`showdown__hand ${isWinner ? 'showdown__hand--winner' : ''}`}>
                <div className="showdown__handHeader">
                  <span>{p.name}</span>
                  {rank && <span className="showdown__category">{S.CATEGORY_LABELS[rank.category]}</span>}
                  {isWinner && <span className="showdown__winnerBadge">WIN</span>}
                </div>
                <div className="showdown__cards">
                  {cards.map((c, i) => (
                    <CardView key={i} card={c} variant="faceUp" size="sm" highlighted={p.isHuman && i === 2} />
                  ))}
                </div>
                <div className="showdown__scoreDelta">
                  {isWinner ? `+${result.winnerIds.length > 1 ? 1 : 2}` : '-1'}点
                </div>
              </div>
            );
          })}
        </div>
      )}

      {stage === 2 && (
        <button className="btn btn--primary showdown__continue" onClick={onContinue}>
          {isFinalHand ? S.SEE_RESULT : S.CONTINUE_NEXT_HAND}
        </button>
      )}
    </div>
  );
}
