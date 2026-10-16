import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

/**
 * Node-side admin helper for the auth e2e suite (plan Phase 6.2).
 *
 * SECURITY (plan AC-13 / R-stride):
 *  - Lives under `e2e/helpers/` only. It is NEVER imported by anything under
 *    `apps/web/src/`, so the service-role key can never reach the client bundle.
 *  - The key is read from the runner's `SUPABASE_SERVICE_ROLE_KEY` or, as a
 *    fallback, parsed from `apps/web/.env.local` (Playwright's Node process does
 *    not load Next's env files). It is never logged, never asserted on, never
 *    passed to `page`, and never included in thrown error messages.
 *  - Operations that carry tokens (`generateRecoveryTokenHash`) return the token
 *    material to the caller; callers must only navigate with it and must never
 *    print, log, or assert on it (plan R6).
 *
 * Every user-creating helper registers the address in an internal set so the
 * spec's `finally`/`afterAll` cleanup can always delete what was created.
 */

export interface PublicUserRow {
  supabase_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
}

/**
 * Supabase rejects addresses at domains without a deliverable mailbox shape
 * (`example.com` failed public signup validation during Phase 6 research), and
 * e2e mail is undeliverable by design here (Phase 0 checklist: SMTP is a user
 * action). `gmail.com` passes validation; mail simply bounces in dev.
 */
const TEST_EMAIL_DOMAIN = 'gmail.com';

const trackedEmails = new Set<string>();

export function trackEmail(email: string): void {
  trackedEmails.add(email);
}

