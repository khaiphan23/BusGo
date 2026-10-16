import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MapContainer, useMapContainer } from '../MapContainer';
import { ReactNode } from 'react';
import { TokenValidationResult } from '@/lib/mapbox';
import * as mapboxglNS from 'mapbox-gl';

const mockTokenValidation: TokenValidationResult = { valid: true, token: 'test-token' };

const errorState: { cb: ((event: { error?: unknown }) => void) | null } = { cb: null };

const createMockMap = () => ({
  on: vi.fn((event: string, callback: (event: { error?: unknown }) => void) => {
    if (event === 'load') {
      setTimeout(() => callback({}), 0);
    }
    if (event === 'error') {
      errorState.cb = callback;
    }
    return mockMap;
  }),
  remove: vi.fn(),
  getCenter: vi.fn(() => ({ lng: 105.8342, lat: 21.0285 })),
  getZoom: vi.fn(() => 12),
  getBounds: vi.fn(() => ({
    _ne: { lat: 21.1, lng: 105.9 },
    _sw: { lat: 20.9, lng: 105.7 },
  })),
  loaded: vi.fn(() => true),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  getSource: vi.fn(),
  setLayoutProperty: vi.fn(),
  getLayer: vi.fn(),
});

const mockMap = createMockMap();

vi.mock('mapbox-gl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('mapbox-gl')>();
  return {
    ...actual,
    default: vi.fn().mockImplementation(() => mockMap),
    Map: vi.fn().mockImplementation(() => mockMap),
  };
});

vi.mock('@/lib/mapbox', () => ({
  initializeMapbox: vi.fn(() => mockTokenValidation),
  TokenValidationResult: {} as any,
}));

const mockMapboxgl = mapboxglNS as unknown as {
  Map: ReturnType<typeof vi.fn>;
};

describe('MapContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMap.on.mockClear();
    mockMap.remove.mockClear();
    errorState.cb = null;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('renders loading state initially', () => {
    render(
      <MapContainer>
        {(map) => <div data-testid="map-children">Map loaded</div>}
      </MapContainer>
    );

    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });

  it('calls onMapLoad when map loads', async () => {
    const onMapLoad = vi.fn();
    
    render(
      <MapContainer onMapLoad={onMapLoad}>
        {(map) => <div data-testid="map-children">Map loaded</div>}
      </MapContainer>
    );

    await waitFor(() => {
      expect(onMapLoad).toHaveBeenCalled();
    });
  });

  it('renders error state when onMapError is called', async () => {
    const onMapError = vi.fn();
    
    render(
      <MapContainer onMapError={onMapError}>
        {(map) => <div data-testid="map-children">Map loaded</div>}
      </MapContainer>
    );

    await waitFor(() => {
      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    // Manually trigger error callback
    if (errorState.cb) {
      act(() => {
        errorState.cb?.({ error: new Error('Map load failed') });
      });
    }

    expect(onMapError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('passes map instance to children render prop', async () => {
    const children = vi.fn((map) => <div data-testid="map-children">{map ? 'has-map' : 'no-map'}</div>);
    
    render(<MapContainer>{children}</MapContainer>);

    await waitFor(() => {
      expect(screen.getByTestId('map-children')).toHaveTextContent('has-map');
    });
  });

  it('applies custom options to map', async () => {
    const options = { zoom: 15, center: [106.0, 21.1] as [number, number] };
    
    render(
      <MapContainer options={options}>
        {(map) => <div />}
      </MapContainer>
    );

    await waitFor(() => {
      expect(mockMapboxgl.Map).toHaveBeenCalledWith(
        expect.objectContaining({
          zoom: 15,
          center: [106.0, 21.1],
        })
      );
    });
  });

  it('cleans up map on unmount', async () => {
    const { unmount } = render(
      <MapContainer>
        {(map) => <div data-testid="map-children" />}
      </MapContainer>
    );

    await waitFor(() => {
      expect(screen.getByTestId('map-children')).toBeInTheDocument();
    });

    unmount();

    expect(mockMap.remove).toHaveBeenCalled();
  });
});

describe('useMapContainer', () => {
  it('returns map and registerMap function', () => {
    const { result } = renderHook(() => useMapContainer());
    
    expect(result.current.map).toBeNull();
    expect(typeof result.current.registerMap).toBe('function');
  });

  it('stores map when registerMap is called', () => {
    const { result } = renderHook(() => useMapContainer());
    const mockMapInstance = { id: 'test-map' } as any;
    
    act(() => {
      result.current.registerMap(mockMapInstance);
    });
    
    expect(result.current.map).toBe(mockMapInstance);
  });
});

function renderHook<T>(hook: () => T) {
  let result: { current: T } = { current: null as any };
  
  const TestComponent = () => {
    result.current = hook();
    return null;
  };
  
  render(<TestComponent />);
  
  return { result };
}