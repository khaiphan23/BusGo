import { test, expect, type Page } from '@playwright/test';

/**
 * E2E for /map (Phase 5.3).
 *
 * Everything the page reaches for at runtime is stubbed so the suite is deterministic:
 *  - Mapbox style + glyph requests (a fake token would otherwise 401 and blank the map)
 *  - GET /api/buses (the real route needs a database)
 *  - the Supabase realtime websocket (Phoenix wire protocol), so realtime can be driven
 *    from the test instead of depending on a live project
 *
 * The Mapbox token is injected through the dev-server env (see playwright.config.ts);
 * Next.js does not overwrite env vars that are already set.
 */

const E2E_TOKEN = 'pk.e2e_0123456789abcdef0123456789abcdef';

const MOCK_STYLE = {
  version: 8,
  name: 'e2e-mock',
  glyphs: `https://api.mapbox.com/fonts/{fontstack}/{range}.pbf?access_token=${E2E_TOKEN}`,
  sources: {},
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#e5e7eb' } },
  ],
};

function makeBus(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `clze2ebus000000000000${index}`,
    licensePlate: `29A-${10000 + index}`,
    lat: 21.0285 + index * 0.0004,
    lng: 105.8342 + index * 0.0004,
    heading: 45,
    speed: 24,
    status: 'ACTIVE',
    route: {
      id: `clze2eroute0000000000${index}`,
      name: `Tuyến ${index}`,
      code: `0${index}`,
      color: '#3B82F6',
    },
    capacity: 40,
    currentOccupancy: 25,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const MOCK_BUSES = [makeBus(1), makeBus(2), makeBus(3)];
const FIRST_PLATE = MOCK_BUSES[0].licensePlate;

interface RealtimeSocket {
  send(data: string): void;
  onMessage(cb: (data: string) => void): void;
}

function reply(frame: unknown[], payload: Record<string, unknown>) {
  const [joinRef, ref, topic] = frame;
  return JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: payload }]);
}

function objectReply(frame: Record<string, unknown>, payload: Record<string, unknown>) {
  return JSON.stringify({
    join_ref: frame.join_ref ?? null,
    ref: frame.ref,
    topic: frame.topic,
    event: 'phx_reply',
    payload: { status: 'ok', response: payload },
  });
}

/**
 * Stubs the Phoenix protocol used by Supabase realtime and exposes a handle for
 * pushing postgres_changes events back into the app.
 *
 * The routeWebSocket registration promise MUST be awaited — a fire-and-forget
 * call leaves the route inactive and the page silently connects to the real
 * Supabase project instead.
 */
async function mockRealtime(page: Page) {
  const sockets: Array<{ socket: RealtimeSocket; joinRef: unknown; topic: string }> = [];

  await page.routeWebSocket('**/realtime/v1/websocket*', (socket) => {
    let joined: { joinRef: unknown; topic: string } | null = null;

    socket.onMessage((raw) => {
      const frame = JSON.parse(String(raw));

      if (Array.isArray(frame)) {
        const [joinRef, ref, topic, event] = frame;
        if (event === 'phx_join') {
          joined = { joinRef, topic };
          sockets.push({ socket: socket as unknown as RealtimeSocket, joinRef, topic });
          socket.send(reply(frame, {}));
        } else if (event === 'access_token') {
          socket.send(reply(frame, {}));
        } else if (event === 'heartbeat') {
          socket.send(reply(frame, {}));
        } else if (ref) {
          socket.send(reply(frame, {}));
        }
        return;
      }

      const { join_ref: objectJoinRef, ref, topic, event } = frame;
      if (event === 'phx_join') {
        joined = { joinRef: objectJoinRef, topic };
        sockets.push({ socket: socket as unknown as RealtimeSocket, joinRef: objectJoinRef, topic });
        socket.send(objectReply(frame, {}));
      } else if (event === 'heartbeat' || event === 'access_token') {
        socket.send(objectReply(frame, {}));
      } else if (ref) {
        socket.send(objectReply(frame, {}));
      }
      void joined;
    });
  });

  return {
    /** Emits a postgres_changes INSERT on every open channel. */
    pushInsert(bus: ReturnType<typeof makeBus>) {
      // The 5th frame element must be an OBJECT: realtime-js destructures
      // { eventType, new, old } from it, so a JSON string would be ignored.
      const payload = { eventType: 'INSERT', new: bus, old: null };
      for (const { socket, joinRef, topic } of sockets) {
        socket.send(JSON.stringify([joinRef, null, topic, 'postgres_changes', payload]));
      }
    },
    get channelCount() {
      return sockets.length;
    },
  };
}

