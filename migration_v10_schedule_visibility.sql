-- v10: 일정 공개/비공개 제어
-- 기존 일정은 안전하게 모두 비공개(false)로 시작합니다.

alter table public.schedules
  add column if not exists is_public boolean not null default false;

create index if not exists idx_schedules_public_date
on public.schedules(is_public, event_date, event_time);

create or replace view public.arena_public_schedules as
select id, title, event_date, event_time, location, note, author, created_at, updated_at
from public.schedules
where is_public = true;

grant select on public.arena_public_schedules to anon;

-- 주의: 현재 note 앱은 로그인 없는 anon 구조라서 schedules 원본 테이블은 계속 전체 조회 가능합니다.
-- 이 is_public 값은 'Arena 게시 여부'를 제어하는 공개 플래그입니다.
