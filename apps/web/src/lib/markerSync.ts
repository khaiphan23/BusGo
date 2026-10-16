import mapboxgl from 'mapbox-gl';
import { calculateOccupancyPercentage } from '@/lib/mapbox';
import type { BusPosition } from '@/types/bus';

export function getOccupancyRingColor(occupancyPercent: number): string {
  if (occupancyPercent >= 90) return '#ef4444';
  if (occupancyPercent >= 70) return '#f59e0b';
  if (occupancyPercent >= 50) return '#3b82f6';
  return '#22c55e';
}

export function markerAriaLabel(bus: BusPosition): string {
  const percent = calculateOccupancyPercentage(bus.currentOccupancy, bus.capacity);
  return `Xe buýt ${bus.licensePlate}, tuyến ${bus.route.code}, ${percent}% chỗ ngồi`;
}

export function renderMarkerSvg(bus: BusPosition): string {
  const occupancyPercent = calculateOccupancyPercentage(bus.currentOccupancy, bus.capacity);
  const occupancyColor = getOccupancyRingColor(occupancyPercent);

  return `
    <svg width="40" height="40" viewBox="0 0 40 40" style="transform: rotate(${bus.heading || 0}deg); transform-origin: center;">
      <circle cx="20" cy="16" r="12" fill="${bus.route.color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="20" cy="16" r="5" fill="#ffffff"/>
      ${
        occupancyPercent > 0
          ? `
      <circle cx="20" cy="16" r="14" fill="none" stroke="${occupancyColor}" stroke-width="3"
        stroke-dasharray="${(occupancyPercent / 100) * 88} 88"
        style="transform: rotate(-90deg); transform-origin: center;"/>
    `
          : ''
      }
    </svg>
  `;
}

/**
 * Last SVG/label written per marker element. Realtime updates often change only
 * lat/lng; skipping identical innerHTML writes keeps the 500ms debounced update
 * path cheap enough to avoid jank (plan 5.4).
 */
const lastRender = new WeakMap<HTMLElement, { svg: string; label: string }>();

/**
 * Creates/updates/removes DOM markers so that `registry` mirrors `buses`.
 * Extracted from the component so the hot realtime path can be profiled directly.
 */
export function syncBusMarkers(
  map: mapboxgl.Map,
  buses: BusPosition[],
  registry: Map<string, mapboxgl.Marker>,
  onActivate?: (bus: BusPosition) => void,
  resolveBus?: (busId: string) => BusPosition | undefined
): void {
  const currentIds = new Set(buses.map((b) => b.id));

  for (const id of Array.from(registry.keys())) {
    if (!currentIds.has(id)) {
      registry.get(id)?.remove();
      registry.delete(id);
    }
  }

  for (const bus of buses) {
    let marker = registry.get(bus.id);

    if (!marker) {
      const el = document.createElement('div');
      el.className = 'bus-marker';
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', markerAriaLabel(bus));
      marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
        offset: [0, -8],
      })
        .setLngLat([bus.lng, bus.lat])
        .addTo(map);

      const activate = () => {
        const fresh = resolveBus?.(bus.id) ?? bus;
        onActivate?.(fresh);
      };
      el.addEventListener('click', activate);
      el.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      });

      registry.set(bus.id, marker);
    } else {
      marker.setLngLat([bus.lng, bus.lat]);
    }

    const el = marker.getElement();
    const svg = renderMarkerSvg(bus);
    const label = markerAriaLabel(bus);
    const prev = lastRender.get(el);
    if (!prev || prev.svg !== svg) el.innerHTML = svg;
    if (!prev || prev.label !== label) el.setAttribute('aria-label', label);
    lastRender.set(el, { svg, label });
  }
}

export function clearBusMarkers(registry: Map<string, mapboxgl.Marker>): void {
  for (const id of Array.from(registry.keys())) {
    registry.get(id)?.remove();
    registry.delete(id);
  }
}
