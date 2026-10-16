import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateMapboxToken,
  getMapboxToken,
  initializeMapbox,
  getMarkerColor,
  getOccupancyColor,
  getOccupancyTextColor,
  calculateOccupancyPercentage,
} from '../mapbox';
import { contrastRatio } from '@/test/contrast';

const ORIGINAL_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const VALID_TOKEN = 'pk.eyJ1IjoidGVzdHVzZXIiLCJhIjoiY2x0ZXN0dG9rZW4ifQ.abcdefghijklmnopqrstuvwxyz';

describe('validateMapboxToken', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) {
      delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = ORIGINAL_TOKEN;
    }
  });

  it('reports a missing token as invalid', () => {
    const result = validateMapboxToken();
    expect(result.valid).toBe(false);
    expect(result.token).toBeNull();
    expect(result.error).toContain('not set');
  });

  it('rejects the shipped placeholder value', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'your_mapbox_token';
    const result = validateMapboxToken();
    expect(result.valid).toBe(false);
    expect(result.error).toContain('placeholder');
  });

  it('rejects a token that is too short to be a real Mapbox token', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.short';
    const result = validateMapboxToken();
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid');
  });

  it('accepts a well-formed token', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = VALID_TOKEN;
    const result = validateMapboxToken();
    expect(result).toEqual({ valid: true, token: VALID_TOKEN });
  });

  it('getMapboxToken throws when the token is invalid and returns it when valid', () => {
    expect(() => getMapboxToken()).toThrow(/not set/);
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = VALID_TOKEN;
    expect(getMapboxToken()).toBe(VALID_TOKEN);
  });

  it('initializeMapbox marks the token valid and does not throw', () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = VALID_TOKEN;
    const result = initializeMapbox();
    expect(result.valid).toBe(true);
  });
});

describe('occupancy colour helpers', () => {
  it('maps occupancy bands to distinct fill colours', () => {
    expect(getOccupancyColor(10)).toBe('#22c55e');
    expect(getOccupancyColor(60)).toBe('#3b82f6');
    expect(getOccupancyColor(80)).toBe('#f59e0b');
    expect(getOccupancyColor(95)).toBe('#ef4444');
  });

  it('text colours meet WCAG AA (4.5:1) against white', () => {
    for (const percentage of [10, 55, 75, 95]) {
      const ratio = contrastRatio(getOccupancyTextColor(percentage), '#ffffff');
      expect(ratio, `occupancy ${percentage}% (${ratio.toFixed(2)}:1)`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('calculateOccupancyPercentage', () => {
  it('rounds to the nearest whole percent', () => {
    expect(calculateOccupancyPercentage(25, 40)).toBe(63);
    expect(calculateOccupancyPercentage(0, 40)).toBe(0);
    expect(calculateOccupancyPercentage(40, 40)).toBe(100);
  });

  it('never exceeds 100 and guards against a zero capacity', () => {
    expect(calculateOccupancyPercentage(50, 40)).toBe(100);
    expect(calculateOccupancyPercentage(5, 0)).toBe(0);
  });
});

describe('getMarkerColor', () => {
  it('returns a colour for every bus status', () => {
    expect(getMarkerColor('ACTIVE')).toBe('#22c55e');
    expect(getMarkerColor('INACTIVE')).toBe('#6b7280');
    expect(getMarkerColor('MAINTENANCE')).toBe('#f59e0b');
    expect(getMarkerColor('OFFLINE')).toBe('#ef4444');
    expect(getMarkerColor('UNKNOWN')).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
