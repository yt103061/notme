import type { GameState } from '../engine/game';
import { CardView } from './CardView';
import { PlayerSeat } from './PlayerSeat';
import { HAND_LABEL, SUDDEN_DEATH_BADGE } from '../strings';

interface TableProps {
  state: GameState;
  emotes: Record<number, string>;
  actingPlayerId?: number;
  showdownStage?: 0 | 1 | 2;
}

export function Table({ state, emotes, actingPlayerId, showdownStage }: TableProps) {
  const human = state.players.find((p) => p.isHuman)!;
  const opponents = state.players.filter((p) => !p.isHuman);

  return (
    <div className="table">
      <div className="table__topbar">
        <span className="table__handLabel">{HAND_LABEL(state.handNumber, state.totalHands)}</span>
        {state.isSuddenDeath && <span className="table__suddenDeath">{SUDDEN_DEATH_BADGE}</span>}
      </div>

      <div className="table__opponents">
        {opponents.map((p) => (
          <PlayerSeat key={p.id} player={p} emote={emotes[p.id]} isActingNow={actingPlayerId === p.id} />
        ))}
      </div>

      <div className="table__community">
        {[0, 1].map((i) => (
          <CardView key={i} card={state.community[i]} variant={state.community[i] ? 'faceUp' : 'hiddenOpponent'} size="md" />
        ))}
      </div>

      <div className="table__human">
        <PlayerSeat
          player={human}
          emote={emotes[human.id]}
          showdownStage={showdownStage}
          isActingNow={actingPlayerId === human.id}
        />
      </div>
    </div>
  );
}
