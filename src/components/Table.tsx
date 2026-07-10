import { useEffect, useRef, useState } from 'react';
import type { Card } from '../engine/cards';
import { betLabel, type BetChoice, type GameState, type PlayerState } from '../engine/game';
import { CardView, type CardVariant } from './CardView';
import { FlipCard } from './FlipCard';
import { PlayerSeat } from './PlayerSeat';
import { CardFlight, type FlightLeg } from './CardFlight';
import { CardDetailOverlay } from './CardDetailOverlay';
import { HAND_LABEL, SUDDEN_DEATH_BADGE } from '../strings';
import * as S from '../strings';

/** notMe の交換演出（カードが飛ぶ）の1本分。座席IDまたは卓中央('center')で指定する */
export interface FlightLegSpec {
  id: string;
  card: Card;
  fromSeat: number | 'center';
  toSeat: number | 'center';
  startAppearance: 'faceUp' | 'hiddenSelf';
  endAppearance: 'faceUp' | 'hiddenSelf';
  delayMs?: number;
}

interface TableProps {
  state: GameState;
  emotes: Record<number, string>;
  actingPlayerId?: number;
  /** せーの同時公開中：playerId -> その人の賭け選択 */
  decisionReveal?: Record<number, BetChoice> | null;
  flight?: FlightLegSpec[] | null;
  onFlightSettle?: () => void;
  heroToast?: string | null;
  /** オンライン対戦用：手前に大きく表示する「あなた」の席番号を明示する（省略時は isHuman で判定） */
  heroId?: number;
}

