import type { GameState } from '../engine/game';
import { CardView } from './CardView';
import { PlayerSeat } from './PlayerSeat';
import { HAND_LABEL, SUDDEN_DEATH_BADGE } from '../strings';

interface TableProps {
  state: GameState;
  emotes: Record<number, string>;
  actingPlayerId?: number;
  /** せーの同時公開中：playerId -> true なら降り */
  decisionReveal?: Record<number, boolean> | null;
}

export function Table({ state, emotes, actingPlayerId, decisionReveal }: TableProps) {
  const human = state.players.find((p) => p.isHuman)!;
  const opponents = state.players.filter((p) => !p.isHuman);

  const badgeFor = (id: number): 'stay' | 'fold' | undefined => {
    if (!decisionReveal || !(id in decisionReveal)) return undefined;
    return decisionReveal[id] ? 'fold' : 'stay';
  };
  const revealIds = decisionReveal ? Object.keys(decisionReveal).map(Number) : [];
  const badgeDelay = (id: number) => 0.25 + revealIds.indexOf(id) * 0.22;

  return (
    <div className="table" key={`${state.handNumber}-${state.isSuddenDeath ? 'sd' : ''}`}>
      <div className="table__topbar">
        <span className="table__handLabel">{HAND_LABEL(state.handNumber, state.totalHands)}</span>
        {state.isSuddenDeath && <span className="table__suddenDeath">{SUDDEN_DEATH_BADGE}</span>}
      </div>

      <div className="table__opponents">
        {opponents.map((p) => (
          <PlayerSeat
            key={p.id}
            player={p}
            emote={emotes[p.id]}
            isActingNow={actingPlayerId === p.id}
            decisionBadge={badgeFor(p.id)}
            badgeDelaySec={badgeDelay(p.id)}
          />
        ))}
      </div>

      <div className="table__community">
        {[0, 1].map((i) =>
          state.community[i] ? (
            <div key={i} className="table__flopCard" style={{ animationDelay: `${i * 0.18}s` }}>
              <CardView card={state.community[i]} variant="faceUp" size="md" />
            </div>
          ) : (
            <CardView key={i} variant="hiddenOpponent" size="md" />
          ),
        )}
      </div>

      <div className="table__human">
        <PlayerSeat
          player={human}
          emote={emotes[human.id]}
          isActingNow={actingPlayerId === human.id}
          decisionBadge={badgeFor(human.id)}
          badgeDelaySec={badgeDelay(human.id)}
        />
      </div>
    </div>
  );
}
