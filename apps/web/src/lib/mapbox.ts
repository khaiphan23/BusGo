import mapboxgl from 'mapbox-gl';

export const MAPBOX_CONFIG = {
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [105.8342, 21.0285] as [number, number],
  zoom: 12,
  minZoom: 8,
  maxZoom: 18,
} as const;

export const VIETNAM_BOUNDS: [number, number, number, number] = [
  102.14, 8.18, 109.46, 23.39,
];

export interface TokenValidationResult {
  valid: boolean;
  token: string | null;
  error?: string;
}

export function validateMapboxToken(): TokenValidationResult {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  
  if (!token) {
    return {
      valid: false,
      token: null,
      error: 'NEXT_PUBLIC_MAPBOX_TOKEN is not set. Please add your Mapbox access token to .env.local',
    };
  }
  
  if (token === 'your_mapbox_token' || token === 'YOUR_MAPBOX_TOKEN') {
    return {
      valid: false,
      token: null,
      error: 'Mapbox token is still set to the placeholder value. Please replace "your_mapbox_token" with your actual Mapbox access token in .env.local',
    };
  }
  
  if (token.length < 20) {
    return {
      valid: false,
      token: null,
      error: 'Mapbox token appears to be invalid (too short). Please check your token in .env.local',
    };
  }
  
  return {
    valid: true,
    token,
  };
}

export function getMapboxToken(): string {
  const result = validateMapboxToken();
  if (!result.valid) {
    throw new Error(result.error);
  }
  return result.token!;
}

export function initializeMapbox(): TokenValidationResult {
  const result = validateMapboxToken();
  if (result.valid && result.token) {
    mapboxgl.accessToken = result.token;
  }
  return result;
}

export function createMapOptions(container: HTMLElement | string): mapboxgl.MapboxOptions {
  return {
    container,
    style: MAPBOX_CONFIG.style,
    center: MAPBOX_CONFIG.center,
    zoom: MAPBOX_CONFIG.zoom,
    minZoom: MAPBOX_CONFIG.minZoom,
    maxZoom: MAPBOX_CONFIG.maxZoom,
    maxBounds: VIETNAM_BOUNDS,
    preserveDrawingBuffer: true,
    attributionControl: false,
  };
}

export function createMap(container: HTMLElement | string): mapboxgl.Map {
  initializeMapbox();
  const map = new mapboxgl.Map(createMapOptions(container));
  return map;
}

export function getMarkerColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return '#22c55e';
    case 'INACTIVE':
      return '#6b7280';
    case 'MAINTENANCE':
      return '#f59e0b';
    case 'OFFLINE':
      return '#ef4444';
    default:
      return '#3b82f6';
  }
}

export function getOccupancyColor(percentage: number): string {
  if (percentage >= 90) return '#ef4444';
  if (percentage >= 70) return '#f59e0b';
  if (percentage >= 50) return '#3b82f6';
  return '#22c55e';
}

/**
 * Text-safe occupancy colours (WCAG AA: 4.5:1 on white). The fill colours above are only
 * safe for large graphic shapes, not for 11-16px labels.
 */
export function getOccupancyTextColor(percentage: number): string {
  if (percentage >= 90) return '#b91c1c';
  if (percentage >= 70) return '#a16207';
  if (percentage >= 50) return '#1d4ed8';
  return '#15803d';
}

export function calculateOccupancyPercentage(occupied: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((occupied / capacity) * 100));
}