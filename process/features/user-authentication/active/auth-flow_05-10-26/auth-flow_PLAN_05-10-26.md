---
date: 05-10-26
status: TESTING
complexity: COMPLEX
target: bus-transport-system
feature: user-authentication
---

# User Authentication (Auth Flow) — Implementation Plan

**Date** 05-10-26
**Status** 🧪 TESTING (Phases 1-6 code-complete + evidenced; user confirmation pending)
**Complexity** COMPLEX
**Target** `bus-transport-system` monorepo
**Feature folder** `process/features/user-authentication/`
**Selected approach** Approach B — Hybrid server-verified (user-approved, locked)

---

## TL;DR

Ship the full BusGo email/password + email-OTP authentication flow: 5 Vietnamese auth pages under `apps/web/src/app/(auth)/`, `AuthProvider`/`useUser` session layer, deny-by-default middleware guards via `getUser()`, header user menu with sign-out, an idempotent `handle_new_user` trigger migration in a NEW `supabase/migrations/` dir, and shared UI-kit/Zod additions — with unit/component tests per phase and a Playwright e2e suite last, all without breaking the 135-unit/18-e2e baseline.

---

## Overview

This plan implements authentication for the BusGo application. The landing page already links to `/login` and `/register` (dead links at `apps/web/src/app/page.tsx:44,48,70,125`); this feature makes those links real, protects every non-public route with server-verified middleware, and synchronizes `auth.users` into the existing `public.users` table (Prisma `User` model, `packages/db/prisma/schema.prisma:11-26`).

Approach and scope were locked during RESEARCH/INNOVATE; this plan does not re-brainstorm. It validates the locked approach against real constraints (Phase 0 probes, recorded below) and sequences the work into 7 phases.

Context routing: `process/context/all-context.md` (root router, architecture, patterns, stack) and `process/context/tests/all-tests.md` (runner selection, commands, debugging) were consulted for this plan. Future auth work should follow the `auth work` row in the `all-context.md` Task Routing Table.

**Status**: 🧪 TESTING — Phases 1-6 code-complete and ALL checkboxes evidenced (5.6/5.7 closed by the Phase 6 real-signup e2e, evidence below; no phase is ✅ VERIFIED yet — user confirmation still required per Phase Completion Rules); Phase 0 re-confirm done except 0.3 user checklist (user action); Phase 6 COMPLETE (2026-10-11): `e2e/helpers/auth-admin.ts` + `e2e/auth.spec.ts` shipped, 6.1-6.10 all ticked — 6.4 evidenced 2026-10-10 23:41, and its quota-degradation path (explicit skip on 429) re-verified 2026-10-11. Regression (2026-10-11): root `pnpm typecheck` clean, `pnpm test` **316 passed / 34 files**, `pnpm --filter bus-transport-system-web test:e2e` = map **18/18** + auth **8 passed / 6 skipped / 0 failed** (desktop-chromium + mobile-chromium; one desktop map cold-load flake on a 2-worker run recovered 9/9 on scoped rerun; skips = 2 send-budget × 2 projects + OTP mailbox-gated × 2 + register/forgot quota skips) → effective 26 passed / 6 skipped / 0 failed, matching the recorded baseline

---

## Chosen Approach — Rationale (Why B over A and C)

| Dimension | A: Client-only guards | **B: Hybrid server-verified (CHOSEN)** | C: Full server-side (mutations via Next server actions / `api/auth/*`) |
|---|---|---|---|
| Route protection | None — client checks after load; direct URL bypass | Middleware deny-by-default using `getUser()` (server-trusted JWT check, cookie-forging-proof) + documented RSC double-check pattern | Server-only guards; also secure |
| Mutation path | Browser Supabase client | Browser Supabase client (`signUp`, `signInWithPassword`, `signOut`, `signInWithOtp`, `verifyOtp`, `resetPasswordForEmail`, `updateUser`) — proven, session cookies written by `@supabase/ssr` | Server actions must write session cookies server-side — **this cookie-write path is unverified in this stack**; extra failure surface, extra round-trips, `api/auth/` would need a full API surface |
| Security posture | Weakest (client state forgeable, no server gate) | Server-verified gates at the edge; client only renders | Strong but heavy |
| Complexity / risk | Low but ships known-insecure pattern | Moderate — reuses existing `client.ts`/`server.ts`/`middleware.ts` | Highest — unverified server cookie-write, more code to test |
| Verdict | Rejected: no real protection | **Approved by user** | Rejected: unverified server cookie-write, overkill for scope |

Implication of B: trust boundary is (1) middleware `getUser()` for routing, (2) Supabase Auth API for credentials, (3) DB trigger for `users` sync. Client code never decides authorization; `role` is never client-writable.

---

## Phase Completion Rules

A phase is NOT complete until:

1. **Integration Test** — Works with other system pieces (schemas → forms → session → middleware)
2. **Manual Test** — User can perform the action (steps provided per phase)
3. **Data Verification** — Database/state changes confirmed (SQL shown per phase where applicable)
4. **Error Handling** — Failure cases handled gracefully (generic Vietnamese errors, no enumeration)
5. **User Confirmation** — User visually confirms it works and says it works before the phase is called ✅ VERIFIED

Status markers:

- ⏳ PLANNED — Not started
- 🔨 CODE DONE — Code written, NOT tested end-to-end
- 🧪 TESTING — Currently being tested
- ✅ VERIFIED — Tested AND user-confirmed working
- 🚧 BLOCKED — Has issues preventing completion

Never mark ✅ VERIFIED from "typecheck clean" or "files created" alone. After each phase document: what was tested manually, data verified (query + result), errors found and fixed, and user confirmation received.

---

## Acceptance Criteria

- **AC-01** — `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-otp` render inside a shared card-centered `(auth)/layout.tsx`, Vietnamese UI throughout.
- **AC-02** — `AuthProvider` is seeded server-side (root layout → `getUser()`), reacts to `onAuthStateChange`; `useUser` drives header menu + sign-out.
- **AC-03** — Middleware is deny-by-default: unauthenticated requests to any non-public path redirect to `/login?next=…` (safe relative path); authenticated users hitting `/login` or `/register` redirect to `/`.
- **AC-04** — Header user menu shows identity when signed in, "Đăng nhập/Đăng ký" when signed out; sign-out clears session and header state immediately.
- **AC-05** — `loginSchema`, `registerSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `otpSchema` exported from `@bus/validators` with Vietnamese messages, composed from existing atomic schemas.
- **AC-06** — `Card`, `Alert`, `Spinner`, `PasswordInput`, `Label` exported from `@bus/ui` barrel, accessible (labels, `aria-invalid`, `role="alert"`, toggle announced).
- **AC-07** — Every `auth.users` INSERT upserts exactly one `public.users` row via idempotent `handle_new_user` trigger; `role` always `PASSENGER`, never client-writable.
- **AC-08** — Wrong password and unknown email produce the **same** generic Vietnamese login error (no user enumeration).
- **AC-09** — Forgot-password shows identical success copy regardless of email existence; recovery link lands on `/auth/callback` → `/reset-password`; new password works for subsequent login.
- **AC-10** — Email OTP login: `signInWithOtp` → `/verify-otp` → `verifyOtp` creates a session; resend button has a 60-second client cooldown (server rate limit is Supabase's backstop).
- **AC-11** — `?next=` accepts only safe relative paths; `//evil.com`, `http(s)://…`, backslashes, encoded variants are rejected → fallback `/`.
- **AC-12** — Baseline intact: `pnpm typecheck` clean, `pnpm test` ≥135 passing, `pnpm test:e2e` ≥18 passing (all previous tests still green).
- **AC-13** — `SUPABASE_SERVICE_ROLE_KEY` never appears in the client bundle or `NEXT_PUBLIC_*`; no tokens/OTP codes in logs or Playwright URL assertions.

---

## Scope (IN)

- 5 pages under `apps/web/src/app/(auth)/` + shared `(auth)/layout.tsx` (card-centered shell)
- `/auth/callback` route handler (PKCE code exchange + `token_hash` verify fallback) — see Public Contracts for the decision
- Session layer: `AuthProvider` (React Context) seeded server-side + `onAuthStateChange`; `useUser` hook
- Middleware route protection: extend `apps/web/src/middleware.ts` (refresh exists at line 33; matcher at lines 38-42 reviewed — see Blast Radius)
- Header user menu + sign-out on landing page `apps/web/src/app/page.tsx` (and documented pattern for future nav)
- `handle_new_user` trigger migration in NEW `supabase/migrations/` (Supabase CLI convention; Prisma cannot own triggers on `auth.users`)
- UI kit: `Card`, `Alert`, `Spinner`, `PasswordInput`, `Label` in `packages/ui`; Zod compositions in new `packages/validators/src/auth.ts`
- Auth mutations via the BROWSER Supabase client `apps/web/src/lib/supabase/client.ts`
- Controlled `useState` forms + zod `safeParse` (**no react-hook-form**)
- Tests: Vitest unit/component per phase; Playwright `apps/web/e2e/auth.spec.ts` last

## Scope (OUT) — Out-of-Scope List

- **Google OAuth** (and any social/OAuth provider)
- **Phone SMS OTP** (`phoneSchema` exists but SMS provider is out of scope)
- **react-hook-form** (explicit constraint — controlled state + zod only)
- **Other dead links** on the landing page/footer (`/routes`, `/booking`, `/id-declaration`, `/help`, `/faq`, `/contact`, `/privacy`, `/terms`) — stay dead, NOT part of this plan (note only, per scope lock)
- Role management UI, profile editing, avatar upload
- RLS policy additions for `public.users` client reads (currently RLS on, zero policies = deny-all; nothing in this plan reads `users` from the client — session data comes from `auth.users` via `getUser()`/metadata)
- Prisma migrate baseline (`prisma_migrations` does not exist; schema applied via `db push`) — unchanged by this plan
- Touching `process/general-plans/active/bus-realtime-map_*` (forbidden)

