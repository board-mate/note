-- v6: 회의록 없이 독립적으로 생성하는 할 일
-- 기존 Supabase 프로젝트는 SQL Editor에서 이 파일을 한 번 실행하세요.

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  task text not null,
  owner text default '',
  due date,
  project text default '',
  note text default '',
  done boolean not null default false,
  author text default '익명',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists trg_todo_touch on public.todos;
create trigger trg_todo_touch before update on public.todos
for each row execute function public.touch_updated_at();

alter table public.todos enable row level security;
drop policy if exists "public all todos" on public.todos;
create policy "public all todos" on public.todos
for all to anon using(true) with check(true);

grant usage on schema public to anon;
grant select,insert,update,delete on public.todos to anon;
