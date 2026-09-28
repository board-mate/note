-- v7: 일반 게시판 댓글 기능
-- 기존 Supabase 프로젝트에서는 이 파일을 SQL Editor에서 1회 실행하세요.

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  body text not null,
  author text default '익명',
  created_at timestamptz not null default now()
);

create index if not exists idx_post_comments_post_id_created_at
on public.post_comments(post_id, created_at);

alter table public.post_comments enable row level security;

drop policy if exists "public all post comments" on public.post_comments;
create policy "public all post comments"
on public.post_comments for all to anon using(true) with check(true);

grant select,insert,update,delete on public.post_comments to anon;
