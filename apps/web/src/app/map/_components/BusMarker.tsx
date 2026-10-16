'use client';

import type { BusPosition } from '@/types/bus';
import { calculateOccupancyPercentage } from '@/lib/mapbox';

export interface BusMarkerIconProps {
  bus: BusPosition;
  size?: number;
}

export function createBusMarkerIcon(bus: BusPosition, size = 40): string {
  const occupancyPercent = calculateOccupancyPercentage(bus.currentOccupancy, bus.capacity);
  const occupancyColor = occupancyPercent >= 90 ? '#ef4444' 
    : occupancyPercent >= 70 ? '#f59e0b' 
    : occupancyPercent >= 50 ? '#3b82f6' 
    : '#22c55e';

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(${bus.heading || 0}deg); transform-origin: center;">
      <circle cx="${size/2}" cy="${size/2 - 4}" r="${size * 0.3}" fill="${bus.route.color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="${size/2}" cy="${size/2 - 4}" r="${size * 0.125}" fill="#ffffff"/>
      ${occupancyPercent > 0 ? `
        <circle cx="${size/2}" cy="${size/2 - 4}" r="${size * 0.35}" fill="none" stroke="${occupancyColor}" stroke-width="3" 
          stroke-dasharray="${(occupancyPercent / 100) * (Math.PI * 2 * size * 0.35)} ${Math.PI * 2 * size * 0.35}" 
          style="transform: rotate(-90deg); transform-origin: center;"/>
      ` : ''}
    </svg>
  `;
}

export function createBusMarkerElement(bus: BusPosition, size = 40): HTMLElement {
  const el = document.createElement('div');
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.cursor = 'pointer';
  el.style.position = 'relative';
  el.innerHTML = createBusMarkerIcon(bus, size);
  return el;
}