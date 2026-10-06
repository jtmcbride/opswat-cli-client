-- Cloud sync for Lingo: one row per synced item (a word, a text, a chat, settings, ...).
-- Clients merge per item, last write wins on `updated_at` (client clock, ms since epoch).
-- `seq` increases on every write and is the pull cursor, so clock skew never hides a change.

create sequence if not exists public.sync_items_seq;

create table if not exists public.sync_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at bigint not null,
  seq bigint not null default nextval('public.sync_items_seq'),
  primary key (user_id, key)
);

create index if not exists sync_items_user_seq on public.sync_items (user_id, seq);

alter table public.sync_items enable row level security;

drop policy if exists "own rows" on public.sync_items;
create policy "own rows" on public.sync_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Keep the newer version when two devices write the same item, and bump `seq` on every write.
create or replace function public.sync_items_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.seq := nextval('public.sync_items_seq');
  return new;
end;
$$;

drop trigger if exists sync_items_write on public.sync_items;
create trigger sync_items_write before insert or update on public.sync_items
  for each row execute function public.sync_items_write();

grant select, insert, update, delete on public.sync_items to authenticated;
grant usage on sequence public.sync_items_seq to authenticated;