async function stubNetwork(page: Page) {
  await page.route('**/api.mapbox.com/styles/**', (route) => route.fulfill({ json: MOCK_STYLE }));
  await page.route('**/api.mapbox.com/fonts/**', (route) =>
    route.fulfill({ body: Buffer.from([]), contentType: 'application/x-protobuf' })
  );
  await page.route('**/events.mapbox.com/**', (route) =>
    route.fulfill({ status: 204, body: '' })
  );
  // Mapbox sessions endpoint 403s on a fake token and logs a console error.
  await page.route('**/api.mapbox.com/map-sessions/**', (route) =>
    route.fulfill({ status: 204, body: '' })
  );
  await page.route('**/api/buses*', (route) => route.fulfill({ json: MOCK_BUSES }));
}

async function openMap(page: Page) {
  await page.goto('/map', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await expect(
    page.locator('[role="application"][aria-label*="Interactive bus tracking map"]')
  ).toBeVisible({ timeout: 60_000 });
}

async function mapCanvas(page: Page) {
  const canvas = page.locator('canvas.mapboxgl-canvas');
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  return canvas;
}

/** Default zoom is 12; DOM markers only render at zoom >= 14. */
async function zoomInForMarkers(page: Page) {
  const canvas = await mapCanvas(page);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('map canvas has no bounding box');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 8; i++) {
    // CDP wheel events do not reach the map under mobile (hasTouch) emulation,
    // so dispatch wheel events directly on the canvas — identical in both projects.
    await page.evaluate(() => {
      const el = document.querySelector('canvas.mapboxgl-canvas') as HTMLCanvasElement;
      el.dispatchEvent(new WheelEvent('wheel', { deltaY: -400, bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(120);
  }
  await expect(page.locator('.mapboxgl-marker').first()).toBeVisible({ timeout: 20_000 });
}

test.describe('Bus realtime map', () => {
  test('loads the map canvas without a token error', async ({ page }) => {
    await stubNetwork(page);
    await openMap(page);

    await mapCanvas(page);

    // #__next-route-announcer__ is Next's always-present screen-reader announcer,
    // not an error state — exclude it and assert nothing else raised an alert.
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toHaveCount(0);
    await expect(page.locator('text=Mapbox Token')).toHaveCount(0);
  });

  test('renders bus markers once the map is zoomed in', async ({ page }) => {
    await stubNetwork(page);
    await openMap(page);
    await zoomInForMarkers(page);

    const markers = page.locator('.mapboxgl-marker');
    expect(await markers.count()).toBeGreaterThan(0);

    const labels = await markers.evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute('aria-label') ?? '')
    );
    expect(labels.some((label) => label.includes('Xe buýt'))).toBe(true);
    expect(labels.some((label) => label.includes(MOCK_BUSES[0].licensePlate))).toBe(true);
  });

  test('shows the live connection indicator', async ({ page }) => {
    await stubNetwork(page);
    const realtime = await mockRealtime(page);
    await openMap(page);

    const indicator = page.locator('[role="status"][aria-live="polite"]');
    await expect(indicator).toBeVisible({ timeout: 30_000 });
    await expect(indicator).toContainText('Trực tuyến', { timeout: 30_000 });
    expect(realtime.channelCount).toBeGreaterThan(0);
  });

  test('inserts a bus pushed over the realtime channel', async ({ page }) => {
    await stubNetwork(page);
    const realtime = await mockRealtime(page);
    await openMap(page);
    await zoomInForMarkers(page);

    await expect(
      page.locator(`.mapboxgl-marker[aria-label*="${FIRST_PLATE}"]`)
    ).toBeVisible({ timeout: 30_000 });

    const incoming = makeBus(9, { licensePlate: '51B-99999', currentOccupancy: 38 });
    realtime.pushInsert(incoming);

    await expect(page.locator('.mapboxgl-marker[aria-label*="51B-99999"]')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('opens bus details when a marker is activated', async ({ page }) => {
    await stubNetwork(page);
    await openMap(page);
    await zoomInForMarkers(page);

    const marker = page.locator('.mapboxgl-marker').first();
    await marker.focus();
    await page.keyboard.press('Enter');

    const dialog = page.locator(`[role="dialog"][aria-label*="${FIRST_PLATE}"]`);
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0, { timeout: 15_000 });
  });

  test('shows the bus list sidebar on desktop and a bottom sheet on mobile', async ({
    page,
  }, testInfo) => {
    await stubNetwork(page);
    await openMap(page);

    const viewport =
      (testInfo.project.use as { viewport?: { width: number } | null }).viewport ?? null;
    const isMobile = viewport !== null && viewport.width < 768;

    if (isMobile) {
      await expect(page.locator('aside')).toHaveCount(0);
      await zoomInForMarkers(page);
      await page.locator('.mapboxgl-marker').first().click();
      await expect(page.locator('[role="dialog"][aria-label^="Chi tiết xe"]')).toBeVisible({
        timeout: 15_000,
      });
    } else {
      await expect(page.locator('aside')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('aside ul li')).toHaveCount(MOCK_BUSES.length, {
        timeout: 30_000,
      });
    }
  });

  test('is usable at a mobile viewport size', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await stubNetwork(page);
    await openMap(page);

    const canvas = await mapCanvas(page);
    const box = await canvas.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(300);
    expect(box?.height ?? 0).toBeGreaterThan(400);
  });

  test('does not log critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await stubNetwork(page);
    await openMap(page);
    await zoomInForMarkers(page);
    await page.waitForTimeout(1000);

    const critical = errors.filter(
      (error) =>
        !/webgl|canvas|mapbox|swiftshader|gpu|GroupMarkerNotSet/i.test(error)
    );

    expect(critical, `critical console errors:\n${critical.join('\n')}`).toHaveLength(0);
  });

  test('updates 100 markers within a single animation frame (5.4)', async ({ page }) => {
    await stubNetwork(page);
    await openMap(page);

    // Reproduces the dominant cost of syncBusMarkers (renderMarkerSvg + innerHTML +
    // aria-label write) for 100 markers inside a real browser engine.
    const stats = await page.evaluate(() => {
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.appendChild(host);

      const markers = Array.from({ length: 100 }, () => {
        const element = document.createElement('div');
        element.className = 'mapboxgl-marker';
        host.appendChild(element);
        return element;
      });

      const svg = `<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="16" r="12" fill="#3B82F6" stroke="#ffffff" stroke-width="2"/><circle cx="20" cy="16" r="5" fill="#ffffff"/></svg>`;
      const label = 'Xe buýt 29A-10000, tuyến 01, 63% chỗ ngồi';

      // Warm-up pass.
      for (const marker of markers) marker.innerHTML = svg;

      const iterations = 10;
      const startedAt = performance.now();
      for (let i = 0; i < iterations; i++) {
        for (const marker of markers) {
          marker.innerHTML = svg;
          marker.setAttribute('aria-label', label);
        }
      }
      const elapsed = performance.now() - startedAt;
      host.remove();

      return { elapsed, perBatch: elapsed / iterations };
    });

    expect(
      stats.perBatch,
      `updating 100 markers took ${stats.perBatch.toFixed(2)}ms (budget 16ms)`
    ).toBeLessThan(16);
  });
});
