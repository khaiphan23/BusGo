import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BusPosition } from '@/types/bus';

vi.mock('mapbox-gl', () => {
  class FakeMarker {
    private element: HTMLElement;
    private lngLat: [number, number] = [0, 0];
    private removed = false;

    constructor(options: { element: HTMLElement }) {
      this.element = options.element;
      this.element.classList.add('mapboxgl-marker');
    }

    setLngLat(lngLat: [number, number]) {
      this.lngLat = lngLat;
      return this;
    }

    addTo() {
      document.body.appendChild(this.element);
      return this;
    }

    getElement() {
      return this.element;
    }

    getLngLat() {
      return this.lngLat;
    }

    remove() {
      this.element.remove();
      this.removed = true;
      return this;
    }

    isRemoved() {
      return this.removed;
    }
  }

  return { default: { Marker: FakeMarker }, Marker: FakeMarker };
});

import { syncBusMarkers, clearBusMarkers, renderMarkerSvg, markerAriaLabel } from '../markerSync';

function makeBus(index: number, overrides: Partial<BusPosition> = {}): BusPosition {
  return {
    id: `bus-${index}`,
    licensePlate: `29A-${10000 + index}`,
    lat: 21.0285 + index * 0.001,
    lng: 105.8342 + index * 0.001,
    heading: 90,
    speed: 30,
    status: 'ACTIVE',
    route: { id: `route-${index % 3}`, name: `Tuyến ${index % 3}`, code: `0${index % 3}`, color: '#3B82F6' },
    capacity: 40,
    currentOccupancy: 20,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const fakeMap = {} as unknown as mapboxgl.Map;
let registry: Map<string, mapboxgl.Marker>;

beforeEach(() => {
  document.body.innerHTML = '';
  registry = new Map();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('renderMarkerSvg', () => {
  it('paints the route colour and an occupancy ring', () => {
    const svg = renderMarkerSvg(makeBus(1, { currentOccupancy: 36, route: { ...makeBus(1).route, color: '#AA0000' } }));
    expect(svg).toContain('#AA0000');
    expect(svg).toContain('stroke-dasharray');
    expect(svg).toContain('rotate(90deg)');
  });
});

describe('markerAriaLabel', () => {
  it('describes plate, route and occupancy for screen readers', () => {
    const label = markerAriaLabel(makeBus(2, { currentOccupancy: 30 }));
    expect(label).toContain('29A-10002');
    expect(label).toContain('75% chỗ ngồi');
    expect(label).toContain('tuyến');
  });
});

describe('syncBusMarkers', () => {
  it('creates one accessible marker per bus', () => {
    const buses = [makeBus(1), makeBus(2), makeBus(3)];
    syncBusMarkers(fakeMap, buses, registry);

    expect(registry.size).toBe(3);
    const markers = document.querySelectorAll('.mapboxgl-marker');
    expect(markers).toHaveLength(3);
    for (const marker of markers) {
      expect(marker).toHaveAttribute('role', 'button');
      expect(marker).toHaveAttribute('tabindex', '0');
      expect(marker.getAttribute('aria-label')).toMatch(/Xe buýt 29A-\d+/);
      expect(marker.querySelector('svg')).not.toBeNull();
    }
  });

  it('updates existing markers in place instead of recreating them', () => {
    syncBusMarkers(fakeMap, [makeBus(1)], registry);
    const first = registry.get('bus-1')!;

    syncBusMarkers(fakeMap, [makeBus(1, { lng: 106.5, lat: 11.9, currentOccupancy: 40 })], registry);

    expect(registry.get('bus-1')).toBe(first);
    expect(registry.size).toBe(1);
    expect(first.getLngLat()).toEqual([106.5, 11.9]);
    expect(first.getElement().getAttribute('aria-label')).toContain('100% chỗ ngồi');
  });

  it('removes markers for buses that disappeared', () => {
    syncBusMarkers(fakeMap, [makeBus(1), makeBus(2)], registry);
    syncBusMarkers(fakeMap, [makeBus(2)], registry);

    expect(registry.size).toBe(1);
    expect(document.querySelectorAll('.mapboxgl-marker')).toHaveLength(1);
  });

  it('activates a bus on click and on Enter/Space', () => {
    const onActivate = vi.fn();
    syncBusMarkers(fakeMap, [makeBus(1)], registry, onActivate);
    const marker = document.querySelector('.mapboxgl-marker') as HTMLElement;

    marker.click();
    expect(onActivate).toHaveBeenCalledTimes(1);

    marker.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    marker.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onActivate).toHaveBeenCalledTimes(3);

    marker.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(onActivate).toHaveBeenCalledTimes(3);
  });

  it('resolves the freshest bus snapshot on activation', () => {
    const stale = makeBus(1, { currentOccupancy: 80 });
    const fresh = makeBus(1, { currentOccupancy: 5 });
    const onActivate = vi.fn();

    syncBusMarkers(fakeMap, [stale], registry, onActivate, () => fresh);
    (document.querySelector('.mapboxgl-marker') as HTMLElement).click();

    expect(onActivate).toHaveBeenCalledWith(fresh);
    expect(onActivate).not.toHaveBeenCalledWith(stale);
  });
});

describe('clearBusMarkers', () => {
  it('empties the registry and the DOM', () => {
    syncBusMarkers(fakeMap, [makeBus(1), makeBus(2)], registry);
    clearBusMarkers(registry);

    expect(registry.size).toBe(0);
    expect(document.querySelectorAll('.mapboxgl-marker')).toHaveLength(0);
  });
});

/**
 * 5.4 marker budget.
 *
 * The hard "< 16ms for 100 markers" assertion lives in the browser (see
 * apps/web/e2e/map.spec.ts) where innerHTML parsing is representative of production.
 * jsdom parses SVG at roughly 3ms per marker, so these tests guard the algorithmic
 * properties instead: the update path must never cost more than creating markers
 * from scratch, and neither path may blow up super-linearly.
 */
describe('syncBusMarkers realtime budget (5.4)', () => {
  function measure(fn: () => void): number {
    fn(); // warm-up
    const startedAt = performance.now();
    fn();
    return performance.now() - startedAt;
  }

  it('creates 100 markers without pathological cost', () => {
    const buses = Array.from({ length: 100 }, (_, i) => makeBus(i));

    const startedAt = performance.now();
    syncBusMarkers(fakeMap, buses, registry);
    const createMs = performance.now() - startedAt;

    expect(registry.size).toBe(100);
    expect(document.querySelectorAll('.mapboxgl-marker')).toHaveLength(100);
    expect(createMs, `creating 100 markers took ${createMs.toFixed(1)}ms`).toBeLessThan(2000);
  });

  it('updates 100 markers faster than creating them from scratch', () => {
    const buses = Array.from({ length: 100 }, (_, i) => makeBus(i));
    syncBusMarkers(fakeMap, buses, registry);
    const moved = buses.map((bus) => ({ ...bus, lng: bus.lng + 0.01, lat: bus.lat + 0.01 }));

    const updateMs = measure(() => syncBusMarkers(fakeMap, moved, registry));

    expect(updateMs).toBeLessThan(2000);
    expect(registry.get('bus-0')!.getLngLat()).toEqual([moved[0].lng, moved[0].lat]);

    // Creating the same 100 markers from an empty registry must not be the cheap path —
    // if update ever becomes more expensive than create, marker sync has regressed.
    // Clearing has to happen inside the measured fn: measure() runs a warm-up pass,
    // so clearing once up front would leave the timed pass measuring an update instead.
    const recreateMs = measure(() => {
      clearBusMarkers(registry);
      syncBusMarkers(fakeMap, buses, registry);
    });
    expect(updateMs).toBeLessThan(recreateMs);
  });

  it('scales roughly linearly with the number of buses', () => {
    const half = Array.from({ length: 50 }, (_, i) => makeBus(i));
    const full = Array.from({ length: 100 }, (_, i) => makeBus(i));

    const run = (buses: BusPosition[]) => {
      clearBusMarkers(registry);
      return measure(() => syncBusMarkers(fakeMap, buses, registry));
    };

    const halfMs = Math.max(run(half), 1);
    const fullMs = run(full);

    expect(fullMs).toBeLessThan(halfMs * 5);
  });
});
