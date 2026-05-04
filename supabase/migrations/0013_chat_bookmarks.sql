-- ============================================================
-- StyleAI — Migration 0013: Chat Bookmarks
-- Adds:
--   • chat_bookmarks table — user-pinned assistant messages
--   • RLS: owner-only access
--   • Index on user_id + report_id for fast lookup
-- ============================================================

create table if not exists public.chat_bookmarks (
  id          uuid        primary key default gen_random_uuid(),
  report_id   uuid        not null references public.reports(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  content     text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists chat_bookmarks_user_report_idx
  on public.chat_bookmarks(user_id, report_id, created_at desc);

alter table public.chat_bookmarks enable row level security;

drop policy if exists "chat_bookmarks_owner_select" on public.chat_bookmarks;
create policy "chat_bookmarks_owner_select"
  on public.chat_bookmarks for select
  using (user_id = auth.uid());

drop policy if exists "chat_bookmarks_owner_insert" on public.chat_bookmarks;
create policy "chat_bookmarks_owner_insert"
  on public.chat_bookmarks for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.reports r
      where r.id = report_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "chat_bookmarks_owner_delete" on public.chat_bookmarks;
create policy "chat_bookmarks_owner_delete"
  on public.chat_bookmarks for delete
  using (user_id = auth.uid());
