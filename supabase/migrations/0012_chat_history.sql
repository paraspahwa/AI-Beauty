-- ============================================================
-- StyleAI — Migration 0012: Chat Message History
-- Adds:
--   • chat_messages table — persists per-report chat turns
--   • RLS: users can only read/write their own report's messages
--   • Index on report_id + created_at for ordered history fetch
-- ============================================================

create table if not exists public.chat_messages (
  id          uuid        primary key default gen_random_uuid(),
  report_id   uuid        not null references public.reports(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  role        text        not null check (role in ('user', 'assistant')),
  content     text        not null,
  created_at  timestamptz not null default now()
);

-- Fast ordered history retrieval per report
create index if not exists chat_messages_report_created_idx
  on public.chat_messages(report_id, created_at asc);

-- RLS — users can only access messages for reports they own
alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages_owner_select" on public.chat_messages;
create policy "chat_messages_owner_select"
  on public.chat_messages
  for select
  using (
    user_id = auth.uid()
  );

drop policy if exists "chat_messages_owner_insert" on public.chat_messages;
create policy "chat_messages_owner_insert"
  on public.chat_messages
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.reports r
      where r.id = report_id
        and r.user_id = auth.uid()
    )
  );

-- service_role can do anything (needed for bulk insert after AI reply)
drop policy if exists "chat_messages_service_role_all" on public.chat_messages;
create policy "chat_messages_service_role_all"
  on public.chat_messages
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
