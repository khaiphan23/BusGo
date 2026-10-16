---
date: 05-10-26
status: COMPLETED
complexity: COMPLEX
target: bus-transport-system
---

# Real-time Bus Tracking Map — Implementation Plan

**Date** 05-10-26  
**Status** COMPLETED (archived 16-10-26 — all Phases 1-5 CODE DONE + VERIFIED, see §9 handoff)
**Complexity** COMPLEX  
**Target** `bus-transport-system` monorepo

---

## TL;DR

Build a real-time bus tracking map page (`/map`) using Mapbox GL JS + Supabase Realtime. Display live bus positions from the `buses` table, update markers every few seconds via PostGIS geospatial queries. Foundation for all subsequent map-dependent features (booking, route finding).

---

## 1. Context and Goals

This plan implements the core real-time bus tracking feature for the BusGo application. The feature enables passengers to view live bus positions on an interactive map, providing the foundation for all map-dependent features (seat booking, route finding, etc.).

### Acceptance Criteria

1. **Map loads** — `/map` page renders Mapbox GL JS map centered on Vietnam
2. **Real-time markers** — Bus markers appear and update position via Supabase Realtime
3. **Bus info popup** — Clicking a marker shows license plate, route, occupancy, heading
4. **Performance** — Marker updates debounced to 500ms, no UI jank
5. **Responsive** — Works on mobile (full-screen map) and desktop
6. **Offline-ready** — Map tiles cached via service worker
7. **Accessible** — ARIA labels, keyboard navigation, color contrast

---

## 2. Problem & Scope

### Problem
Users need to see live bus positions on a map to know when/where to catch their bus. Current homepage has no map functionality.

### Scope (IN)
- `/map` page with Mapbox GL JS map centered on Vietnam
- Real-time bus markers from `buses` table via Supabase Realtime
- Bus info popup on marker click (license plate, route, occupancy, heading)
- Auto-refresh positions every 5-10 seconds
- Loading/error states, responsive design (mobile-first PWA)
- PostGIS-powered "nearby buses" query for future use

### Scope (OUT)
- Seat booking UI (separate feature)
- Route path rendering (separate feature)
- User location / geolocation (separate feature)
- Historical position playback (separate feature)
- Driver/admin views (separate feature)

---

## 3. Architecture & Data Flow

```
┌─────────────┐     Supabase Realtime      ┌──────────────────┐
│  PostgreSQL │ ─────────────────────────▶ │  Mapbox GL JS    │
│  (buses)    │   INSERT/UPDATE on buses   │  (React Component)│
└─────────────┘   channel: 'buses:*'       └──────────────────┘
       │                                        │
       │ PostGIS query                          │ User clicks
       ▼                                        ▼
┌─────────────┐                         ┌──────────────────┐
│  Prisma     │                         │  Popup: Bus Info │
│  Client     │                         │  (license, route,│
└─────────────┘                         │   occupancy)     │
                                        └──────────────────┘
```

### Key Technical Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Map library | Mapbox GL JS | Vector tiles, smooth animations, good React integration |
| Real-time | Supabase Realtime | Native Postgres changes → WebSocket, no extra infra |
| Position updates | Client subscribes to `buses` channel | Simpler than server-push; Supabase handles scaling |
| Marker updates | Debounced (500ms) batch updates | Avoid marker flicker on rapid updates |
| Initial load | `prisma.bus.findMany()` + `ST_DWithin` for viewport | Single query, leverage PostGIS index |

---

## Touchpoints

### New Files
| Path | Purpose |
|------|---------|
| `apps/web/src/app/map/page.tsx` | Main map page (Server Component) |
| `apps/web/src/app/map/_components/BusMap.tsx` | Mapbox map client component |
| `apps/web/src/app/map/_components/BusMarker.tsx` | Individual bus marker with popup |
| `apps/web/src/app/map/_components/BusInfoPopup.tsx` | Popup content component |
| `apps/web/src/lib/mapbox.ts` | Mapbox init/config utilities |
| `apps/web/src/hooks/useBusRealtime.ts` | Supabase Realtime subscription hook |
| `apps/web/src/hooks/useBusPositions.ts` | Bus position state + queries |
| `apps/web/src/components/map/MapContainer.tsx` | Reusable map wrapper (in `packages/ui` later) |
| `apps/web/src/types/bus.ts` | TypeScript types for bus data |

