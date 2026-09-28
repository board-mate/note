-- v8: 할 일 댓글 기능
-- 기존 Supabase 프로젝트의 SQL Editor에서 1회 실행하세요.

create table if not exists public.todo_comments (
  id uuid primary key default gen_random_uuid(),
  todo_key text not null,
  body text not null,
  author text default '익명',
  created_at timestamptz not null default now()
);

create index if not exists idx_todo_comments_todo_key_created_at
on public.todo_comments(todo_key, created_at);

alter table public.todo_comments enable row level security;

drop policy if exists "public all todo comments" on public.todo_comments;
create policy "public all todo comments" on public.todo_comments
for all to anon using(true) with check(true);

grant select,insert,update,delete on public.todo_comments to anon;