export function Table({
  state,
  emotes,
  actingPlayerId,
  decisionReveal,
  flight,
  onFlightSettle,
  heroToast,
  heroId,
}: TableProps) {
  const notMeRefs = useRef(new Map<number, HTMLElement>());
  const centerAnchorRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<{ card?: Card; variant: CardVariant; rect: DOMRect } | null>(null);

  function registerNotMeRef(id: number) {
    return (el: HTMLElement | null) => {
      if (el) notMeRefs.current.set(id, el);
      else notMeRefs.current.delete(id);
    };
  }

  function rectFor(seat: number | 'center'): DOMRect | null {
    if (seat === 'center') return centerAnchorRef.current?.getBoundingClientRect() ?? null;
    return notMeRefs.current.get(seat)?.getBoundingClientRect() ?? null;
  }

  const flightLegs: FlightLeg[] | null =
    flight && flight.length > 0
      ? flight
          .map((spec): FlightLeg | null => {
            const fromRect = rectFor(spec.fromSeat);
            const toRect = rectFor(spec.toSeat);
            if (!fromRect || !toRect) return null;
            return {
              id: spec.id,
              card: spec.card,
              fromRect,
              toRect,
              startAppearance: spec.startAppearance,
              endAppearance: spec.endAppearance,
              delayMs: spec.delayMs,
            };
          })
          .filter((l): l is FlightLeg => l !== null)
      : null;
  const human =
    heroId !== undefined ? state.players.find((p) => p.id === heroId)! : state.players.find((p) => p.isHuman)!;
  const opponents =
    heroId !== undefined ? state.players.filter((p) => p.id !== heroId) : state.players.filter((p) => !p.isHuman);

  const badgeFor = (id: number): BetChoice | undefined => {
    if (!decisionReveal || !(id in decisionReveal)) return undefined;
    return decisionReveal[id];
  };
  const revealIds = decisionReveal ? Object.keys(decisionReveal).map(Number) : [];
  const badgeDelay = (id: number) => 0.25 + revealIds.indexOf(id) * 0.22;

  // 場札は「配られてすぐ」ではなく「一拍おいてめくれる」演出にする（表示アクションを明示するため）
  // めくり音自体はFlipCardが90度通過の瞬間に鳴らすため、ここではタイミングの制御のみ行う
  const [revealedCount, setRevealedCount] = useState(0);
  const [potBurst, setPotBurst] = useState<number | null>(null);
  const prevPotRef = useRef(state.pot);
  useEffect(() => {
    if (state.community.length > revealedCount) {
      const t = window.setTimeout(() => setRevealedCount(state.community.length), 320);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.community.length]);
  useEffect(() => {
    const diff = state.pot - prevPotRef.current;
    prevPotRef.current = state.pot;
    if (diff <= 0) return;
    setPotBurst(diff);
    const t = window.setTimeout(() => setPotBurst(null), 760);
    return () => window.clearTimeout(t);
  }, [state.pot]);

  const humanBadge = badgeFor(human.id);
  const phaseCopy = phaseMeta(state.phase);

  return (
    <div
      className={`arena arena--phase-${state.phase}`}
      key={`${state.handNumber}-${state.isSuddenDeath ? 'sd' : ''}`}
    >
      {/* 卓の面（奥に向かって沈む楕円フェルト）。カードやUIはこの上に平置きされる */}
      <div className="arena__felt" aria-hidden>
        <div className="arena__feltRim" />
        <div className="arena__feltGlow" />
      </div>

      {/* 上部の浮遊バー：ハンド数 */}
      <div className="arena__topbar">
        <span className="arena__handLabel">{HAND_LABEL(state.handNumber, state.totalHands)}</span>
        {state.isSuddenDeath && <span className="arena__suddenDeath">{SUDDEN_DEATH_BADGE}</span>}
      </div>

      <div className="arena__phaseHud" aria-live="polite">
        <span className="arena__phaseKicker">{phaseCopy.title}</span>
        <span className="arena__phaseText">{phaseCopy.body}</span>
      </div>

      {/* 卓の向こう側に並ぶ対戦相手（円卓のアーチ状に配置） */}
      <div className="arena__opponents">
        {opponents.map((p) => (
          <PlayerSeat
            key={p.id}
            player={p}
            emote={emotes[p.id]}
            isActingNow={actingPlayerId === p.id}
            decisionBadge={badgeFor(p.id)}
            badgeDelaySec={badgeDelay(p.id)}
            notMeRef={registerNotMeRef(p.id)}
          />
        ))}
      </div>

      {/* 卓の中心のスポットライト：ポット＋共有の場札 */}
      <div className="arena__center" ref={centerAnchorRef}>
        <div className="arena__pot" key={state.pot}>
          <span className="arena__potLabel">{S.POT_LABEL}</span>
          <span className="arena__potValue">
            {S.CHIP_ICON} {state.pot}
          </span>
          {potBurst !== null && (
            <span className="arena__potBurst">
              +{potBurst}
              {S.CHIP_ICON}
            </span>
          )}
        </div>
        <span className="arena__centerLabel">場札</span>
        <div className="arena__community">
          {[0, 1].map((i) => (
            <div key={i} className="arena__flopSlot">
              {i < state.community.length ? (
                <FlipCard card={state.community[i]} revealed={i < revealedCount} size="md" />
              ) : (
                <div className="arena__emptySlot" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 手前＝あなた。カードを大きく主役として見せる */}
      <div
        className={['arena__hero', human.folded ? 'arena__hero--folded' : '', actingPlayerId === human.id ? 'arena__hero--active' : '']
          .filter(Boolean)
          .join(' ')}
      >
        <HeroInfo player={human} toast={heroToast} />
        <div className="arena__heroCards">
          <div className="arena__heroCard arena__heroCard--l">
            <CardView
              card={human.hole[0]}
              variant="faceUp"
              size="xl"
              interactive
              onTap={(rect) => setDetail({ card: human.hole[0], variant: 'faceUp', rect })}
            />
          </div>
          <div className="arena__heroCard arena__heroCard--r">
            <CardView
              card={human.hole[1]}
              variant="faceUp"
              size="xl"
              interactive
              onTap={(rect) => setDetail({ card: human.hole[1], variant: 'faceUp', rect })}
            />
          </div>
          <div className="arena__heroCard arena__heroCard--notme" ref={registerNotMeRef(human.id)}>
            <CardView
              card={human.notMe}
              variant="hiddenSelf"
              size="xl"
              interactive
              onTap={(rect) => setDetail({ card: human.notMe, variant: 'hiddenSelf', rect })}
            />
            <span className="arena__notmeTag">not me</span>
          </div>
        </div>

        {flightLegs && <CardFlight legs={flightLegs} onSettle={onFlightSettle ?? (() => {})} />}

        {!humanBadge && emotes[human.id] && !human.folded && (
          <div key={emotes[human.id]} className="arena__heroEmote">
            {emotes[human.id]}
          </div>
        )}
        {humanBadge && (
          <div
            className={`arena__heroDecision arena__heroDecision--${humanBadge === 'fold' ? 'fold' : 'stay'}`}
            style={{ animationDelay: `${badgeDelay(human.id)}s` }}
          >
            {humanBadge === 'fold' ? S.BADGE_FOLD : betLabel(humanBadge)}
          </div>
        )}
        {human.folded && <div className="arena__heroFolded">降り</div>}
      </div>

      {detail && (
        <CardDetailOverlay
          card={detail.card}
          variant={detail.variant}
          originRect={detail.rect}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function phaseMeta(phase: GameState['phase']) {
  switch (phase) {
    case 'decision1':
      return { title: S.PHASE_BET1_TITLE, body: S.PHASE_BET1_BODY };
    case 'exchange':
      return { title: S.PHASE_EXCHANGE_TITLE, body: S.PHASE_EXCHANGE_BODY };
    case 'decision2':
      return { title: S.PHASE_BET2_TITLE, body: S.PHASE_BET2_BODY };
    case 'handEnd':
    case 'gameEnd':
      return { title: S.PHASE_SHOWDOWN_TITLE, body: S.PHASE_SHOWDOWN_BODY };
    default:
      return { title: S.PHASE_DEAL_TITLE, body: S.PHASE_DEAL_BODY };
  }
}

/** あなたの名前・スタック・ヒントを表す浮遊チップ列 */
function HeroInfo({ player, toast }: { player: PlayerState; toast?: string | null }) {
  return (
    <div className="arena__heroInfo">
      <span className="arena__heroName">
        <span className="arena__heroAvatar" aria-hidden>
          🙂
        </span>
        {player.name}
      </span>
      <span className="arena__heroScore">
        {S.CHIP_ICON} {player.stack}
      </span>
      {player.hint && (
        <span className="arena__heroHint">
          <span className="arena__heroHintKey">封印ヒント</span>
          {player.hint.label}
        </span>
      )}
      {toast && (
        <span key={toast} className="arena__heroToast">
          {toast}
        </span>
      )}
    </div>
  );
}
