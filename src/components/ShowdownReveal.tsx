import { useEffect, useState } from 'react';
import type { GameState } from '../engine/game';
import type { Card } from '../engine/cards';
import type { HandRank } from '../engine/evaluator';
import { CardView } from './CardView';
import { FlipCard } from './FlipCard';
import { Confetti } from './Confetti';
import { sfx } from '../audio/sfx';
import * as S from '../strings';

/** 役に採用された4枚に含まれるか。役確定後、使わなかった1枚を暗く表示するために使う */
function usesCard(rank: HandRank | undefined, card: Card): boolean {
  if (!rank) return true;
  return rank.usedCards.some((u) => u.suit === card.suit && u.rank === card.rank);
}

interface ShowdownRevealProps {
  state: GameState;
  onContinue: () => void;
  isFinalHand: boolean;
  /** オンライン対戦用：「あなた」として扱う席番号（省略時は isHuman で判定） */
  heroId?: number;
}

// 演出の段階：
// 0 タイトルのみ → 1 相手の手札がめくれる → 2 自分の not me にサスペンス →
// 3 not me がめくれる → 4 役と勝敗・得点が確定する → 5 続行ボタン
type Step = 0 | 1 | 2 | 3 | 4 | 5;

export function ShowdownReveal({ state, onContinue, isFinalHand, heroId }: ShowdownRevealProps) {
  const [step, setStep] = useState<Step>(0);
  const result = state.lastResult;
  const human =
    heroId !== undefined ? state.players.find((p) => p.id === heroId)! : state.players.find((p) => p.isHuman)!;
  const humanActive = !human.folded;
  const humanWon = result?.winnerIds.includes(human.id) ?? false;
  const opponents =
    heroId !== undefined
      ? state.players.filter((p) => !p.folded && p.id !== heroId)
      : state.players.filter((p) => !p.folded && !p.isHuman);

  useEffect(() => {
    if (!result) return;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    // カードのめくり音はFlipCardが90度通過の瞬間に自ら鳴らすため、ここではタイミングのみ制御する
    if (result.reason === 'walkover') {
      at(400, () => setStep(3));
      at(1400, () => {
        setStep(4);
        sfx.play(humanWon ? 'win' : 'fold');
      });
      at(2000, () => setStep(5));
    } else {
      at(450, () => setStep(1));
      if (humanActive) {
        at(1700, () => {
          setStep(2);
          sfx.play('suspense');
        });
        at(3100, () => setStep(3));
        at(3900, () => {
          setStep(4);
          sfx.play(humanWon ? 'win' : 'lose');
        });
        at(4600, () => setStep(5));
      } else {
        at(1900, () => setStep(3));
        at(2600, () => {
          setStep(4);
          sfx.play('fold');
        });
        at(3200, () => setStep(5));
      }
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
    // マウント時に一度だけタイムラインを開始する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!result) return null;

  const deltaLabel = (playerId: number): string => {
    const d = result.chipDelta[playerId] ?? 0;
    return `${d >= 0 ? '+' : ''}${d}${S.CHIP_ICON}`;
  };
  const deltaPlus = (playerId: number): boolean => (result.chipDelta[playerId] ?? 0) >= 0;

  return (
    <div className={`showdown showdown--step-${step}`}>
      {step >= 4 && humanWon && <Confetti />}
      <h2 className="showdown__title">{S.SHOWDOWN_TITLE}</h2>

      {result.reason === 'walkover' ? (
        <div className="showdown__walkoverBox">
          <p className="showdown__walkover">
            {result.winnerIds.length > 0
              ? S.WALKOVER_LOG(state.players.find((p) => p.id === result.winnerIds[0])!.name)
              : S.MUTUAL_FOLD_LOG}
          </p>
          {step >= 4 && result.winnerIds.length > 0 && (
            <div className="showdown__stamp showdown__stamp--win">
              {deltaLabel(result.winnerIds[0])}
            </div>
          )}
          <p className="showdown__peekLabel">{S.WALKOVER_PEEK}</p>
          <div className="showdown__peekCard">
            <FlipCard card={human.notMe} revealed={step >= 3} size="lg" glow={step >= 3} />
          </div>
        </div>
      ) : (
        <>
          <div className="showdown__community">
            {state.community.map((c, i) => (
              <CardView key={i} card={c} variant="faceUp" size="sm" />
            ))}
            <span className="showdown__communityLabel">場札</span>
          </div>
          {step >= 4 && <p className="showdown__unusedNote">{S.SHOWDOWN_UNUSED_NOTE}</p>}

          <div className="showdown__opponents">
            {opponents.map((p, oi) => {
              const rank = result.ranks[p.id];
              const isWinner = result.winnerIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={`showdown__row ${step >= 4 && isWinner ? 'showdown__row--winner' : ''}`}
                >
                  <div className="showdown__rowHeader">
                    <span className="showdown__rowName">{p.name}</span>
                    {step >= 1 && rank && (
                      <span
                        className="showdown__category"
                        style={{ animationDelay: `${0.55 + oi * 0.18}s` }}
                      >
                        {S.CATEGORY_LABELS[rank.category]}
                      </span>
                    )}
                    {step >= 4 && isWinner && <span className="showdown__winnerBadge">WIN</span>}
                  </div>
                  <div className="showdown__cards">
                    <div className={step >= 4 && !usesCard(rank, p.hole[0]) ? 'showdown__unused' : ''}>
                      <FlipCard card={p.hole[0]} revealed={step >= 1} size="sm" delayMs={oi * 180} />
                    </div>
                    <div className={step >= 4 && !usesCard(rank, p.hole[1]) ? 'showdown__unused' : ''}>
                      <FlipCard
                        card={p.hole[1]}
                        revealed={step >= 1}
                        size="sm"
                        delayMs={oi * 180 + 90}
                      />
                    </div>
                    <div className={step >= 4 && !usesCard(rank, p.notMe) ? 'showdown__unused' : ''}>
                      <CardView card={p.notMe} variant="faceUp" size="sm" highlighted />
                    </div>
                  </div>
                  {step >= 4 && (
                    <span
                      className={`showdown__delta ${deltaPlus(p.id) ? 'showdown__delta--plus' : 'showdown__delta--minus'}`}
                    >
                      {deltaLabel(p.id)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {humanActive ? (
            <div
              className={`showdown__you ${step >= 4 && humanWon ? 'showdown__row--winner' : ''}`}
            >
              <p className={`showdown__youLabel ${step === 2 ? 'showdown__youLabel--suspense' : ''}`}>
                {S.YOUR_NOT_ME_REVEAL}
              </p>
              <div className="showdown__cards showdown__cards--you">
                <div
                  className={
                    step >= 4 && !usesCard(result.ranks[human.id], human.hole[0])
                      ? 'showdown__unused'
                      : ''
                  }
                >
                  <CardView card={human.hole[0]} variant="faceUp" size="md" />
                </div>
                <div
                  className={
                    step >= 4 && !usesCard(result.ranks[human.id], human.hole[1])
                      ? 'showdown__unused'
                      : ''
                  }
                >
                  <CardView card={human.hole[1]} variant="faceUp" size="md" />
                </div>
                <div
                  className={
                    step >= 4 && !usesCard(result.ranks[human.id], human.notMe)
                      ? 'showdown__unused'
                      : ''
                  }
                >
                  <FlipCard
                    card={human.notMe}
                    revealed={step >= 3}
                    size="lg"
                    glow={step === 2 || step >= 3}
                  />
                </div>
              </div>
              {step >= 4 && result.ranks[human.id] && (
                <div className="showdown__youVerdict">
                  <span className="showdown__categoryBig">
                    {S.CATEGORY_LABELS[result.ranks[human.id].category]}
                  </span>
                  <span
                    className={`showdown__stamp ${humanWon ? 'showdown__stamp--win' : 'showdown__stamp--lose'}`}
                  >
                    {humanWon
                      ? result.winnerIds.length > 1
                        ? S.DRAW_STAMP
                        : S.YOU_WIN_STAMP
                      : S.YOU_LOSE_STAMP}
                  </span>
                  <span
                    className={`showdown__delta ${deltaPlus(human.id) ? 'showdown__delta--plus' : 'showdown__delta--minus'}`}
                  >
                    {deltaLabel(human.id)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="showdown__you">
              <p className="showdown__peekLabel">{S.WALKOVER_PEEK}</p>
              <div className="showdown__peekCard">
                <FlipCard card={human.notMe} revealed={step >= 3} size="md" />
              </div>
            </div>
          )}
        </>
      )}

      <div className="showdown__footer">
        {step >= 5 && (
          <button className="btn btn--primary showdown__continue" onClick={onContinue}>
            {isFinalHand ? S.SEE_RESULT : S.CONTINUE_NEXT_HAND}
          </button>
        )}
      </div>
    </div>
  );
}