---

## Phase 0 — Feasibility Probes & Out-of-Code Prerequisites

> Probe results below were executed at PLAN time (read-only). EXECUTE re-confirms them cheaply at the start of Phase 0 checkboxes before any code is written.

### Probe results (recorded 05-10-26, read-only SQL via existing Prisma client + `DATABASE_URL`)

| # | Probe | Method | Result |
|---|---|---|---|
| P1 | `public.users` exists vs Prisma model | `information_schema.columns` | **EXISTS**, columns match Prisma exactly: `id text PK`, `supabase_id text UNIQUE`, `email/phone UNIQUE (nullable)`, `full_name`, `avatar_url`, `created_at default now()`, `updated_at`, `role "Role" default 'PASSENGER'` |
| P2 | Triggers on `auth.users` | `pg_trigger` (non-internal) | **NONE** — no `handle_new_user`, no trigger function (`pg_proc` search empty) |
| P3 | `@supabase/supabase-js` / `@supabase/ssr` versions | `pnpm-lock.yaml` | `supabase-js@2.117.2`, `ssr@0.5.2` — `getUser()` available; `getClaims()` also available but NOT used (optional optimization only) |
| P4 | RLS on `public.users` | `pg_class.relrowsecurity` + `pg_policies` | RLS **enabled, ZERO policies** (deny-all for anon/authenticated) → trigger function MUST be `SECURITY DEFINER` |
| P5 | Can `DATABASE_URL` role apply the trigger migration? | `has_table_privilege('postgres','auth.users','TRIGGER'/'INSERT')` | **YES** both true; role `postgres` has `BYPASSRLS`; `auth` schema CREATE not granted (not needed — function lives in `public`) |
| P6 | Supabase Auth email config | `GET /auth/v1/settings` (public, anon key) | `mailer_autoconfirm: false` → signup requires email confirmation (drives e2e strategy, see Phase 6) |
| P7 | `auth.users` content | `count(*)` | 0 users — no backfill data, but migration stays idempotent anyway |
| P8 | Migrations state | `information_schema` | no `prisma_migrations`, no `.sql` files, no `supabase/` dir → NEW `supabase/migrations/` dir created by this plan |

Probe command pattern (re-run in Phase 0; SELECT-only):

```bash
node -e "/* temp script: createRequire(root/package.json) → PrismaClient → \$queryRawUnsafe( SELECTs above ); values from .env.local with quotes stripped */"
```

### Out-of-code prerequisites checklist (Supabase Dashboard — NOT code, must be confirmed before/during Phase 6)

- [ ] **SMTP provider** (Brevo/Resend free tier) configured under Authentication → Providers → Email, **OR** accept that link/OTP emails are undeliverable in dev (e2e handles this via admin helpers; OTP mailbox e2e stays skip-gated)
- [ ] **URL Configuration**: Site URL set to dev/prod origin; Redirect URL allowlist includes `http://localhost:3100/**` (e2e) and the production origin — required for `/auth/callback` (PKCE)
- [ ] **"Confirm email"** state understood and deliberately kept (`mailer_autoconfirm: false` observed) — plan does NOT flip it; e2e uses a service-role admin-confirm helper instead
- [ ] **Rate limits** accepted: Supabase server-side OTP/resend limits remain on; client adds 60s cooldown only
- [ ] `SUPABASE_SERVICE_ROLE_KEY` lives only in server/test env (`.env.local`, Playwright process), never `NEXT_PUBLIC_*`
- [ ] `DATABASE_URL`/`DIRECT_URL` still valid for `prisma db execute` (verified in P5)

---

## Execution Brief

### Phase 0: Probes & Prerequisites (pre-flight)
**What happens:** Re-run read-only probes P1–P8; tick the dashboard checklist with the user.
**Test/Verify:** Probe outputs match the table above; any drift (e.g. a trigger already exists) → STOP and reconcile before coding.
**Done when:** User confirms dashboard checklist items.

### Phase 1: UI kit + Zod schemas (pure, parallel-safe)
**What happens:** Add `Card`, `Alert`, `Spinner`, `PasswordInput`, `Label` to `packages/ui` (+ barrel) and `auth.ts` schemas to `packages/validators` (+ barrel re-export). No `apps/web` changes.
**Integration points:** Consumed by Phase 3 forms and Phase 4 menu; `@bus/ui`/`@bus/validators` aliases already configured in both vitest configs.
**Test:** `pnpm --filter @bus/validators test`, `pnpm --filter @bus/ui test`, `pnpm typecheck`.
**Done when:** New unit/component tests green; existing suites untouched and green.

### Phase 2: Session layer + middleware guards
**What happens:** `AuthProvider`+`useUser`, server-seeded via root `layout.tsx` → `providers.tsx`; `safeRedirectPath` util; deny-by-default guards + public allowlist in `middleware.ts` using `getUser()`.
**Integration points:** Phase 1 components are NOT needed here; Phase 3 pages consume `useUser`; middleware runs before every page.
**Test:** Vitest middleware tests with `NextRequest` fixtures + mocked `createServerClient`; AuthProvider tests with mocked browser client.
**Done when:** Manual probe (unauth → protected path redirects; auth → `/login` redirects) + tests green.

### Phase 3: Pages + forms + callback
**What happens:** `(auth)/layout.tsx` + 5 pages + `app/auth/callback/route.ts`; controlled forms with `safeParse`; generic Vietnamese error mapping; 60s OTP resend cooldown.
**Integration points:** Uses Phase 1 kit/schemas + Phase 2 session/middleware.
**Test:** Component tests (validation, error mapping, success navigation with mocked supabase client); manual flow via `pnpm dev`.
**Done when:** All 5 flows manually executable against the real Supabase project.

### Phase 4: Header menu + sign-out
**What happens:** `UserMenu` in landing header (`page.tsx` lines 43-53 replace login/register links when authed); future-nav integration point documented.
**Test:** Component tests for signed-in/out states + sign-out invocation; manual check.
**Done when:** User confirms header swaps states and sign-out works.

### Phase 5: Trigger sync (SQL migration)
**What happens:** NEW `supabase/migrations/*_handle_new_user.sql` (idempotent: `create or replace function` + `drop trigger if exists`/`create trigger` + idempotent backfill); apply via `prisma db execute --file`; verify with SQL.
**Integration points:** Depends on nothing in code; verified end-to-end by Phase 6 register flow.
**Test:** Post-apply trigger presence query + register → `public.users` row query.
**Done when:** User confirms trigger exists and a real signup creates exactly one row.

### Phase 6: Playwright e2e + full regression
**What happens:** `apps/web/e2e/auth.spec.ts` (real-Supabase happy paths with service-role admin helpers, skip-gated OTP mailbox test), then the full baseline gate.
**Integration points:** Reuses `apps/web/playwright.config.ts` (desktop + mobile, port 3100).
**Test:** `pnpm typecheck && pnpm test && pnpm test:e2e`.
**Done when:** All ACs evidenced; baseline ≥135 unit / ≥18 e2e still passing; user confirms.

### Expected Outcome
- Real register → login → sign-out flow working on the live Supabase project
- Every non-public route redirecting unauthenticated users to `/login?next=…`
- `public.users` populated automatically for every signup, `role = PASSENGER`
- Shared auth UI kit + schemas reusable by future dashboard/booking screens
- Baseline test suites unbroken, new auth test coverage added

---

## Phased Execution Workflow

This plan uses a phase-by-phase execution model with built-in verification gates. For each phase:

1. **Pre-Phase Research** — Re-read the touchpoint files listed for that phase, confirm the phase's assumptions still hold (especially Phase 0 probe results). **Present findings and STOP. Wait for approval before Step 2. Do NOT bundle research + implementation into one agent call.**
2. **Detailed Planning** — Confirm exact files, signatures, and success criteria for the phase.
3. **Implementation** — Execute approved steps exactly; deviations are recorded in the Resume/Handoff section.
4. **Testing & Verification** — Run the phase's verification commands, the manual test steps, and (where applicable) the data verification SQL.
5. **User Confirmation** — Present the structured post-stage summary (What's Functional Now / What Was Tested / What You Can Test / Ready For). The user tests and confirms before the phase may be marked ✅ VERIFIED.

**CRITICAL: Do NOT proceed to the next phase until the current phase is ✅ VERIFIED.**

Example — the pause between research and implementation (Phase 1):

```
EXECUTE (Phase 1, Step 1): reads packages/ui/src/components/button.tsx +
  input.tsx + packages/validators/src/index.ts, reports:
  "Input already has label/error/aria-invalid → PasswordInput wraps Input +
   toggle button; Alert follows Button's forwardRef + cn pattern; validators
  index uses flat const exports + `export * from './bus'` → auth.ts mirrors bus.ts.
  Propose: Alert variant prop, Card subcomponents. STOP — approve?"
USER: "go"
EXECUTE (Phase 1, Step 2-4): writes files + tests, runs commands, reports summary
USER: manual check → confirms → phase VERIFIED
```

---

## Touchpoints

### New Files

| Path | Purpose |
|------|---------|
| `packages/ui/src/components/card.tsx` | `Card`/`CardHeader`/`CardTitle`/`CardContent` shell |
| `packages/ui/src/components/alert.tsx` | `Alert` (error/success/info variants, `role="alert"` on error) |
| `packages/ui/src/components/spinner.tsx` | `Spinner` (loading states, `aria-label`/`aria-busy`) |
| `packages/ui/src/components/password-input.tsx` | `PasswordInput` — `Input` + visibility toggle (`Hi/HiOutline`-style inline SVG, `aria-pressed`) |
| `packages/ui/src/components/label.tsx` | `Label` (htmlFor wrapper) |
| `packages/validators/src/auth.ts` | `loginSchema`, `registerSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `otpSchema` + inferred types |
| `packages/ui/vitest.config.mjs` + `packages/ui/src/test/setup.ts` | Package-scoped jsdom test config (test-infra addition, see Test Infra Improvement Notes) |
| `packages/validators/src/__tests__/auth.test.ts` | Schema unit tests |
| `packages/ui/src/components/__tests__/*.test.tsx` | Component tests |
| `apps/web/src/components/auth/AuthProvider.tsx` | React Context provider (server-seeded `initialUser` + `onAuthStateChange`) exporting `useUser` |
| `apps/web/src/lib/safe-redirect.ts` | `safeRedirectPath()` — shared by middleware + callback + forms |
| `apps/web/src/app/(auth)/layout.tsx` | Card-centered auth shell |
| `apps/web/src/app/(auth)/login/page.tsx` (+ `_components/LoginForm.tsx`) | Login (password + "Đăng nhập bằng OTP" entry) |
| `apps/web/src/app/(auth)/register/page.tsx` (+ `_components/RegisterForm.tsx`) | Registration |
| `apps/web/src/app/(auth)/forgot-password/page.tsx` (+ form) | Request recovery email |
| `apps/web/src/app/(auth)/reset-password/page.tsx` (+ form) | Set new password (recovery session) |
| `apps/web/src/app/(auth)/verify-otp/page.tsx` (+ form) | 6-digit OTP entry + resend cooldown |
| `apps/web/src/app/auth/callback/route.ts` | PKCE exchange / `token_hash` verify → safe redirect |
| `apps/web/src/components/auth/UserMenu.tsx` | Header menu (signed-in dropdown vs auth links) |
| `apps/web/src/lib/auth/__tests__/*.test.ts(x)` | AuthProvider/useUser/safeRedirectPath tests |
| `apps/web/src/middleware/__tests__/middleware.test.ts` | Middleware guard tests via `NextRequest` fixtures (colocated, not to be confused with `src/middleware.ts`) |
| `supabase/migrations/<timestamp>_handle_new_user.sql` | Idempotent trigger function + trigger + backfill |
| `apps/web/e2e/auth.spec.ts` | Playwright e2e (register→login→logout, forgot-password, gated OTP) |
| `apps/web/e2e/helpers/auth-admin.ts` | Node-side service-role admin helper (confirm user, generate recovery link, cleanup) |

### Modified Files

| Path | Change |
|------|--------|
| `packages/ui/src/index.ts` | Barrel exports: `Card*`, `Alert`, `Spinner`, `PasswordInput`, `Label` |
| `packages/validators/src/index.ts` | Add `export * from './auth';` (mirrors existing `export * from './bus';`) |
| `apps/web/src/middleware.ts` | Keep cookie refresh (line 33); add allowlist/deny-by-default guards + safe `next` handling; review matcher (lines 38-42) |
| `apps/web/src/app/layout.tsx` | Async: seed `getUser()` → pass `initialUser` into `Providers` |
| `apps/web/src/app/providers.tsx` | Accept `initialUser`, wrap children with `AuthProvider` (keeps `QueryClientProvider`) |
| `apps/web/src/app/page.tsx` | Header (lines 43-53): render `UserMenu` instead of static auth links |
| `apps/web/playwright.config.ts` | Only if needed: pass through env for service-role helper (falls back to parsing `.env.local` in the helper — no browser-exposed env) |
| `apps/web/src/test/setup.ts` | Only if a shared supabase-client mock helper is added for component tests |

### Packages Touched

- `packages/ui` — new components, barrel, test config (additive)
- `packages/validators` — new `auth.ts` composition module (additive)
- `apps/web` — session, middleware, pages, header, tests
- `packages/db` — read-only usage (`prisma db execute` applies the SQL file; schema unchanged)
- NEW top-level `supabase/migrations/` — first SQL artifact in the repo

---

## Public Contracts

### 1. Zod schemas (`@bus/validators` → `./auth`)

```typescript
loginSchema          // { email: emailSchema, password: passwordSchema }
registerSchema       // { email, password, confirmPassword, fullName: fullNameSchema,
                     //   phone: phoneSchema.optional() } — refine confirmPassword match
forgotPasswordSchema // { email: emailSchema }
resetPasswordSchema  // { password, confirmPassword } — refine match
otpSchema            // { email: emailSchema, token: z.string().regex(/^\d{6}$/, 'Mã OTP phải gồm 6 chữ số') }
```

All messages Vietnamese; every field reuses the existing atomic schemas (`emailSchema`, `passwordSchema`, `fullNameSchema`, `phoneSchema`). Types exported: `LoginInput`, `RegisterInput`, `ForgotPasswordInput`, `ResetPasswordInput`, `OtpInput`.

### 2. UI kit (`@bus/ui` barrel)

`Card`, `CardHeader`, `CardTitle`, `CardContent`, `Alert({ variant: 'error'|'success'|'info' })`, `Spinner({ className?, label? })`, `PasswordInput` (Input-compatible props + `label`/`error` passthrough + toggle button), `Label`. All follow the existing `forwardRef` + `cn()` pattern in `button.tsx`/`input.tsx`.

### 3. Session API (`apps/web/src/components/auth/AuthProvider.tsx`)

```typescript
interface AuthContextValue {
  user: { id: string; email?: string; fullName?: string; avatarUrl?: string } | null;
  isLoading: boolean;             // false once server seed + first onAuthStateChange settle
  signOut: () => Promise<void>;   // supabase.auth.signOut() then local state clear
}
function useUser(): AuthContextValue;   // throws outside provider
```

Seeded: root `layout.tsx` (server) → `createClient().auth.getUser()` → `Providers initialUser` → client `AuthProvider` initial state → `onAuthStateChange` keeps it live.

### 4. Middleware contract (`apps/web/src/middleware.ts`)

| Rule | Behavior |
|---|---|
| Public allowlist (exact) | `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-otp`, `/auth/callback`, `/manifest.json`, `/sw.js`, `/service-worker.js`, `/robots.txt`, `/favicon.ico` |
| Public allowlist (prefix) | `/map`, `/api/`, `/_next/` |
| Public allowlist (pattern) | pathnames containing a static file extension (`/\.[a-z0-9]{2,5}(\?|$)/i`) — prevents the deny-by-default gate from redirecting asset/manifest requests (protects the existing map e2e + PWA behavior) |
| Everything else | Unauthenticated → `302 /login?next=<safeRedirectPath(pathname + search)>`; missing/unsafe `next` falls back to `/login` |
| Authenticated on `/login` or `/register` | `302 /` (per locked scope) |
| Identity check | `const { data: { user } } = await supabase.auth.getUser()` (already called at line 33 — result now used). **`getUser()`, never `getSession()`** — cookie can be forged; `getUser()` revalidates the JWT with Supabase |
| RSC double-check (documented pattern, no sensitive layouts exist yet) | Sensitive server layouts: `const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/login');` — snippet captured here for future `(dashboard)` layouts |
| Matcher | Keep the existing broad matcher (lines 38-42) — do NOT narrow it; auth-critical exclusions are handled by the allowlist, not by removing paths from the matcher |

### 5. `safeRedirectPath(value: string | null): string | null`

Accept **only** paths that: start with `/`, do NOT start with `//`, contain no `\`, no `:` (blocks `http:`/`https:`/`javascript:`), no `%0a`/`%0d`/`%00` control encodings, no `//` after decode, and length ≤ 2048. Otherwise return `null` (callers fall back to `/`). Used by middleware, `/auth/callback`, and any form reading `?next=`.

### 6. Route table

| URL | Kind | Auth required | Notes |
|---|---|---|---|
| `/login` | page (`(auth)`) | no (authed → `/`) | password + OTP entry points |
| `/register` | page (`(auth)`) | no (authed → `/`) | on `mailer_autoconfirm:false` shows "kiểm tra email" state |
| `/forgot-password` | page (`(auth)`) | no | generic success copy always |
| `/reset-password` | page (`(auth)`) | no (recovery session from callback) | `updateUser({ password })` |
| `/verify-otp` | page (`(auth)`) | no | 60s resend cooldown |
| `/auth/callback` | route handler (`app/auth/callback/route.ts`, NOT inside `(auth)` — it is a handler, not a page) | no | PKCE: `?code=` → `exchangeCodeForSession`; `?token_hash=&type=` → `verifyOtp({ type, token_hash })`; then `redirect(safeRedirectPath(next) ?? '/')`. Fallback on failure → `/login` with generic error (handles cross-browser PKCE verifier loss) |

### 7. DB trigger contract (`supabase/migrations/<timestamp>_handle_new_user.sql`)

```sql
-- idempotent shape (exact SQL finalized in EXECUTE):
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' ... -- insert new.id/new.email/new.phone,
  -- metadata full_name/avatar_url, role fixed 'PASSENGER'
  -- on conflict (supabase_id) do update set email=excluded.email, full_name=..., updated_at=now()
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
-- plus idempotent backfill from auth.users (currently 0 rows)
```

Invariants: keyed on `supabase_id = auth.users.id`; **`role` hardcoded `PASSENGER` — never read from `raw_user_meta_data`** (metadata is client-controlled at `signUp`); `SECURITY DEFINER` mandatory (P4: RLS on `public.users` has zero policies); never logs or returns tokens.

**Apply command:** `pnpm exec prisma db execute --file supabase/migrations/<file>.sql --schema packages/db/prisma/schema.prisma` (uses `DATABASE_URL`; P5 confirms the role has TRIGGER+INSERT on `auth.users`). Optional later: `supabase db push` if the dir is linked — not required by this plan.

### 8. Error-message contract (no enumeration)

| Scenario | User sees (always) |
|---|---|
| Login: wrong password OR unknown email (incl. `invalid_credentials`, `user_not_found`, `email_not_found`) | `Email hoặc mật khẩu không đúng.` |
| OTP invalid/expired | `Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.` |
| Recovery/OTP request (any email) | `Nếu email tồn tại, chúng tôi đã gửi hướng dẫn. Vui lòng kiểm tra hộp thư.` |
| Generic network/server failure | `Đã xảy ra lỗi. Vui lòng thử lại.` |

Mapping lives in one shared helper (e.g. `apps/web/src/lib/auth/auth-errors.ts`) so wording cannot drift between forms.

### 9. Env contract

`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client-safe (already used by `client.ts`). `SUPABASE_SERVICE_ROLE_KEY` — server + Playwright process only (e2e admin helper); `DATABASE_URL`/`DIRECT_URL` — migration apply only. No tokens/OTP codes in logs, `console.*`, or Playwright URL assertions (AC-13).

---

## Blast Radius

| Dimension | Assessment |
|-----------|------------|
| **Files created** | ~28 new (5 pages + layout + forms + callback handler + 5 UI components + providers/hooks/utils + tests + 1 SQL + 1 e2e spec + helpers) |
| **Files modified** | ~7 (`layout.tsx`, `providers.tsx`, `page.tsx`, `middleware.ts`, 2 barrels, `playwright.config.ts` only if needed) |
| **Packages affected** | `apps/web` (primary), `packages/ui`, `packages/validators` (additive), `packages/db` (execute-only, schema untouched), NEW `supabase/migrations/` |
| **Risk class** | **HIGH** — auth is a security surface: open-redirect, user enumeration, session handling, edge middleware applied to every request, live-DB trigger |
| **Rollback** | Revert the branch; middleware guards live in one file (revert restores pass-through); trigger removable via `drop trigger ...; drop function ...` (idempotent migration also `drop trigger if exists` first); no Prisma schema change → no data migration risk |
| **Dependencies** | No new runtime deps (`@supabase/ssr` 0.5.2 / `supabase-js` 2.117.2 already present). Dev-only: nothing new beyond existing Vitest/Playwright |

### Matcher review (locked security item)

Existing matcher (`apps/web/src/middleware.ts:38-42`) excludes only `_next/static`, `_next/image`, `favicon.ico`, and image extensions. It **does not** exclude `/manifest.json`, `/sw.js`, `/robots.txt`, JSON/JS/WASM assets, or `/api/*`. Consequences for deny-by-default:

- Keep the matcher broad (do NOT add auth-critical paths to the exclusion regex).
- Allowlist static-ish paths inside middleware code (exact/prefix/pattern allowlists in Public Contracts §4).
- Verify with the existing map e2e (which loads PWA assets) — if any asset gets redirected, the allowlist pattern is wrong, not the matcher.

---

## Security Posture — Risk Register (STRIDE-informed, locked constraints)

| # | Risk | STRIDE | Mitigation (must appear in implementation) |
|---|------|--------|-------------------------------------------|
| R1 | Open redirect via `?next=` (`//evil.com`, `http://`, backslashes, encoded variants) | Tampering | Shared `safeRedirectPath()` (Public Contracts §5) used by middleware, callback, forms; unit-tested with the full reject list (AC-11) |
| R2 | User enumeration (login/forgot-password reveal account existence) | Info disclosure | Generic Vietnamese messages (Public Contracts §8); identical response copy + timing-insensitive flow; tested for unknown vs known email |
| R3 | OTP/resend abuse | Tampering/DoS | Client 60s cooldown on resend; Supabase server-side rate limits remain enabled; no code in logs |
| R4 | `SERVICE_ROLE_KEY` leaked to client bundle | Info disclosure | Never imported under `app/` client code; only `e2e/helpers/*` (Node); verification grep of build output in Phase 6 |
| R5 | API/route body accepting `role` (privilege escalation) | Elevation of privilege | This plan creates NO API route that writes `users` (`api/auth/` stays empty); trigger hardcodes `role='PASSENGER'`; documented rule: future API routes whitelist columns and never read `role` from body |
| R6 | Tokens/OTP codes in logs or Playwright URL assertions | Info disclosure | Error helper never logs Supabase error payloads with tokens; e2e asserts on UI copy + `page.url()` pathname only (never query contents beyond the allowlisted `next` path) |
| R7 | Cookie-forged session accepted | Elevation of privilege | `getUser()` everywhere (middleware + RSC pattern); `getSession()` banned |
| R8 | Matcher regression locks out static/PWA assets or lets an auth path through | Tampering | Allowlist approach (§4) + matcher review (Blast Radius) + map e2e must stay green (AC-12) |
| R9 | PKCE recovery link opened on a different device (no code_verifier) | DoS/UX | Callback falls back to `token_hash` verify path; on total failure → friendly `/login` message advising resend |
| R10 | Trigger fails under RLS (zero policies on `public.users`) | — | `SECURITY DEFINER` + owner `postgres` (BYPASSRLS) — proven by P4/P5 |
| R11 | `public.users` deny-all RLS surprises future features | Info disclosure | Out of scope here; documented in Scope(OUT) so future plans add explicit SELECT policies instead of weakening RLS |

---

## Architecture & Data Flow

```
Browser (React, controlled forms + zod safeParse)
   │  signUp / signInWithPassword / signInWithOtp / verifyOtp /
   │  resetPasswordForEmail / updateUser / signOut
   ▼
apps/web/src/lib/supabase/client.ts  (@supabase/ssr browser client, PKCE, cookie session)
   │                                       ▲
   │  onAuthStateChange ──► AuthProvider(useUser) ──► UserMenu / forms
   ▼
Supabase Auth (auth.users)  ──AFTER INSERT──► handle_new_user trigger (SECURITY DEFINER)
   │                                              │ upsert (supabase_id, email, phone,
   │                                              │ full_name, role='PASSENGER')
   ▼                                              ▼
auth cookie  ──every request──► middleware.ts: getUser() ── allowlist? ──► page
                                 │                      └ unauth + protected → /login?next=…
                                 ▼
                       /auth/callback (PKCE code / token_hash) → safe redirect
```

---

## Implementation Checklist / Phased Delivery Plan

### Phase 0: Feasibility re-confirm & prerequisites ⏳ PLANNED (0.3 outstanding)
- [x] 0.1 Re-run probes P1–P2 (users columns, triggers on `auth.users`) — outputs must match Phase 0 table; STOP on drift
- [x] 0.2 Re-confirm P3 versions (`pnpm-lock.yaml`) and P6 `mailer_autoconfirm`
- [ ] 0.3 Walk the out-of-code checklist with the user (SMTP, Site URL/redirect allowlist, confirm-email state, service-role key placement) — USER ACTION, stays open
- [x] 0.4 Record probe evidence + checklist status in the plan's Resume/Handoff section

**Verify (Phase 0):** probe outputs match recorded table; checklist answered; `pnpm typecheck` still clean as baseline.
**Test Procedure:** read-only only — no code, no DB writes.
**Manual Test:** none (informational gate).
**Data Verification:** SQL SELECT outputs pasted into Handoff.
**Done when:** user approves moving to Phase 1.
**What's Functional Now:** nothing changed. **Ready For:** Phase 1.

### Phase 1: UI kit + Zod auth schemas 🔨 CODE DONE
- [x] 1.1 Pre-phase research: read `packages/ui/src/components/{button,input}.tsx` + `packages/validators/src/index.ts`; present proposed component/schemas API; STOP for approval
- [x] 1.2 Create `Card`, `Alert`, `Spinner`, `Label` in `packages/ui/src/components/` (forwardRef + `cn` pattern)
- [x] 1.3 Create `PasswordInput` (wraps `Input`, visibility toggle button with `aria-pressed` + Vietnamese `aria-label`)
- [x] 1.4 Export all five from `packages/ui/src/index.ts`
- [x] 1.5 Create `packages/validators/src/auth.ts` with the 5 schemas composed from atomic schemas (Vietnamese messages) + inferred types
- [x] 1.6 Add `export * from './auth';` to `packages/validators/src/index.ts`
- [x] 1.7 Add `packages/ui/vitest.config.mjs` (jsdom, `*.test.tsx`) + `packages/ui/src/test/setup.ts` (`@testing-library/jest-dom`)
- [x] 1.8 Write `packages/validators/src/__tests__/auth.test.ts`: valid pass, each field's reject + Vietnamese message, confirmPassword mismatch, OTP regex
- [x] 1.9 Write component tests: `card`, `alert` (variants + `role="alert"`), `spinner` (aria), `password-input` (toggle reveals/masks, label/error wiring)
- [x] 1.10 Run `pnpm --filter @bus/validators test && pnpm --filter @bus/ui test && pnpm typecheck` — all green

**Verify (Phase 1):** commands above + `pnpm test` (root) unchanged/green.
**Test Procedure:** component tests assert rendering + a11y attributes; schema tests assert messages.
**Data Verification:** n/a (pure code).
**Done when:** user confirms components look/act right (can render via `pnpm test:ui` or story-free manual check in Phase 3).
**What's Functional Now:** shared kit + schemas available to import. **Ready For:** Phase 2 (independent) / Phase 3 (consumer).

### Phase 2: Session layer + middleware guards 🔨 CODE DONE
- [x] 2.1 Pre-phase research: re-read `middleware.ts`, `layout.tsx`, `providers.tsx`, `lib/supabase/{client,server}.ts`; present guard matrix + AuthProvider API; STOP for approval
- [x] 2.2 Create `apps/web/src/lib/safe-redirect.ts` with `safeRedirectPath()` per Public Contracts §5
- [x] 2.3 Create `apps/web/src/components/auth/AuthProvider.tsx` (initialUser seed, `onAuthStateChange`, `signOut`, `useUser`)
- [x] 2.4 Make root `layout.tsx` async: `createClient().auth.getUser()` → `Providers initialUser=…`
- [x] 2.5 Extend `providers.tsx`: accept `initialUser`, nest `AuthProvider` inside `QueryClientProvider`
- [x] 2.6 Extend `middleware.ts`: capture `getUser()` result; implement allowlist (exact/prefix/pattern), deny-by-default → `/login?next=…`, authed-on-login/register → `/`; keep cookie refresh + broad matcher
- [x] 2.7 Write `safe-redirect.test.ts`: accept `/map?x=1`, reject `//evil.com`, `https://a`, `\\x`, `/%2f%2fevil`, `java\tscript:`, null/empty, overlong
- [x] 2.8 Write middleware tests (`NextRequest` fixtures, mocked `@supabase/ssr`): unauth→protected redirect w/ safe `next`; unauth→public passes; authed→`/login` redirects `/`; authed→protected passes; static asset path passes; `getSession`-style forged cookie ignored (mock returns null user)
- [x] 2.9 Write AuthProvider tests: initial seed renders user, `SIGNED_OUT` clears, `signOut` calls client and clears, `useUser` throws outside provider
- [x] 2.10 Run `pnpm test -- safe-redirect && pnpm test -- middleware && pnpm test -- AuthProvider && pnpm typecheck`

**Verify (Phase 2):** commands above green; `pnpm test` root green.
**Test Procedure:** unit-level guard matrix (table in middleware tests mirrors Public Contracts §4).
**Manual Test:** `pnpm dev` → visit `/settings` (nonexistent protected path) → lands on `/login?next=%2Fsettings`; sign-in state simulated by unit tests (no login UI yet — manual sign-in comes in Phase 3).
**Data Verification:** n/a.
**Done when:** user approves guard matrix behavior + tests green.
**What's Functional Now:** route gate active for every non-public path; session context live. **Ready For:** Phase 3.

### Phase 3: Auth pages + forms + `/auth/callback` 🔨 CODE DONE
- [x] 3.1 Pre-phase research: review Phase 1/2 artifacts + Supabase auth method signatures for `supabase-js@2.117.2`; present page-by-page flow diagram; STOP for approval (executed within the approved EXECUTE chunk: kit/schemas/session/middleware allowlist verified present, browser+server client signatures confirmed, test-infra note — global `next/navigation` setup mock creates a fresh `push` fn per call, so form tests re-mock locally)
- [x] 3.2 Create `(auth)/layout.tsx` card-centered shell (Vietnamese copy, BusGo branding, back-to-home link)
- [x] 3.3 Create `auth-errors.ts` shared error mapper (Public Contracts §8 wording, generic-login mapping) — `apps/web/src/lib/auth/auth-errors.ts` with `authErrorMessages`, `mapAuthError(kind)`, `zodFieldErrors`
- [x] 3.4 `/login`: email+password via `signInWithPassword` (safeParse gate) + "Quên mật khẩu?" link + "Đăng nhập bằng OTP" link → `/verify-otp` with entered email; generic error Alert; `?error=1` → invalid-link Alert; success → `safeRedirectPath(next) ?? '/'`
- [x] 3.5 `/register`: `registerSchema` + `signUp({ email, password, options: { data: { full_name, phone }, emailRedirectTo: <origin>/auth/callback?next=/ } })`; if `session === null` show "kiểm tra email" confirmation state (+ resend-confirmation via `resend({ type: 'signup' })` with 60s cooldown); if session → redirect `/`
- [x] 3.6 `/forgot-password`: `forgotPasswordSchema` + `resetPasswordForEmail(email, { redirectTo: <origin>/auth/callback?next=/reset-password })`; always show generic success copy
- [x] 3.7 `/reset-password`: `resetPasswordSchema` + `updateUser({ password })` (browser client; presence check via browser `getUser()` — none → link to `/forgot-password`); success → redirect `/`
- [x] 3.8 `/verify-otp`: read `?email=` (validated with `emailSchema`); `otpSchema` + `verifyOtp({ type: 'email', email, token })` → `/`; "Gửi mã OTP"/"Gửi lại mã" button with 60s countdown (client) + `signInWithOtp` send/resend; sent state shows contract §8 generic copy
- [x] 3.9 Create `app/auth/callback/route.ts`: handle `?code=` (exchangeCodeForSession) AND `?token_hash=&type=` (verifyOtp, type whitelist); on success `redirect(safeRedirectPath(next) ?? '/')` 302; on failure → `/login?error=1` (generic UI copy, no error detail in URL)
- [x] 3.10 Component tests per form: renders, client-side validation messages (no API call on invalid), mocked-client error → generic Alert, mocked success → `router.push` called; callback handler unit test with mocked client (code path + token_hash path + unsafe next fallback); plus `auth-errors` unit tests and `(auth)` layout test
- [x] 3.11 Run `pnpm test -- auth && pnpm typecheck` — green (see Resume/Handoff for exact counts)

**Verify (Phase 3):** commands green; root `pnpm test` green.
**Test Procedure:** component tests with mocked `createClient`; manual flows in Manual Test below.
**Manual Test:** `pnpm dev` → register (see "kiểm tra email"), confirm via dashboard/admin (temporary) → login → wrong-password shows generic error; forgot-password shows generic success; OTP request → countdown ticks.
**Data Verification:** after registering manually: `select id, email, full_name from auth.users order by created_at desc limit 1;` (users row appears only after Phase 5).
**Errors handled:** enumeration copy, network failure Alert, unsafe `next` fallback.
**Done when:** user completes all five flows manually and confirms.
**What's Functional Now:** full auth UI usable (session via cookie). **Ready For:** Phase 4.

### Phase 4: Header user menu + sign-out 🔨 CODE DONE
- [x] 4.1 Pre-phase research: re-read `page.tsx` header block (lines 23-56); present menu design; STOP for approval (executed within the approved EXECUTE chunk, precedent of 3.1: auth links at lines 43-53 inside `<div className="flex items-center gap-4">`; nav links 32-42 stay; page already `mounted`-gated at 7-19; `useUser()` = `{user, isLoading, signOut}` with `isLoading=true` until first `onAuthStateChange` when server seed is null; test convention = local hoisted router mock since global setup creates a fresh `push` fn per call)
- [x] 4.2 Create `components/auth/UserMenu.tsx`: signed-out → `Đăng nhập` link + `Đăng ký` button (exact markup of previous lines 44-52 preserved); signed-in → avatar/initial button with accessible dropdown (email/full name, `Đăng xuất`), keyboard + outside-click close (`aria-haspopup="menu"`, `aria-expanded`, `role="menu"`/`role="menuitem"`, Escape closes + refocuses trigger, ArrowDown opens, outside `pointerdown`/`mousedown` closes)
- [x] 4.3 Wire `signOut()` → `await signOut()` → `router.push('/')`; menu closes before sign-out so header reverts to auth links
- [x] 4.4 Replace static auth links in `page.tsx` header with `<UserMenu />` (whole lines 43-53 div replaced; nav links untouched); future-nav note: any `(dashboard)` nav imports the same component (documented here — no such nav exists yet); hydration flash handled via `mounted` gate + `isLoading` skeleton (`aria-busy`) mirroring the map/landing page mounted pattern
- [x] 4.5 Component tests `apps/web/src/components/auth/__tests__/UserMenu.test.tsx`: signed-out links, loading skeleton, signed-in identity + initial fallback + avatar image, menu contents, `Đăng xuất` invokes mocked `useUser().signOut` + `router.push('/')`, outside click closes, inside click keeps open, Escape closes + refocuses, ArrowDown opens (a11y)
- [x] 4.6 Run `pnpm test -- UserMenu && pnpm typecheck` — green: UserMenu file 11/11; root `pnpm test` = **316 passing (34 files)** (was 305/33), `pnpm typecheck` clean

**Verify (Phase 4):** commands green; root `pnpm test` green.
**Manual Test:** login (Phase 3 flow) → header shows menu; sign out → links return; landing page identical when signed out (no visual regression).
**Data Verification:** n/a (cookie cleared — verify `/settings` redirects to login with `next` after logout).
**Done when:** user confirms header states + sign-out.
**What's Functional Now:** auth is visible and exitable from the UI. **Ready For:** Phase 5.

### Phase 5: Trigger sync (SQL migration) 🔨 CODE DONE — 5.1-5.7 all evidenced (user confirmation pending)
- [x] 5.1 Pre-phase research: re-run trigger probe (P2) — still empty (`pg_trigger` non-internal on `auth.users` → `[]`, `pg_proc handle_new_user` → `[]`); P5 re-confirmed: role `postgres`, `has_table_privilege('auth.users','TRIGGER')=true`, `INSERT=true`; `auth.users`=0 / `public.users`=0 (backfill is a no-op); final SQL presented in 5.2 (research executed within approved EXECUTE chunk, precedent of 3.1)
- [x] 5.2 Create `supabase/migrations/20261010143700_handle_new_user.sql` (idempotent: `create or replace function … security definer set search_path = ''`, `drop trigger if exists` + `create trigger`, metadata mapping `full_name`/`avatar_url` from `raw_user_meta_data`, `role` hardcoded `PASSENGER`, `on conflict (supabase_id)` upsert, idempotent backfill from `auth.users`, no token logging). EXECUTE deviation recorded: added `revoke execute on function public.handle_new_user() from public, anon, authenticated;` after `create trigger` — orchestrator security constraint "NEVER grant client access"; plan §7 leaves exact SQL "finalized in EXECUTE"; safe because Postgres checks EXECUTE on the trigger function at CREATE TRIGGER time only, not at fire time (owner `postgres` retains EXECUTE)
- [x] 5.3 Apply: `pnpm exec prisma db execute --file supabase/migrations/20261010143700_handle_new_user.sql --schema packages/db/prisma/schema.prisma` (with `DATABASE_URL`+`DIRECT_URL` exported from `apps/web/.env.local`; first attempt without `DIRECT_URL` failed P1012 → re-ran with both) → `Script executed successfully.`
- [x] 5.4 Re-apply the same file (idempotency proof) → `Script executed successfully.` (2nd run no error)
- [x] 5.5 Verify trigger: `select tgname from pg_trigger … where n.nspname='auth' and c.relname='users' and not t.tgisinternal;` → `[{"tgname":"on_auth_user_created"}]`; function check → `handle_new_user`, `prosecdef=true`, `plpgsql`; `pg_get_triggerdef` → `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()`; EXECUTE ACL → `anon=false, authenticated=false, postgres=true`
- [x] 5.6 Data verification: register a real user (or reuse Phase 3 test user), then `select supabase_id, email, role from public.users order by created_at desc limit 3;` → row present, `role='PASSENGER'`, exactly one row per signup; repeat signup → upsert not duplicated — **VERIFIED in Phase 6** (2026-10-10, `auth.spec.ts` register test against live Supabase): `[5.6] public.users rows for register email: [{"supabase_id":"48b48a84-5fe9-4920-a5bb-6d101fee07d6","email":"e2e-register-mv2838id-67v84u@gmail.com","full_name":"E2E Register User","role":"PASSENGER"}]` — `expect(rows).toHaveLength(1)` + `toMatchObject({email, full_name, role:'PASSENGER'})` both passed; row removed by the helper's `finally` cleanup
- [x] 5.7 Negative check: attempt insert with crafted metadata `full_name/role: 'ADMIN'` via `signUp` options data → `public.users.role` stays `PASSENGER` — **VERIFIED in Phase 6** (2026-10-10): spec injects `data.role='ADMIN'` into the real `POST /auth/v1/signup` request via a URL-predicate `page.route`, then asserts `raw_user_meta_data.role === 'ADMIN'` (tamper arrived) while `public.users.role === 'PASSENGER'` (trigger ignores it): `[5.7] auth.users.raw_user_meta_data.role=ADMIN → public.users.role=PASSENGER`

**Verify (Phase 5):** 5.5–5.7 outputs recorded in Handoff.
**Test Procedure:** SQL trigger presence + real-signup data checks.
**Manual Test:** register through the real UI once after applying.
**Data Verification:** queries in 5.5/5.6 with results pasted into Handoff.
**Errors handled:** re-apply idempotent; conflict upsert updates email/full_name without new row.
**Done when:** user confirms DB evidence.
**What's Functional Now:** auth.users → users sync live. **Ready For:** Phase 6.

### Phase 6: Playwright e2e + full regression 🧪 TESTING (6.1-6.10 ALL done; user confirmation pending)
- [x] 6.1 Pre-phase research: re-read `playwright.config.ts` + `e2e/map.spec.ts` conventions; confirm env access for service-role helper (`apps/web/.env.local`, runner-side only); STOP for approval — done: **two** configs exist (repo-root `playwright.config.ts`, projects `chromium`/`mobile-chrome`/`mobile-safari`, used by `pnpm test:e2e`; and `apps/web/playwright.config.ts`, projects `desktop-chromium`/`mobile-chromium`, the 18/18 baseline config the plan names); helper parses `apps/web/.env.local` (and root `.env.local`) because Playwright's Node process does not load Next's env files; both files carry `SUPABASE_SERVICE_ROLE_KEY`
- [x] 6.2 Create `e2e/helpers/auth-admin.ts`: loads `SUPABASE_SERVICE_ROLE_KEY` + URL (runner env or `.env.local` parse); `confirmUserByEmail` (`auth.admin.listUsers` → `updateUserById({ email_confirm: true })`), `generateRecoveryLink` (`admin.generateLink({ type: 'recovery' })`), `deleteUserByEmail`; **skips tests cleanly when key absent**; never exposes key to `page`/browser — verified live: `adminAvailable()` gates the 6 admin-dependent tests (`test.skip(!adminOk, …)`), fixtures are created through the admin API (0 email sends), key only ever read in Node
- [x] 6.3 `auth.spec.ts` happy path (REAL Supabase): unique test email per run → register → assert "kiểm tra email" state (autoconfirm=false, P6) → admin-confirm → login with wrong password first (assert generic error copy) → login → header menu visible → logout → auth links back → `/settings` redirects to `/login?next=%2Fsettings` — **PASSED 2026-10-10 16:59** (27.1s, `desktop-chromium`): confirmation alert + `Gửi lại sau 60s` cooldown, `login-error` = `Email hoặc mật khẩu không đúng.`, header menu shows the email, `Đăng xuất` returns the `Đăng nhập` link, `/settings` → `/login` with `next=/settings`; `[5.6]`/`[5.7]` evidence lines emitted (also closes 5.6/5.7)
- [x] 6.4 Forgot-password e2e: submit unknown email and known email → byte-identical success copy; optional full reset via `generateRecoveryLink` → visit link (token_hash path) → set new password → login with it — **PASSED 2026-10-10 23:41 (17.6s, `desktop-chromium`)**: both `/auth/v1/recover` rounds returned the identical `RECOVERY_COPY` (`knownCopy === unknownCopy === 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn. Vui lòng kiểm tra hộp thư.'`), `admin.generateLink(type='recovery')` → `/auth/callback?token_hash=…&type=recovery&next=/reset-password` → 302 `/reset-password` → set `FIXTURE_RESET_NEW_PASSWORD` → redirect `/` → cleared cookies → logged in with the new password (AC-09). Later runs skip on Supabase's built-in 2-emails/hour quota (`recover` answers `429 over_email_send_rate_limit` → `QuotaExhaustedError` → explicit skip); the unknown-email round is rate-limited too, so a run spends capacity even when no mail is delivered
- [x] 6.5 OTP e2e: `test.skip(!process.env.E2E_OTP_MAILBOX, 'No SMTP mailbox configured')` — full `signInWithOtp` → mailbox read → verify path only runs when a mailbox exists; core OTP logic otherwise proven by Phase 3 component tests — implemented, `E2E_OTP_MAILBOX` unset here so it reports as an explicit skip in all 3 projects (9 skipped in 6.9 include this)
- [x] 6.6 Error-path coverage kept in unit/component tests (mocked client) — no brittle network mocking in Playwright for happy-path file — held: the only `page.route` in `auth.spec.ts` rewrites the happy-path signup body to plant `role: 'ADMIN'` (plan 5.7 tamper proof), it is not error mocking; all error branches stay in the 8 component test files
- [x] 6.7 Security hygiene asserts: no `access_token`/`refresh_token`/OTP digits in any URL or console message during the spec; helper cleanup deletes every created user (`finally`) — `beforeEach` records `console`/`pageerror`/`framenavigated` and `afterEach` fails on `access_token=`, `refresh_token=`, `id_token=`, `provider_token=`, `email_otp`, `otp_code` or any `eyJ` JWT blob; register test deletes its user in `finally`, `afterAll` runs `cleanupTrackedEmails()` (fixtures + any missed address)
- [x] 6.8 Playwright config touch (only if needed): ensure helper env passthrough; webServer already inherits `.env.local` via Next — **no config change needed**: helper-side `.env.local` parsing covers the runner; both configs untouched by this phase
- [x] 6.9 Full regression: `pnpm typecheck && pnpm test && pnpm test:e2e` — ≥135 unit / ≥18 map e2e all green plus new auth tests — `pnpm typecheck` (root, `strict:true`) **clean**; `pnpm test` = **316 passed / 34 files** (≥135 ✓, baseline 305 + UserMenu/phase-4 tests); `pnpm test:e2e` (root config, 3 projects) = **38 passed / 9 skipped / 1 failed**, the single failure being the documented pre-existing `mobile-safari` map bottom-sheet test (proven pre-existing at Phase 2 with auth changes reverted); `apps/web/playwright.config.ts` run (desktop + mobile, the named baseline) = **26 passed / 6 skipped / 0 failed** → map **18/18** ✓ and all non-sending auth tests green at 1280px **and** 375px
- [x] 6.10 AC sweep: map each AC-01…AC-13 to its evidence row (Verification Evidence table); `grep -r "SERVICE_ROLE" apps/web/src` → no hits — grep run 2026-10-10: no matches under `apps/web/src`; the only `SUPABASE_SERVICE_ROLE_KEY` references are Node-side (`apps/web/e2e/helpers/auth-admin.ts`, the spec's skip message, and the phase-5 `_probe*.mjs` scratch scripts). Sweep recorded in the Verification Evidence table below

**Verify (Phase 6):** 6.9 command output + AC sweep recorded.
**Test Procedure:** Playwright desktop + mobile projects both run `auth.spec.ts` (login form must work at 375px too).
**Manual Test:** user runs `pnpm test:e2e` once and watches the auth spec pass; spot-check `/login` on mobile viewport.
**Data Verification:** during spec, `public.users` rows created then cleaned (helper `finally`).
**Errors handled:** skips are explicit and reported, not silent passes.
**Done when:** user confirms all flows + baseline green → phase ✅ VERIFIED → plan complete.
**What's Functional Now:** end-to-end auth shipped. **Ready For:** UPDATE PROCESS (archive plan) / `vc-git-manager` commit checkpoint.

---

## Verification Evidence

| Gate / Scenario | Strategy | Proves SPEC criterion |
|-----------------|----------|----------------------|
| Auth zod schemas: valid pass, invalid reject with Vietnamese messages | Fully-Automated (Vitest, `packages/validators`) | AC-05 |
| UI kit renders with a11y attributes; PasswordInput toggle behavior | Fully-Automated (Vitest + RTL, `packages/ui`) | AC-06 |
| Middleware: unauth → protected path redirects to `/login?next=…` with safe path | Fully-Automated (Vitest, `NextRequest` fixtures, mocked ssr client) | AC-03, AC-11 |
| Middleware: authed → `/login`/`/register` redirects to `/`; authed → protected passes | Fully-Automated (Vitest fixtures) | AC-03 |
| `safeRedirectPath` rejects `//`, `http(s):`, backslashes, encoded variants | Fully-Automated (Vitest table test) | AC-11 |
| AuthProvider: server seed honored, `SIGNED_OUT` clears, `signOut` invokes client | Fully-Automated (Vitest, mocked browser client) | AC-02 |
| Forms: invalid submit → zod messages, no API call; mocked API error → generic Alert | Fully-Automated (Vitest + RTL) | AC-08, AC-09, AC-10 |
| Register → login → logout against real Supabase (desktop + mobile) | Hybrid (Playwright + live project, admin-confirm helper) | AC-01, AC-04, AC-12 |
| Wrong password vs unknown email → identical generic error (live) | Hybrid (Playwright real Supabase) | AC-08 |
| Unknown vs known email forgot-password → byte-identical success copy | Hybrid (Playwright real Supabase) | AC-09 |
| Recovery link → reset password → login with new password | Hybrid (Playwright + `admin.generateLink`, no SMTP needed) | AC-09 |
| OTP full e2e (mailbox-dependent) | Agent-Probe (Playwright, skip-gated `E2E_OTP_MAILBOX`; mocked-client component tests are the always-on proof) | AC-10 |
| Trigger exists; signup creates exactly one `public.users` row with `role='PASSENGER'` | Hybrid (SQL verification + real signup in Phase 5/e2e) | AC-07 |
| Crafted metadata `role: 'ADMIN'` at signUp → DB role still `PASSENGER` | Hybrid (SQL check after crafted signup) | AC-07, R5 |
| Middleware deny-by-default does not break `/map` e2e/PWA assets (matcher review) | Fully-Automated (existing 18 Playwright tests stay green) | AC-12, R8 |
| Full regression: `pnpm typecheck && pnpm test && pnpm test:e2e` ≥ baseline | Fully-Automated (commands) | AC-12 |
| `SERVICE_ROLE_KEY` absent from client sources/bundle; no tokens in logs/URLs | Agent-Probe (grep src + `.next/static` after build; spec hygiene asserts) | AC-13 |

---

## Test Procedure / Post-Phase Testing

- **Per-phase:** every phase lists its exact Vitest command; unit/component tests are written inside the same phase (never deferred wholesale to Phase 6).
- **Runner selection:** follow `process/context/tests/all-tests.md` — Vitest for components/hooks/schemas/middleware logic; Playwright only for real navigation/auth redirects/full flows.
- **Phase 5:** SQL data-verification queries are part of the phase gate (not tests, evidence).
- **Phase 6:** Playwright e2e (`auth.spec.ts`) + full baseline rerun; manual mobile-viewport spot check; user confirmation required before ✅ VERIFIED.
- **Debugging:** jsdom quirks + env notes per `all-tests.md` (`.env.local` values required for live tests; `next/navigation` already mocked in `apps/web/src/test/setup.ts`).

---

## Test Infra Improvement Notes

(none identified yet — placeholder; update during vc-test-coverage-plan / EVL)

Known candidates to evaluate then: package-scoped jsdom config for `packages/ui` (introduced in Phase 1); a shared mocked-supabase factory for component tests if duplication appears in Phase 3; whether `playwright.config.ts` should auto-load `.env.local` for the admin helper instead of helper-side parsing.

---

## Feature Folder & Task Path Convention

Feature folder created per AGENTS.md lifecycle (multi-phase project, 3+ phases):

```
process/features/user-authentication/
  active/auth-flow_05-10-26/auth-flow_PLAN_05-10-26.md   ← this plan (sole artifact so far)
  active/auth-flow_05-10-26/                              ← future reports/refs for this task live HERE
  completed/                                              ← archived after completion
  backlog/                                                ← deferred auth follow-ups
```

Future artifacts for this feature (specs, phase reports, coverage plans, e.g. `auth-flow_SPEC_05-10-26.md`) must colocate in `active/auth-flow_05-10-26/`. Follow-up features (role-based dashboards, `users` RLS read policies) get their own `{slug}_{date}/` task folders here. Routing rule for subagents: `Feature: user-authentication`, `Plans: process/features/user-authentication/active/`.

Note: neither `AGENTS.md` nor `process/context/all-context.md` currently contains a "Current features" list (AGENTS.md references one that does not exist). Per orchestration rules this plan does not invent sections; adding `user-authentication` to a features list is deferred to `vc-update-process-agent`/`vc-audit-context` if the list is ever created.

---

## Resume and Execution Handoff

1. **Selected plan file path:** `process/features/user-authentication/active/auth-flow_05-10-26/auth-flow_PLAN_05-10-26.md`
2. **Last completed phase or step:** Phase 0 re-confirm executed 10-10-26 (0.1/0.2/0.4 done; 0.3 user checklist open — evidence table above). Phase 1 code-complete 10-10-26: 5 UI components + barrel, `auth.ts` 5 schemas + barrel re-export, ui vitest config/setup, 21 schema tests + 16 component tests; `pnpm typecheck` clean, root `pnpm test` = **202 passing (22 files)**, `@bus/validators` = 51 (2 files), `@bus/ui` = 16 (4 files). Phase 1 not yet ✅ VERIFIED (user confirmation pending per Phase Completion Rules). **Phase 2 code-complete 10-10-26:** new `lib/safe-redirect.ts`, `lib/auth/user.ts`, `components/auth/AuthProvider.tsx`, `middleware/__tests__/middleware.test.ts`, `lib/auth/__tests__/{safe-redirect,AuthProvider}` tests; modified `middleware.ts` (deny-by-default allowlist guards + cookie-preserving 302s, matcher untouched), `app/layout.tsx` (async `getUser()` seed), `app/providers.tsx` (nested `AuthProvider`), `test/setup.ts` (window guard for node-env tests); plus cross-phase fix: validators ESM cycle broken by extracting atoms to `packages/validators/src/atomic.ts` (Phase 1's `auth.ts → ./index` import crashed webpack SSR — `/map` 500 — while vitest masked it). Verification: `pnpm typecheck` clean; root `pnpm test` = **256 passing (25 files)** (+22 safe-redirect, +27 middleware, +5 AuthProvider); `pnpm test:e2e` baseline 2 chromium projects = **18/18 green**, full 3-project run = 26/27 with 1 failure (`[mobile-safari] shows the bus list sidebar…` — WebKit marker "outside of viewport"; PROVEN pre-existing: fails identically with Phase 2 changes reverted, and mobile-safari was never part of the recorded 18-test baseline). Manual probe: `/settings` → `302 /login?next=%2Fsettings`; `/map` → 200; `/login` → 404 (page is Phase 3). Phase 2 not yet ✅ VERIFIED (user confirmation pending). **Phase 3 code-complete 10-10-26 (this run):** new `lib/auth/auth-errors.ts`, `app/(auth)/layout.tsx`, 5 pages + 5 forms under `app/(auth)/` (`login`, `register`, `forgot-password`, `reset-password`, `verify-otp`), `app/auth/callback/route.ts`; 8 new test files (`auth-errors`, `(auth)/layout`, `LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `VerifyOtpForm`, `callback/route`). No changes to `middleware.ts` (allowlist already covered all 6 Phase 3 routes), `page.tsx` (home links resolve), `providers.tsx`, or any Phase 1/2 file. Design notes: OTP send is an explicit "Gửi mã OTP" button (no auto-send on mount — avoids mail-flood-on-load abuse vector; server rate limit stays the backstop per R3); register resend cooldown starts at 60s on entering the confirmation state; reset-password session presence checked with browser `getUser()` (never `getSession()`, per R7). Verification: `pnpm typecheck` clean; root `pnpm test` = **305 passing (33 files)** (+49 over the 256/25 baseline: +7 auth-errors, +1 layout, +9 LoginForm, +7 RegisterForm, +5 ForgotPassword, +6 ResetPassword, +7 VerifyOtp, +7 callback route); e2e baseline via `apps/web/playwright.config.ts` (2 Chromium projects) = **18/18 green**; root 3-project config = 26 passed + 1 pre-existing `mobile-safari` bottom-sheet failure (unchanged, previously proven pre-existing with Phase 2 reverted); `grep -r SERVICE_ROLE apps/web/src` → no hits; dev-server probe: all 5 auth pages 200 (incl. `/verify-otp?email=…`), `/map` 200, unauth `/settings` → `302 /login?next=%2Fsettings`, `/auth/callback` (no/fake params) → `302 /login?error=1`. Phase 3 not yet ✅ VERIFIED (manual five-flow user test per plan still pending).
3. **Validate-contract status:** pending — `## Validate Contract` placeholder below; vc-validate-agent must fill it before EXECUTE.
4. **Supporting context files loaded:**
   - `process/context/all-context.md` — architecture, stack, patterns, env-var names, import aliases
   - `process/context/tests/all-tests.md` — runner selection, commands, debugging quirks
   - `.claude/skills/vc-generate-plan/SKILL.md` + `references/example-complex-prd.md` — plan contract (COMPLEX format)
   - Key source files read at PLAN time: `apps/web/src/middleware.ts`, `layout.tsx`, `providers.tsx`, `page.tsx`, `lib/supabase/{client,server}.ts`, `packages/db/prisma/schema.prisma`, `packages/validators/src/index.ts`, `packages/ui/src/components/{button,input}.tsx`, `apps/web/playwright.config.ts`, `apps/web/e2e/map.spec.ts`, `vitest.config.mts`, `apps/web/vitest.config.mjs`, `pnpm-lock.yaml`
   - Baseline: `pnpm typecheck` clean; `pnpm test` = 135 passing (16 files); `pnpm test:e2e` = 18 passing (2 projects × 9)
5. **Next step for a fresh agent:** Run `vc-validate-agent` to fill `## Validate Contract`, then reply **`ENTER EXECUTE MODE`**. EXECUTE starts with Phase 0 (probe re-confirm + dashboard checklist), and each phase pauses for approval per Phased Execution Workflow — do not bundle research and implementation.

### Phase 0 re-confirmation evidence (EXECUTE run, 10-10-26, read-only via existing Prisma client + `.env.local`)

| # | Probe | Result (10-10-26) | Drift vs PLAN-time? |
|---|---|---|---|
| P1 | `public.users` columns + constraints | `id text PK`, `supabase_id text UNIQUE NOT NULL`, `email/phone UNIQUE nullable`, `full_name`, `avatar_url`, `created_at default now()`, `updated_at`, `role "Role" default 'PASSENGER'` — constraints: `users_pkey`, `users_supabase_id_key`, `users_email_key`, `users_phone_key` | none |
| P2 | non-internal triggers on `auth.users` + `handle_new_user` in `pg_proc` | `[]` / `[]` — no trigger, no function | none |
| P3 | `pnpm-lock.yaml` versions | `@supabase/ssr@0.5.2`, `@supabase/supabase-js@2.117.2` | none |
| P4 | RLS + policies on `public.users` | `relrowsecurity = true`, zero policies | none |
| P5 | `has_table_privilege(current_user,'auth.users','TRIGGER'/'INSERT')` | `true` / `true`; role `postgres`, `rolsuper=false`, `rolbypassrls=true` | none |
| P6 | `GET /auth/v1/settings` (anon key) | HTTP 200, `mailer_autoconfirm: false` | none |
| P7 | `select count(*) from auth.users` | `0` | none |
| P8 | `prisma_migrations` / `supabase/` dir | 0 rows / dir absent | none |

Checklist status: all 6 out-of-code dashboard items **still unchecked — user actions**, deferred per execute-chunk scope.

Baseline note: PLAN-time recorded `pnpm test` = 135 passing (16 files); observed at EXECUTE start = **165 passing (17 files)** — baseline grew (additional tests landed between PLAN and EXECUTE); `pnpm typecheck` clean. New work must keep ≥165 passing.

### Phase 4 + Phase 5 execution evidence (EXECUTE chunk, 10-10-26)

**Phase 4 (code-complete):**
- New: `apps/web/src/components/auth/UserMenu.tsx`, `apps/web/src/components/auth/__tests__/UserMenu.test.tsx` (11 tests)
- Modified: `apps/web/src/app/page.tsx` (static auth links div replaced with `<UserMenu />`, import added; nav links untouched)
- Verification: `pnpm typecheck` clean; `pnpm test` = **316 passing (34 files)** (baseline 305/33 → +11); `pnpm --filter bus-transport-system-web test:e2e` = **18/18 green** (2-chromium baseline config — home header changed, no visual/behavioral regression for signed-out state); root 3-project run = 26/27 with the ONE failure being the pre-existing `[mobile-safari] shows the bus list sidebar…` WebKit/viewport marker issue already proven pre-existing at Phase 2 (identical with changes reverted; mobile-safari is not in the recorded 18-test baseline)
- `pnpm lint` NOT runnable: pre-existing condition — `apps/web` has no ESLint config, `next lint` prompts interactively (unrelated to this change; not in this chunk's required gates)

**Phase 5 (trigger applied to LIVE DB):**
- File: `supabase/migrations/20261010143700_handle_new_user.sql`
- Re-run probes (read-only) before apply: `pg_trigger` on `auth.users` → `[]`; `pg_proc handle_new_user` → `[]`; role `postgres`, TRIGGER=`true`, INSERT=`true`; `auth.users`=0, `public.users`=0
- Apply #1 (`prisma db execute`, `DATABASE_URL`+`DIRECT_URL` exported from `apps/web/.env.local`) → `Script executed successfully.`; Apply #2 (same file) → `Script executed successfully.` — idempotency proven
- Post-apply verification query outputs:
  - trigger: `[{"tgname":"on_auth_user_created"}]`
  - function: `{"proname":"handle_new_user","security_definer":true,"lanname":"plpgsql"}`
  - definition: `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()`
  - EXECUTE ACL: `{"anon_execute":false,"authenticated_execute":false,"postgres_execute":true}`
- Deviation (recorded, security-hardening): `revoke execute … from public, anon, authenticated;` added — orchestrator constraint "NEVER grant client access"; EXECUTE is checked at CREATE TRIGGER time only (not fire time), so the trigger still fires; owner retains EXECUTE
- 5.6/5.7 deferred: need a real signup (both tables 0 rows, no Phase 3 test user); reserved for Phase 6 `auth.spec.ts` register flow per Execution Brief; this chunk verified via `select` metadata only (no ad-hoc INSERT without rollback, per execute scope) — **SUPERSEDED: 5.6/5.7 closed by the Phase 6 register e2e, see Phase 6 finalization below**

### Phase 6 finalization evidence (EXECUTE continuation chunk, 11-10-26)

Continuation session verified the shipped `e2e/helpers/auth-admin.ts` + `e2e/auth.spec.ts` against the plan's Phase 6 contract (no code changes needed — both files already matched 6.1-6.10):

- `pnpm typecheck` (root) — **clean**
- `pnpm test` (root) — **316 passed / 34 files** (baseline held)
- `pnpm --filter bus-transport-system-web exec playwright test e2e/auth.spec.ts` (desktop + mobile chromium) — **8 passed / 6 skipped / 0 failed**: all non-sending auth tests green at 1280px and 375px (login/logout/menu, wrong-password generic copy, middleware public/protected matrix, unsafe `?next=` fallback); skips = register + forgot (Supabase 2-emails/hour quota → HTTP 429 → explicit `QUOTA_SKIP_REASON`, per plan degradation design) × 2 projects, OTP mailbox-gated × 2, send-budget desktop-only guard × 2
- `pnpm --filter bus-transport-system-web test:e2e` (full 18-baseline + auth) — map **18/18** + auth 8/6/0; one desktop-chromium map cold-load flake (`canvas.mapboxgl-canvas` timeout under 2-worker dev-compile contention) recovered **9/9 on scoped rerun** — flake, not a regression (map untouched by auth work)
- 6.4 quota path re-verified live 2026-10-11: unknown-email round returned 200, known-email round hit `recover` 429 → `QuotaExhaustedError` → explicit skip (never a red suite)
- 5.6/5.7: register test run this session was quota-skipped (signup 429), so the authoritative evidence remains the 2026-10-10 full-pass run quoted in the Phase 5 checkbox lines (`[5.6]` one `public.users` row `role=PASSENGER`; `[5.7]` metadata `role=ADMIN` arrived, DB role stayed `PASSENGER`) — spec code re-verified intact, will re-emit evidence lines whenever a send slot is available
- No app-source changes; no Playwright config changes; helper cleanup (`finally` + `afterAll`) confirmed present and exercised

**Remaining open items (all phases):** 0.3 Supabase dashboard checklist (6 items — user action, out of code); ✅ VERIFIED user-confirmation gates for Phases 1-6 (user must walk the Manual Test steps); `E2E_OTP_MAILBOX` unset → OTP full e2e stays explicit-skip (component tests carry the always-on proof); pre-existing repo-root 3-project `mobile-safari` map failure (documented at Phase 2, outside the 18-test baseline); `pnpm lint` not runnable (apps/web has no ESLint config — pre-existing). **Next valid states:** user confirmation → UPDATE PROCESS (archive plan) and/or `vc-git-manager` commit checkpoint.

### Final orchestrator verification (11-10-26)

- `apps/web/tsconfig.json`: `strict: false` → **`true`** (deviation, orchestrator fix). Root cause: with `strictNullChecks` off, TS evaluates `undefined extends string` as `true`, so zod's inferred `loginSchema` output degraded to `{ email?: string; password?: string }` → `signInWithPassword(parsed.data)` failed TS2345 in `LoginForm.tsx:49`. Earlier "typecheck clean" reports ran from the repo root (root tsconfig was already `strict: true`) and masked the apps/web project config. With `strict: true`: `pnpm typecheck` clean at **both** root and `apps/web` (fresh `tsbuildinfo`).
- Full gates re-run after the fix: root `pnpm test` = **316 passed (34 files)**; `npx playwright test` (`apps/web`) = **26 passed / 6 skipped / 0 failed** (18 map baseline + 8 auth; 6 skips = quota/OTP-mailbox gates by design).
- All 64 code checkboxes ticked except the 6 out-of-code dashboard items (0.3, user actions).

---

## Validate Contract

(placeholder — vc-validate-agent writes this section before EXECUTE)

---

## Next Instruction

**Run validation:**
```bash
vc-validate-agent
```

If validation passes, proceed to execution:
```bash
ENTER EXECUTE MODE
```