export function uniqueEmail(prefix = 'e2e'): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}@${TEST_EMAIL_DOMAIN}`;
}

interface LoadedEnv {
  url: string;
  anonKey: string;
  serviceRoleKey: string | null;
}

function parseEnvFile(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    out[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

let envCache: LoadedEnv | null = null;

function loadEnv(): LoadedEnv {
  if (envCache) return envCache;

  // Runner cwd is either the repo root or `apps/web` depending on how the
  // Playwright command was invoked — cover both without relying on __dirname.
  const candidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'apps/web/.env.local'),
  ];
  const fromFiles: Record<string, string> = {};
  for (const candidate of candidates) {
    const parsed = parseEnvFile(candidate);
    for (const [key, value] of Object.entries(parsed)) {
      if (fromFiles[key] === undefined || fromFiles[key] === '') fromFiles[key] = value;
    }
  }

  const pick = (...values: Array<string | undefined>): string | undefined =>
    values.find((value) => value !== undefined && value !== '');

  const url = pick(process.env.NEXT_PUBLIC_SUPABASE_URL, fromFiles.NEXT_PUBLIC_SUPABASE_URL) ?? '';
  const anonKey = pick(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, fromFiles.NEXT_PUBLIC_SUPABASE_ANON_KEY) ?? '';
  const serviceRoleKey =
    pick(process.env.SUPABASE_SERVICE_ROLE_KEY, fromFiles.SUPABASE_SERVICE_ROLE_KEY) ?? null;

  envCache = { url, anonKey, serviceRoleKey };
  return envCache;
}

let adminClient: SupabaseClient | null = null;
let adminClientBuilt = false;

/** Service-role client, or `null` when no key is configured (plan: skip cleanly). */
export function getAdminClient(): SupabaseClient | null {
  if (adminClientBuilt) return adminClient;
  adminClientBuilt = true;

  const { url, serviceRoleKey } = loadEnv();
  if (!url || !serviceRoleKey) {
    adminClient = null;
    return adminClient;
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, flowType: 'pkce' },
    global: { headers: { 'X-Client-Info': 'busgo-e2e-auth-admin' } },
  });
  return adminClient;
}

let adminOk: boolean | null = null;

/**
 * Cheap, non-destructive liveness probe for the service-role key. Cached so the
 * suite performs at most one admin call before tests decide whether to skip.
 */
export async function adminAvailable(): Promise<boolean> {
  if (adminOk !== null) return adminOk;
  const admin = getAdminClient();
  if (!admin) {
    adminOk = false;
    return adminOk;
  }
  try {
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    adminOk = !error;
  } catch {
    adminOk = false;
  }
  return adminOk;
}

function requireAdmin(operation: string): SupabaseClient {
  const admin = getAdminClient();
  if (!admin) {
    throw new Error(`${operation} requires SUPABASE_SERVICE_ROLE_KEY (not configured)`);
  }
  return admin;
}

/** Pages through `auth.users` until `email` is found (bounded). */
async function findUserByEmail(email: string): Promise<User | null> {
  const admin = requireAdmin('findUserByEmail');
  const perPage = 200;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`admin.listUsers failed: ${error.message}`);
    const users = data?.users ?? [];
    const hit = users.find((user) => user.email === email);
    if (hit) return hit;
    if (users.length < perPage) break;
  }
  return null;
}

/**
 * Admin-confirm a freshly signed-up user (`mailer_autoconfirm` stays false in
 * this project — plan P6/Phase 0 checklist; the dashboard must not be touched).
 */
export async function confirmUserByEmail(email: string): Promise<boolean> {
  const admin = requireAdmin('confirmUserByEmail');
  const user = await findUserByEmail(email);
  if (!user) return false;
  const { error } = await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
  if (error) throw new Error(`admin.updateUserById failed: ${error.message}`);
  return true;
}

/** Reads the `public.users` row the `handle_new_user` trigger wrote (plan 5.6). */
export async function getProfileByEmail(email: string): Promise<PublicUserRow[]> {
  const admin = requireAdmin('getProfileByEmail');
  const { data, error } = await admin
    .from('users')
    .select('supabase_id, email, full_name, role')
    .eq('email', email);
  if (error) throw new Error(`profile select failed: ${error.message}`);
  return (data ?? []) as PublicUserRow[];
}

/** Reads the auth user's stored metadata (proves a crafted `role` arrived — plan 5.7). */
export async function getAuthMetadataByEmail(email: string): Promise<Record<string, unknown> | null> {
  const user = await findUserByEmail(email);
  return (user?.user_metadata ?? null) as Record<string, unknown> | null;
}

/**
 * Creates a confirmed user through the admin API. No confirmation email is sent,
 * so this never consumes the project's 2-emails/hour built-in SMTP quota — the
 * right tool for fixture users (register/forgot flows keep the quota for the
 * sends the plan actually requires).
 */
export async function createUserFixture(options: {
  email: string;
  password: string;
  fullName: string;
}): Promise<string> {
  const admin = requireAdmin('createUserFixture');
  trackEmail(options.email);
  const { data, error } = await admin.auth.admin.createUser({
    email: options.email,
    password: options.password,
    email_confirm: true,
    user_metadata: { full_name: options.fullName },
  });
  if (error) throw new Error(`admin.createUser failed: ${error.message}`);
  return data.user.id;
}

/**
 * Generates a recovery `token_hash` WITHOUT sending email (plan 6.4 optional
 * leg). The caller navigates to `/auth/callback?token_hash=…&type=recovery`,
 * which is the plan's token_hash path. Never log or assert on the result.
 */
export async function generateRecoveryTokenHash(email: string): Promise<string | null> {
  const admin = requireAdmin('generateRecoveryTokenHash');
  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email });
  if (error) throw new Error(`admin.generateLink failed: ${error.message}`);
  // Runtime shape is `{ properties: { hashed_token, action_link, … }, user }`.
  const properties = (data as { properties?: Record<string, unknown> } | undefined)?.properties;
  const hashed = properties?.hashed_token;
  return typeof hashed === 'string' && hashed.length > 0 ? hashed : null;
}

/**
 * Deletes an auth user AND the `public.users` row the trigger created (the
 * trigger has no ON DELETE cascade). Idempotent: deleting an unknown address is
 * a no-op. Returns how many auth rows were removed.
 */
export async function deleteUserByEmail(email: string): Promise<number> {
  const admin = getAdminClient();
  if (!admin) return 0;

  let deleted = 0;
  let user: User | null = null;
  try {
    user = await findUserByEmail(email);
  } catch {
    user = null;
  }
  if (user) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`admin.deleteUser failed: ${error.message}`);
    deleted = 1;
    const { error: profileError } = await admin
      .from('users')
      .delete()
      .eq('supabase_id', user.id);
    if (profileError) throw new Error(`profile delete failed: ${profileError.message}`);
  }
  trackedEmails.delete(email);
  return deleted;
}

/**
 * `finally`/`afterAll` cleanup (plan 6.7): deletes every address this helper has
 * seen. Never throws — a cleanup failure must not mask the real test outcome.
 */
export async function cleanupTrackedEmails(): Promise<{ deleted: number; failed: number }> {
  let deleted = 0;
  let failed = 0;
  for (const email of [...trackedEmails]) {
    try {
      deleted += await deleteUserByEmail(email);
    } catch {
      failed += 1;
      trackedEmails.delete(email);
    }
  }
  return { deleted, failed };
}
