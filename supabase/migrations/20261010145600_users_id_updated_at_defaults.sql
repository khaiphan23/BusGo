-- Phase 6 fix (EXECUTE deviation, recorded in the plan's Resume/Handoff).
--
-- Symptom: real signup failed with Supabase "Database error saving new user".
-- Root cause (read-only column probe + always-rolled-back insert probes):
--   public.users.id and public.users.updated_at are NOT NULL with NO column
--   default. Prisma's @default(cuid()) and @updatedAt are client-side only, so
--   an insert that omits them (exactly what the AFTER INSERT trigger
--   public.handle_new_user() does) fails with SQLSTATE 23502 and GoTrue rolls
--   the whole signup back. The idempotent backfill in
--   20261010143700_handle_new_user.sql never surfaced this because auth.users
--   was empty (0 rows) when it ran.
--
-- Fix: give the two columns database defaults, so every non-Prisma insert path
-- (trigger sync, backfill, admin tooling) succeeds. Prisma writes both columns
-- explicitly, so its behaviour is unchanged.
--
-- Idempotent: ALTER TABLE ... SET DEFAULT may be re-applied safely.
-- Rollback: alter table public.users alter column id drop default;
--           alter table public.users alter column updated_at drop default;

alter table public.users
  alter column id set default gen_random_uuid()::text;

alter table public.users
  alter column updated_at set default now();
