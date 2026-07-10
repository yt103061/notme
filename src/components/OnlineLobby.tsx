import { useEffect, useRef, useState } from 'react';
import {
  createOnlineRoom,
  joinOnlineRoom,
  matchmakeOnlineRoom,
  startOnlineRoom,
  fetchOnlineView,
  type OnlinePlayerInfo,
} from '../platform/online';
import { analytics } from '../platform/analytics';
import * as S from '../strings';

interface OnlineLobbyProps {
  displayName: string;
  onBack: () => void;
  onEnterGame: (roomId: string, seat: number) => void;
  autoMatch?: boolean;
}

type Step = 'choose' | 'joinCode' | 'waiting' | 'matchmaking';

export function OnlineLobby({ displayName, onBack, onEnterGame, autoMatch = false }: OnlineLobbyProps) {
  const [step, setStep] = useState<Step>('choose');
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [room, setRoom] = useState<{ roomId: string; code: string; seat: number; mode?: 'room' | 'queue' } | null>(
    null,
  );
  const [players, setPlayers] = useState<OnlinePlayerInfo[]>([]);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoMatchStarted = useRef(false);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  function startPolling(roomId: string, seat: number, mode: 'room' | 'queue' = 'room') {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      const r = await fetchOnlineView(roomId);
      if (!r.ok || !r.data) return;
      setPlayers(r.data.players);
      if (r.data.status === 'playing') {
        if (pollTimer.current) clearInterval(pollTimer.current);
        if (mode === 'queue') analytics.track('matchmaking_success', { players: r.data.players.length });
        onEnterGame(roomId, seat);
      }
    }, 1200);
  }

  async function handleCreate() {
    setBusy(true);
    setError(null);
    const r = await createOnlineRoom(displayName);
    setBusy(false);
    if (!r.ok || !r.data) {
      setError(r.error ?? S.ONLINE_ERROR_GENERIC);
      return;
    }
    setRoom({ ...r.data, mode: 'room' });
    setPlayers([{ seat: 0, displayName }]);
    setStep('waiting');
    startPolling(r.data.roomId, r.data.seat, 'room');
  }

  async function handleJoin() {
    setBusy(true);
    setError(null);
    const r = await joinOnlineRoom(codeInput.trim(), displayName);
    setBusy(false);
    if (!r.ok || !r.data) {
      setError(r.error === 'room_not_found' ? S.ONLINE_ROOM_NOT_FOUND : (r.error ?? S.ONLINE_ERROR_GENERIC));
      return;
    }
    setRoom({ ...r.data, mode: 'room' });
    setStep('waiting');
    startPolling(r.data.roomId, r.data.seat, 'room');
    const v = await fetchOnlineView(r.data.roomId);
    if (v.ok && v.data) setPlayers(v.data.players);
  }

  async function handleStart() {
    if (!room) return;
    setBusy(true);
    setError(null);
    const r = await startOnlineRoom(room.roomId);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? S.ONLINE_ERROR_GENERIC);
      return;
    }
    if (pollTimer.current) clearInterval(pollTimer.current);
    onEnterGame(room.roomId, room.seat);
  }

  async function handleMatchmake() {
    analytics.track('matchmaking_start');
    setBusy(true);
    setError(null);
    setStep('matchmaking');
    const r = await matchmakeOnlineRoom(displayName);
    setBusy(false);
    if (!r.ok || !r.data) {
      setError(r.error ?? S.ONLINE_ERROR_GENERIC);
      setStep('choose');
      return;
    }
    setRoom({ roomId: r.data.roomId, code: r.data.code, seat: r.data.seat, mode: 'queue' });
    setPlayers(r.data.players);
    if (r.data.status === 'playing' || r.data.matched) {
      analytics.track('matchmaking_success', { players: r.data.players.length });
      onEnterGame(r.data.roomId, r.data.seat);
      return;
    }
    startPolling(r.data.roomId, r.data.seat, 'queue');
  }

  useEffect(() => {
    if (!autoMatch || autoMatchStarted.current) return;
    autoMatchStarted.current = true;
    void handleMatchmake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMatch]);

  return (
    <div className="online">
      <button className="btn btn--icon online__back" onClick={onBack} aria-label={S.ACTION_BACK}>
        ←
      </button>
      <h1 className="online__title">{S.ONLINE_TITLE}</h1>

      {step === 'choose' && (
        <div className="online__choices">
          <button className="btn btn--primary btn--large" disabled={busy} onClick={handleMatchmake}>
            {S.ONLINE_RANDOM_MATCH}
          </button>
          <p className="online__blurb">{S.ONLINE_RANDOM_BLURB}</p>
          <button className="btn btn--secondary btn--large" disabled={busy} onClick={handleCreate}>
            {S.ONLINE_CREATE_ROOM}
          </button>
          <button className="btn btn--ghost" disabled={busy} onClick={() => setStep('joinCode')}>
            {S.ONLINE_JOIN_ROOM}
          </button>
          {error && <p className="online__error">{error}</p>}
        </div>
      )}

      {step === 'matchmaking' && (
        <div className="online__waiting">
          <div className="online__spinner" aria-hidden />
          <p className="online__blurb">{S.ONLINE_MATCHMAKING_BLURB}</p>
          {room && (
            <>
              <p className="online__blurb">{S.ONLINE_MATCHMAKING_INVITE}</p>
              <div className="online__code">{room.code}</div>
            </>
          )}
          <button
            className="btn btn--ghost"
            onClick={() => {
              analytics.track('matchmaking_cancel', { players: players.length });
              if (pollTimer.current) clearInterval(pollTimer.current);
              setRoom(null);
              setPlayers([]);
              setStep('choose');
            }}
          >
            {S.ONLINE_CANCEL_MATCHMAKING}
          </button>
        </div>
      )}

      {step === 'joinCode' && (
        <div className="online__choices">
          <p className="online__blurb">{S.ONLINE_JOIN_BLURB}</p>
          <input
            className="online__codeInput"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder={S.ONLINE_CODE_PLACEHOLDER}
            autoFocus
          />
          <button
            className="btn btn--primary btn--large"
            disabled={busy || codeInput.trim().length < 6}
            onClick={handleJoin}
          >
            {S.ONLINE_JOIN_SUBMIT}
          </button>
          {error && <p className="online__error">{error}</p>}
          <button className="btn btn--ghost" onClick={() => setStep('choose')}>
            {S.ACTION_BACK}
          </button>
        </div>
      )}

      {step === 'waiting' && room && (
        <div className="online__waiting">
          <p className="online__blurb">{room.mode === 'queue' ? S.ONLINE_MATCHMAKING_BLURB : S.ONLINE_SHARE_CODE}</p>
          {room.mode !== 'queue' && <div className="online__code">{room.code}</div>}
          <div className="online__players">
            {players.map((p) => (
              <div key={p.seat} className="online__playerRow">
                {p.displayName}
                {p.seat === room.seat && S.ONLINE_YOU_TAG}
              </div>
            ))}
          </div>
          {room.seat === 0 ? (
            <button className="btn btn--primary btn--large" disabled={busy || players.length < 2} onClick={handleStart}>
              {players.length < 2 ? S.ONLINE_WAITING_FOR_PLAYERS : S.ONLINE_START}
            </button>
          ) : (
            <p className="online__blurb">{S.ONLINE_WAITING_FOR_HOST}</p>
          )}
          {error && <p className="online__error">{error}</p>}
        </div>
      )}
    </div>
  );
}
