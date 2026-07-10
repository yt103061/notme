// オンライン対戦（ルームコード）用の単一エンドポイント。
// クライアントは Postgres に直接アクセスしない（online_* テーブルは anon/authenticated への
// 権限を全て revoke 済み）。ここが唯一の書き込み経路で、サーバー権威で状態を進める。
//
// action で分岐するシンプルなディスパッチャ:
//   create   : ルーム作成（コード発行、ホストとして着席）
//   join     : コードで参加（次の空席へ着席）
//   start    : ハンド開始（ホストのみ。参加者2人以上で not me を配る）
//   bet      : ①②の賭け選択を1人分投入
//   exchange : 交換フェーズの1手番
//   continue : ショーダウン後、次のハンドへ（誰でも呼べる）
//   view     : 自分の視点に絞り込んだ現在の状態を取得

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { BetChoice, ExchangeAction, GameState } from '../_shared/engine/game.ts';
import {
  initMatch,
  submitBet,
  submitExchange,
  continueMatch,
  redactForSeat,
  loadGame,
  type StoredMatch,
} from '../_shared/orchestration.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0/O/1/I など紛らわしい文字を除く
function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

interface PersistedState {
  game: Omit<GameState, 'rng'>;
  pendingBets: StoredMatch['pendingBets'];
  exchangeQueue: StoredMatch['exchangeQueue'];
}

function toStoredMatch(row: { state: PersistedState; rng_state: number }): StoredMatch {
  return { ...row.state, rngState: row.rng_state };
}

