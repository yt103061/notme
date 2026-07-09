-- オンライン対戦（ルームコード／ランダムマッチ共通の土台）。
-- ゲーム状態は Edge Function（サーバー権威）だけが読み書きする。クライアントからの
-- 直接アクセスは一切許可しない（not me の値をクライアントに送らないための前提）。

create table public.online_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  mode text not null default 'room' check (mode in ('room', 'queue')),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'done')),
  host_id uuid not null references auth.users(id) on delete cascade,
  max_players int not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.online_room_players (
  room_id uuid not null references public.online_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seat int not null,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  unique (room_id, seat)
);

-- state: GameState 相当（rng 関数は含めない）。rng_state はシリアライズ可能な RNG の内部カウンタ
create table public.online_room_states (
  room_id uuid primary key references public.online_rooms(id) on delete cascade,
  state jsonb not null,
  rng_state bigint not null,
  version int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.online_rooms enable row level security;
alter table public.online_room_players enable row level security;
alter table public.online_room_states enable row level security;

-- 直接クライアントアクセスは一切禁止。すべての読み書きは service role の Edge Function 経由のみ
revoke all on public.online_rooms from anon, authenticated;
revoke all on public.online_room_players from anon, authenticated;
revoke all on public.online_room_states from anon, authenticated;

create index online_rooms_code_idx on public.online_rooms (code) where status = 'waiting';
create index online_room_players_room_idx on public.online_room_players (room_id);
