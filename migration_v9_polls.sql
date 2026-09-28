-- v9: 일반 게시판 투표 기능
-- 기존 Supabase DB에 1회 실행하세요.

create table if not exists public.post_polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts(id) on delete cascade,
  question text not null,
  closed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.post_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.post_polls(id) on delete cascade,
  option_text text not null,
  sort_order integer not null default 0
);

create index if not exists idx_post_poll_options_poll_sort
on public.post_poll_options(poll_id, sort_order);

create table if not exists public.post_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.post_polls(id) on delete cascade,
  option_id uuid not null references public.post_poll_options(id) on delete cascade,
  voter_id text not null,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_id)
);

create index if not exists idx_post_poll_votes_poll
on public.post_poll_votes(poll_id);

alter table public.post_polls enable row level security;
alter table public.post_poll_options enable row level security;
alter table public.post_poll_votes enable row level security;

drop policy if exists "public all post polls" on public.post_polls;
drop policy if exists "public all post poll options" on public.post_poll_options;
drop policy if exists "public all post poll votes" on public.post_poll_votes;

create policy "public all post polls" on public.post_polls for all to anon using(true) with check(true);
create policy "public all post poll options" on public.post_poll_options for all to anon using(true) with check(true);
create policy "public all post poll votes" on public.post_poll_votes for all to anon using(true) with check(true);

grant select,insert,update,delete on public.post_polls to anon;
grant select,insert,update,delete on public.post_poll_options to anon;
grant select,insert,update,delete on public.post_poll_votes to anon;
