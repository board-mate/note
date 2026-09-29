-- Run once in the Supabase SQL Editor to enable immediate updates across devices.
-- The app still refreshes every 20 seconds if Realtime is unavailable.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'meetings', 'announcements', 'schedules', 'posts', 'post_comments',
    'post_polls', 'post_poll_options', 'post_poll_votes', 'todos', 'todo_comments'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
