import { describe, it, expect } from 'vitest';
import { createBusMarkerIcon, createBusMarkerElement } from '../BusMarker';
import type { BusPosition } from '@/types/bus';

const mockBus: BusPosition = {
  id: 'bus-1',
  licensePlate: '51A-12345',
  lat: 21.0285,
  lng: 105.8342,
  heading: 90,
  speed: 30,
  status: 'ACTIVE',
  route: {
    id: 'route-1',
    name: 'Route 1',
    code: 'R1',
    color: '#3B82F6',
  },
  capacity: 40,
  currentOccupancy: 25,
  updatedAt: '2024-01-15T10:30:00.000Z',
};

describe('BusMarker', () => {
  describe('createBusMarkerIcon', () => {
    it('generates SVG with route color', () => {
      const svg = createBusMarkerIcon(mockBus);
      
      expect(svg).toContain('#3B82F6');
      expect(svg).toContain('<svg');
      expect(svg).toContain('<circle');
    });

    it('includes occupancy indicator when occupancy > 0', () => {
      const svg = createBusMarkerIcon(mockBus);
      
      expect(svg).toContain('stroke-dasharray');
      expect(svg).toContain('#3b82f6'); // occupancy color for 62.5%
    });

    it('excludes occupancy indicator when occupancy is 0', () => {
      const emptyBus = { ...mockBus, currentOccupancy: 0 };
      const svg = createBusMarkerIcon(emptyBus);
      
      expect(svg).not.toContain('stroke-dasharray');
    });

    it('includes heading rotation', () => {
      const svg = createBusMarkerIcon(mockBus);
      
      expect(svg).toContain('rotate(90deg)');
    });

    it('uses default heading 0 when undefined', () => {
      const busNoHeading = { ...mockBus, heading: undefined };
      const svg = createBusMarkerIcon(busNoHeading);
      
      expect(svg).toContain('rotate(0deg)');
    });

    it('uses custom size', () => {
      const svg = createBusMarkerIcon(mockBus, 50);
      
      expect(svg).toContain('width="50"');
      expect(svg).toContain('height="50"');
    });

    it('uses correct occupancy color for high occupancy', () => {
      const highOccupancyBus = { ...mockBus, currentOccupancy: 38 }; // 95%
      const svg = createBusMarkerIcon(highOccupancyBus);
      
      expect(svg).toContain('#ef4444'); // red for >= 90%
    });

    it('uses correct occupancy color for medium occupancy', () => {
      const medOccupancyBus = { ...mockBus, currentOccupancy: 30 }; // 75%
      const svg = createBusMarkerIcon(medOccupancyBus);
      
      expect(svg).toContain('#f59e0b'); // amber for >= 70%
    });

    it('uses correct occupancy color for low occupancy', () => {
      const lowOccupancyBus = { ...mockBus, currentOccupancy: 15 }; // 37.5%
      const svg = createBusMarkerIcon(lowOccupancyBus);
      
      expect(svg).toContain('#22c55e'); // green for < 50%
    });
  });

  describe('createBusMarkerElement', () => {
    it('creates HTMLElement with SVG content', () => {
      const element = createBusMarkerElement(mockBus);
      
      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.innerHTML).toContain('<svg');
      expect(element.style.width).toBe('40px');
      expect(element.style.height).toBe('40px');
      expect(element.style.cursor).toBe('pointer');
    });

    it('uses custom size', () => {
      const element = createBusMarkerElement(mockBus, 50);
      
      expect(element.style.width).toBe('50px');
      expect(element.style.height).toBe('50px');
    });
  });
});