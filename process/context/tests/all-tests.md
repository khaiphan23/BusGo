# bus-transport-system - All Tests

Last updated: (auto-generated)

Attach this file first when the task involves testing, verification, or test debugging.

This is the fast operator guide for the testing surface:

- which runner to use
- what command to start with
- how to quickly debug common failures
- which deeper file to read next

Do not load the whole `process/context/tests/` folder by default. Start here, then drill down.

---

## How This File Works

This is the `all-tests.md` entrypoint for the `tests/` context group. It follows the `all-*.md` routing convention:

1. Agents read `all-context.md` first and get routed here for testing tasks
2. This file gives quick decision rules and commands
3. For deeper details, agents follow the routing table below to specific docs

As the project grows, add deeper docs to this group (e.g., `e2e-tests.md`, `debugging-and-pitfalls.md`) and add routing entries below. This file stays the fast-start entrypoint.

---

## What This Covers

- test runner selection
- quick commands by package
- fast debugging procedures
- current testing gaps worth remembering

## Read This When

Use this file when you need to:

- run tests after implementation
- decide between test runners
- debug failing tests

## Quick Routing

| If you need... | Read next |
|---|---|
| commands and scripts by package | this file (Commands section) |
| Playwright setup, auth flow, and current specs | (future: `e2e-tests.md`) |
| failing-test triage and runtime debugging | (future: `debugging-and-pitfalls.md`) |
| known gaps and future test-system fixes | this file (Known Gaps section) |

(No deeper test docs yet. Add routing entries here as they are created.)

## Quick Decision Guide

### Use `vitest` when

- the change is in React components, hooks, stores (Zustand), or utility functions
- the change is in shared packages (`packages/ui`, `packages/validators`, `packages/db`)
- unit/integration testing with jsdom environment

### Use Playwright when

- the behavior depends on real navigation, auth redirects, rendering, or full-stack browser flows
- testing real-time features (Supabase Realtime subscriptions)
- testing map interactions (Mapbox GL JS)
- testing PWA offline behavior
- testing geospatial queries through the UI

## Default Verification Order

Unless the task clearly needs a different path:

1. run the narrowest existing automated test
2. use unit/integration tests before browser tests
3. use end-to-end tests only when the real UI is the thing being verified

## Commands

```bash
# Unit/Integration tests (Vitest)
pnpm test              # run all tests
pnpm test -- --watch   # watch mode
pnpm test -- path/to/file.test.ts  # single file
pnpm test:ui           # vitest UI

# E2E tests (Playwright)
pnpm test:e2e          # run all e2e tests
pnpm test:e2e -- --headed  # headed mode
pnpm test:e2e -- --project=chromium  # specific browser

# Typecheck
pnpm typecheck         # all packages

# Lint
pnpm lint              # all packages
pnpm lint:fix          # auto-fix
```

| Package | Runner | Command | Notes |
|---|---|---|---|
| `apps/web` | vitest | `pnpm test` | jsdom environment, React Testing Library |
| `packages/db` | vitest | `pnpm test` | needs Supabase local/test DB |
| `packages/ui` | vitest | `pnpm test` | component tests |
| `packages/validators` | vitest | `pnpm test` | Zod schema tests |
| `apps/web` (e2e) | Playwright | `pnpm test:e2e` | needs dev server running on port 3000 |

## Debugging Quick Reference

- **jsdom quirks:** `apps/web` uses jsdom -- Canvas/Image APIs unavailable, mock them in test setup. Mapbox GL JS requires mocking.
- **env files:** Tests require `.env.test` with Supabase test project credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`)
- **database state:** Supabase local development (`supabase start`) or test project. Prisma migrations applied before tests.
- **auth mocking:** Supabase Auth mocked via `@supabase/supabase-js` mock or test user tokens.
- **realtime mocking:** Supabase Realtime channels mocked in unit tests; E2E tests use real Supabase Realtime.
- **port conflicts:** dev server must be stopped before running e2e tests (both use port 3000). Playwright config handles this.
- **map mocking:** Mapbox GL JS mocked in unit tests with `vi.mock('mapbox-gl')`.
- **PWA/service worker:** Service worker registration mocked in unit tests; tested in E2E.

## Known Gaps

- No tests exist yet (fresh project)
- Supabase local development setup needed for integration tests
- Real-time subscription testing patterns not established
- Mapbox GL JS interaction testing not established
- PWA offline behavior testing not established
- Geospatial query testing not established
- VNeID/CCCD API integration testing not established (future)