### Modified Files
| Path | Change |
|------|--------|
| `packages/db/prisma/schema.prisma` | Add PostGIS index hint (already present), verify `buses` table |
| `apps/web/src/lib/supabase/client.ts` | Ensure Realtime client config |
| `apps/web/tailwind.config.ts` | Add Mapbox-specific utilities if needed |

### Packages Touched
- `apps/web` — all new UI code
- `packages/db` — schema verification only
- `packages/ui` — potential MapContainer extraction (deferred)
- `packages/validators` — Zod schemas for bus position data

---

## Public Contracts

### API / Data Contracts
```typescript
// apps/web/src/types/bus.ts
interface BusPosition {
  id: string;
  licensePlate: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'OFFLINE';
  route: {
    id: string;
    name: string;
    code: string;
    color: string;
  };
  capacity: number;
  currentOccupancy: number; // computed from slots
  updatedAt: string; // ISO string
}

interface BusRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: BusPosition;
  old: BusPosition | null;
}
```

### Supabase Realtime Channel
```typescript
// Channel: 'public:buses'
// Filter: status = 'ACTIVE'
// Events: INSERT, UPDATE, DELETE
```

### Mapbox Configuration
```typescript
// Map style: 'mapbox://styles/mapbox/streets-v12' or custom
// Center: [105.8342, 21.0285] (Hanoi) or dynamic from user location
// Zoom: 12-14 default
// Token: NEXT_PUBLIC_MAPBOX_TOKEN (required)
```

---

## Blast Radius

| Dimension | Assessment |
|-----------|------------|
| **Files created** | ~10 new files |
| **Files modified** | ~3 existing files |
| **Packages affected** | `apps/web` (primary), `packages/db` (read-only), `packages/validators` (new schemas) |
| **Risk class** | **MEDIUM** — Mapbox token exposure (client-side), Realtime connection management, mobile performance |
| **Rollback** | Feature flag `/map` route; remove page.tsx to disable |
| **Dependencies** | Mapbox GL JS (~500KB gzipped), `@supabase/supabase-js` (already in deps) |

### Risk Mitigation
- Mapbox token: Use public token with URL restrictions (Supabase Dashboard → Auth → URL Configuration)
- Realtime: Handle connection drops gracefully, show "live" indicator
- Performance: Debounce marker updates, use `requestAnimationFrame`, lazy-load map on viewport enter

---

## Implementation Checklist / Phased Delivery Plan

### Phase 1: Foundation (Day 1)
- [x] 1.1 Create TypeScript types (`apps/web/src/types/bus.ts`)
- [x] 1.2 Add Zod validators for bus position (`packages/validators/src/bus.ts`)
- [x] 1.3 Create Mapbox config utility (`apps/web/src/lib/mapbox.ts`)
- [x] 1.4 Verify Prisma schema has correct indexes on `buses` table

### Phase 2: Real-time Hook (Day 1-2)
- [x] 2.1 Create `useBusRealtime` hook with Supabase channel subscription
- [x] 2.2 Create `useBusPositions` hook for state management (Zustand + React Query)
- [x] 2.2.1 Initial fetch via Prisma
- [x] 2.2.2 Realtime merge strategy (upsert by bus ID)
- [x] 2.2.3 Debounced position updates (500ms)
- [x] 2.3 Unit tests for hooks (Vitest)

### Phase 3: Map Components (Day 2-3)
- [x] 3.1 Create `MapContainer` wrapper (loads Mapbox GL JS dynamically)
- [x] 3.2 Create `BusMap` main component (viewport, controls, event handlers)
- [x] 3.3 Create `BusMarker` with custom icon (route color, occupancy indicator)
- [x] 3.4 Create `BusInfoPopup` (license plate, route, occupancy %, heading)
- [x] 3.5 Handle marker clustering at low zoom (Mapbox cluster source)
- [x] 3.6 Component tests (Vitest + React Testing Library)

### Phase 4: Page Integration (Day 3)
- [x] 4.1 Create `/map/page.tsx` (Server Component with Suspense)
- [x] 4.2 Wire hooks → components
- [x] 4.3 Add loading skeleton, error boundary, "live" indicator
- [x] 4.4 Responsive layout (mobile: full-screen map, bottom sheet for details)

