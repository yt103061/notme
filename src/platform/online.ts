// オンライン対戦（ルームコード）のクライアント側 API ラッパー。
// すべての読み書きは online-room Edge Function 経由（サーバー権威）。
// クライアントは Postgres の online_* テーブルに直接アクセスしない。

import { getSupabaseClient } from './supabase';
import type { BetChoice, DecisionTell, ExchangeAction, GameState, Phase } from '../engine/game';

export interface OnlinePlayerInfo {
  seat: number;
  displayName: string;
}

export interface OnlineView {
  status: 'waiting' | 'playing' | 'done';
  code: string;
  you: number;
  phase?: Phase;
  game?: GameState;
  waitingOnSeats?: number[];
  players: OnlinePlayerInfo[];
}

export interface CallResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function call<T>(body: Record<string, unknown>): Promise<CallResult<T>> {
  const client = await getSupabaseClient();
  if (!client) return { ok: false, error: 'offline' };
  try {
    const { data, error } = await client.functions.invoke('online-room', { body });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: data.error };
    return { ok: true, data: data as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown_error' };
  }
}

export function createOnlineRoom(displayName: string) {
  return call<{ roomId: string; code: string; seat: number }>({ action: 'create', displayName });
}

export function matchmakeOnlineRoom(displayName: string) {
  return call<{
    roomId: string;
    code: string;
    seat: number;
    status: OnlineView['status'];
    matched: boolean;
    players: OnlinePlayerInfo[];
  }>({ action: 'matchmake', displayName });
}

export function joinOnlineRoom(code: string, displayName: string) {
  return call<{ roomId: string; code: string; seat: number }>({ action: 'join', code, displayName });
}

export function startOnlineRoom(roomId: string) {
  return call<{ ok: true }>({ action: 'start', roomId });
}

export function fetchOnlineView(roomId: string) {
  return call<OnlineView>({ action: 'view', roomId });
}

export function submitOnlineBet(roomId: string, choice: BetChoice, tell?: DecisionTell) {
  return call<OnlineView>({ action: 'bet', roomId, choice, tell });
}

export function submitOnlineExchange(roomId: string, exchange: ExchangeAction) {
  return call<OnlineView>({ action: 'exchange', roomId, exchange });
}

export function continueOnlineHand(roomId: string) {
  return call<OnlineView>({ action: 'continue', roomId });
}