function toRow(match: StoredMatch) {
  const { rngState, ...state } = match;
  return { state, rng_state: rngState };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const action = body.action as string;

  // ----- ルーム作成 -----
  if (action === 'create') {
    const displayName = String(body.displayName ?? 'プレイヤー').slice(0, 16);
    const mode = body.mode === 'queue' ? 'queue' : 'room';

    let room = null;
    for (let attempt = 0; attempt < 5 && !room; attempt++) {
      const code = generateRoomCode();
      const { data, error } = await admin
        .from('online_rooms')
        .insert({ code, mode, host_id: user.id, status: 'waiting' })
        .select()
        .single();
      if (!error) room = data;
      else if (!String(error.message).includes('duplicate')) return json({ error: error.message }, 500);
    }
    if (!room) return json({ error: 'room_code_collision' }, 500);

    const { error: joinError } = await admin
      .from('online_room_players')
      .insert({ room_id: room.id, user_id: user.id, seat: 0, display_name: displayName });
    if (joinError) return json({ error: joinError.message }, 500);

    return json({ roomId: room.id, code: room.code, seat: 0 });
  }

  // ----- コードで参加 -----
  if (action === 'join') {
    const code = String(body.code ?? '').toUpperCase();
    const displayName = String(body.displayName ?? 'プレイヤー').slice(0, 16);

    const { data: room, error: roomErr } = await admin
      .from('online_rooms')
      .select('*')
      .eq('code', code)
      .eq('status', 'waiting')
      .maybeSingle();
    if (roomErr) return json({ error: roomErr.message }, 500);
    if (!room) return json({ error: 'room_not_found' }, 404);

    const { data: players, error: playersErr } = await admin
      .from('online_room_players')
      .select('seat, user_id')
      .eq('room_id', room.id);
    if (playersErr) return json({ error: playersErr.message }, 500);

    const existing = players.find((p) => p.user_id === user.id);
    if (existing) return json({ roomId: room.id, code: room.code, seat: existing.seat });

    if (players.length >= room.max_players) return json({ error: 'room_full' }, 409);
    const takenSeats = new Set(players.map((p) => p.seat));
    let seat = 0;
    while (takenSeats.has(seat)) seat++;

    const { error: joinError } = await admin
      .from('online_room_players')
      .insert({ room_id: room.id, user_id: user.id, seat, display_name: displayName });
    if (joinError) return json({ error: joinError.message }, 500);

    return json({ roomId: room.id, code: room.code, seat });
  }

  // 以降のアクションは roomId 必須。呼び出し元の席を必ずサーバー側で確定する
  // （クライアントが申告する playerId は一切信用しない）
  const roomId = String(body.roomId ?? '');
  if (!roomId) return json({ error: 'missing_room_id' }, 400);

  const { data: room, error: roomErr } = await admin
    .from('online_rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();
  if (roomErr) return json({ error: roomErr.message }, 500);
  if (!room) return json({ error: 'room_not_found' }, 404);

  const { data: players, error: playersErr } = await admin
    .from('online_room_players')
    .select('seat, user_id, display_name')
    .eq('room_id', roomId)
    .order('seat', { ascending: true });
  if (playersErr) return json({ error: playersErr.message }, 500);

  const me = players.find((p) => p.user_id === user.id);
  if (!me) return json({ error: 'not_a_member' }, 403);
  const seat = me.seat;

  // ----- ハンド開始（ホストのみ） -----
  if (action === 'start') {
    if (room.host_id !== user.id) return json({ error: 'host_only' }, 403);
    if (room.status !== 'waiting') return json({ error: 'already_started' }, 409);
    if (players.length < 2) return json({ error: 'not_enough_players' }, 400);

    const seatNames: Record<number, string> = {};
    for (const p of players) seatNames[p.seat] = p.display_name;

    const match = initMatch(randomSeed(), seatNames);
    const { error: stateErr } = await admin.from('online_room_states').insert({
      room_id: roomId,
      ...toRow(match),
      version: 0,
    });
    if (stateErr) return json({ error: stateErr.message }, 500);

    const { error: updateErr } = await admin
      .from('online_rooms')
      .update({ status: 'playing', updated_at: new Date().toISOString() })
      .eq('id', roomId);
    if (updateErr) return json({ error: updateErr.message }, 500);

    return json({ ok: true });
  }

  // ----- 賭け/交換/継続/閲覧：すべて現在の状態が必要 -----
  const { data: stateRow, error: stateErr } = await admin
    .from('online_room_states')
    .select('*')
    .eq('room_id', roomId)
    .maybeSingle();
  if (stateErr) return json({ error: stateErr.message }, 500);

  function buildView(match: StoredMatch | null) {
    if (!match) {
      return {
        status: room!.status,
        code: room!.code,
        you: seat,
        players: players.map((p) => ({ seat: p.seat, displayName: p.display_name })),
      };
    }
    const game = loadGame(match);
    const redacted = redactForSeat(game, seat);
    const active = game.players.filter((p) => !p.folded).map((p) => p.id);
    let waitingOnSeats: number[] = [];
    if (game.phase === 'decision1' || game.phase === 'decision2') {
      const decided = new Set(Object.keys(match.pendingBets ?? {}).map(Number));
      waitingOnSeats = active.filter((id) => !decided.has(id));
    } else if (game.phase === 'exchange') {
      waitingOnSeats = match.exchangeQueue?.slice(0, 1) ?? [];
    }
    return {
      status: room!.status,
      code: room!.code,
      you: seat,
      phase: game.phase,
      game: redacted,
      waitingOnSeats,
      players: players.map((p) => ({ seat: p.seat, displayName: p.display_name })),
    };
  }

  if (action === 'view') {
    return json(buildView(stateRow ? toStoredMatch(stateRow) : null));
  }

  if (!stateRow) return json({ error: 'not_started' }, 409);
  let match = toStoredMatch(stateRow);

  if (action === 'bet') {
    const choice = body.choice as BetChoice;
    match = submitBet(match, seat, choice);
  } else if (action === 'exchange') {
    const exchange = body.exchange as ExchangeAction;
    match = submitExchange(match, seat, exchange);
  } else if (action === 'continue') {
    const result = continueMatch(match);
    match = result.match;
    if (result.done) {
      await admin.from('online_rooms').update({ status: 'done' }).eq('id', roomId);
      room.status = 'done';
    }
  } else {
    return json({ error: 'unknown_action' }, 400);
  }

  const { error: updateErr } = await admin
    .from('online_room_states')
    .update({ ...toRow(match), version: stateRow.version + 1, updated_at: new Date().toISOString() })
    .eq('room_id', roomId);
  if (updateErr) return json({ error: updateErr.message }, 500);

  return json(buildView(match));
});
