-- v5 일반 게시판 추가용 마이그레이션
-- 기존 schema.sql을 다시 실행해도 되지만, 게시판만 추가하려면 이 파일만 실행하세요.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  author text default '익명',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists trg_post_touch on public.posts;
create trigger trg_post_touch before update on public.posts for each row execute function public.touch_updated_at();

alter table public.posts enable row level security;
drop policy if exists "public all posts" on public.posts;
create policy "public all posts" on public.posts for all to anon using(true) with check(true);

grant select,insert,update,delete on public.posts to anon;
