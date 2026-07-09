-- ランキング表示用：display_name/chip_balance/games_playedのみを公開する読み取り専用関数（他の個人情報は出さない）
create or replace function public.get_leaderboard(limit_count integer default 20)
returns table (display_name text, chip_balance integer, games_played integer)
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(p.display_name, '名無しさん'), p.chip_balance, p.games_played
  from public.profiles p
  order by p.chip_balance desc
  limit limit_count;
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to anon, authenticated;

-- ゲーム終了時にgames_playedを安全にインクリメントする関数
create or replace function public.increment_games_played()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set games_played = games_played + 1 where id = auth.uid();
$$;

revoke all on function public.increment_games_played() from public;
grant execute on function public.increment_games_played() to authenticated;
