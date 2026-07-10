import { useEffect, useRef, useState } from 'react';
import { createOnlineRoom, joinOnlineRoom, startOnlineRoom, fetchOnlineView, type OnlinePlayerInfo } from '../platform/online';
import * as S from '../strings';

interface OnlineLobbyProps {
  displayName: string;
  onBack: () => void;
  onEnterGame: (roomId: string, seat: number) => void;
}

type Step = 'choose' | 'joinCode' | 'waiting';

export function OnlineLobby({ displayName, onBack, onEnterGame }: OnlineLobbyProps) {
  const [step, setStep] = useState<Step>('choose');
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [room, setRoom] = useState<{ roomId: string; code: string; seat: number } | null>(null);
  const [players, setPlayers] = useState<OnlinePlayerInfo[]>([]);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  function startPolling(roomId: string, seat: number) {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      const r = await fetchOnlineView(roomId);
      if (!r.ok || !r.data) return;
      setPlayers(r.data.players);
      if (r.data.status === 'playing') {
        if (pollTimer.current) clearInterval(pollTimer.current);
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
    setRoom(r.data);
    setPlayers([{ seat: 0, displayName }]);
    setStep('waiting');
    startPolling(r.data.roomId, r.data.seat);
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
    setRoom(r.data);
    setStep('waiting');
    startPolling(r.data.roomId, r.data.seat);
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

  return (
    <div className="online">
      <button className="btn btn--icon online__back" onClick={onBack} aria-label={S.ACTION_BACK}>
        ←
      </button>
      <h1 className="online__title">{S.ONLINE_TITLE}</h1>

      {step === 'choose' && (
        <div className="online__choices">
          <button className="btn btn--primary btn--large" disabled={busy} onClick={handleCreate}>
            {S.ONLINE_CREATE_ROOM}
          </button>
          <button className="btn btn--secondary btn--large" disabled={busy} onClick={() => setStep('joinCode')}>
            {S.ONLINE_JOIN_ROOM}
          </button>
          {error && <p className="online__error">{error}</p>}
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
          <p className="online__blurb">{S.ONLINE_SHARE_CODE}</p>
          <div className="online__code">{room.code}</div>
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
