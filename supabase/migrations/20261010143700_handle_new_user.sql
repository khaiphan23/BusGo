-- Sync auth.users -> public.users on signup (plan Public Contracts §7, AC-07).
-- Idempotent: create or replace function + drop trigger if exists + conflict-upsert backfill.
-- Invariants: keyed on supabase_id, role hardcoded PASSENGER (never from client metadata),
-- SECURITY DEFINER (RLS on public.users has zero policies), no tokens logged or returned.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (supabase_id, email, phone, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    new.phone,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    'PASSENGER'
  )
  on conflict (supabase_id) do update
  set email = excluded.email,
      phone = excluded.phone,
      full_name = excluded.full_name,
      avatar_url = excluded.avatar_url,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- EXECUTE is checked at CREATE TRIGGER time only (not at fire time); revoke the
-- PUBLIC default so anon/authenticated can never invoke the function via RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Idempotent backfill for auth.users rows that predate the trigger.
insert into public.users (supabase_id, email, phone, full_name, avatar_url, role)
select u.id,
       u.email,
       u.phone,
       u.raw_user_meta_data ->> 'full_name',
       u.raw_user_meta_data ->> 'avatar_url',
       'PASSENGER'
from auth.users u
on conflict (supabase_id) do update
set email = excluded.email,
    phone = excluded.phone,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();