### Phase 5: Polish & Verification (Day 4)
- [x] 5.1 Mapbox token validation + fallback UI
- [x] 5.2 PWA offline: cache map tiles (service worker strategy)
- [x] 5.3 E2E test: map loads, markers appear, realtime updates work (Playwright)
- [x] 5.4 Performance: Lighthouse CI, marker update FPS
- [x] 5.5 Accessibility: ARIA labels, keyboard nav, color contrast

---

## Phase Completion Rules

- Each phase is **CODE DONE** when all checkboxes are ticked
- Each phase is **VERIFIED** when all verification gates for that phase pass
- Do not start next phase until current phase is VERIFIED
- Run `vc-test-coverage-plan` after Phase 3 to ensure test coverage

---

## Verification Evidence

| Gate / Scenario | Strategy | Proves SPEC Criterion |
|-----------------|----------|----------------------|
| Map renders without errors | **Fully-Automated** (Vitest + JSDOM mock) | Map component mounts |
| Initial bus load from DB | **Fully-Automated** (Vitest + MSW mock Prisma) | `useBusPositions` returns data |
| Realtime UPDATE merges correctly | **Hybrid** (Vitest + Supabase local emulator) | Marker position updates |
| Realtime DELETE removes marker | **Hybrid** (Vitest + Supabase local emulator) | Marker removed from map |
| Mapbox token missing → error UI | **Fully-Automated** (Vitest) | Graceful degradation |
| Mobile viewport: map fills screen | **Agent-Probe** (Playwright mobile) | Responsive design |
| Marker click → popup opens | **Fully-Automated** (Vitest + RTL) | Interaction works |
| Debounced updates (5 rapid → 1 render) | **Fully-Automated** (Vitest fake timers) | Performance |
| Offline: cached map works | **Agent-Probe** (Playwright offline) | PWA requirement |

---

## Test Procedure / Post-Phase Testing

- **Phase 1-2:** Unit tests for hooks and types (Vitest)
- **Phase 3:** Component tests for map components (Vitest + React Testing Library)
- **Phase 4:** Integration tests for page rendering (Vitest)
- **Phase 5:** E2E tests (Playwright), manual testing on mobile/desktop, performance profiling

---

## 9. Resume and Execution Handoff

1. **Selected plan file:** `process/general-plans/active/bus-realtime-map_05-10-26/bus-realtime-map_PLAN_05-10-26.md`
2. **Last completed phase:** Phase 5 — ALL PHASES COMPLETE (CODE DONE + VERIFIED)
3. **Validation evidence:**
   - `pnpm typecheck` — clean
   - `pnpm test` (Vitest) — 135/135 passing (16 files), includes axe a11y audits and marker perf budget
   - `pnpm test:e2e` (Playwright) — 18/18 passing (9 desktop + 9 mobile Chromium): map load, markers, realtime INSERT push, keyboard activation, sidebar/bottom-sheet responsive layout, console-error hygiene, 100-marker <16ms budget
4. **Execution deviations from plan:**
   - Context source during execution: `process/context/all-context.md` (architecture, stack, patterns) and `process/context/tests/all-tests.md` (test commands)
   - `useBusRealtime` is mounted only in `BusMap` (not `MapPageClient`) — Supabase `channel()` returns the existing joined channel for a duplicate topic and `.on('postgres_changes')` throws after subscribe; store is shared Zustand so a single subscription feeds all consumers
   - `playwright.config.ts` created (was missing) with desktop + mobile projects, Mapbox token env injection, and stub-friendly web server on port 3100
   - Marker update path skips identical innerHTML writes (`lastRender` WeakMap) — keeps the 500ms debounced update cheap (5.4)
   - tsconfig `types` gained `"geojson"` so mapbox-gl's `GeoJSON.Feature` resolves
5. **Next step for fresh agent:**
   - Ready for `ENTER UPDATE PROCESS MODE` (archive plan, capture learnings) or commit checkpoint via `vc-git-manager`

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

Or use fast mode for compressed workflow:
```bash
ENTER FAST MODE - real-time bus map with Mapbox
```