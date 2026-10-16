import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BusMap } from '../BusMap';
import { useBusPositions } from '@/hooks/useBusPositions';
import { useBusRealtime } from '@/hooks/useBusRealtime';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import type { BusPosition } from '@/types/bus';

const mockMap = {
  on: vi.fn((event, callback) => {
    if (event === 'load') {
      setTimeout(() => callback(), 0);
    }
    if (event === 'moveend') {
      mockMap._moveendCallback = callback;
    }
    return mockMap;
  }),
  off: vi.fn(),
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
  getSource: vi.fn(() => ({
    setData: vi.fn(),
  })),
  getLayer: vi.fn(),
  setLayoutProperty: vi.fn(),
  _moveendCallback: null as (() => void) | null,
};

vi.mock('mapbox-gl', () => {
  return {
    default: vi.fn().mockImplementation(() => mockMap),
    Map: vi.fn().mockImplementation(() => mockMap),
  };
});

vi.mock('@/hooks/useBusPositions');
vi.mock('@/hooks/useBusRealtime');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

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

describe('BusMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMap.on.mockClear();
    mockMap.off.mockClear();
    mockMap.remove.mockClear();
    mockMap.addSource.mockClear();
    mockMap.addLayer.mockClear();
    mockMap.getSource.mockClear();
    mockMap.getLayer.mockClear();
    mockMap.setLayoutProperty.mockClear();
    mockMap._moveendCallback = null;
    
    (useBusPositions as any).mockReturnValue({
      buses: [mockBus],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      handleRealtimeInsert: vi.fn(),
      handleRealtimeUpdate: vi.fn(),
      handleRealtimeDelete: vi.fn(),
    });
    (useBusRealtime as any).mockReturnValue({ unsubscribe: vi.fn() });
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('renders loading state when isLoading is true', () => {
    (useBusPositions as any).mockReturnValue({
      buses: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      handleRealtimeInsert: vi.fn(),
      handleRealtimeUpdate: vi.fn(),
      handleRealtimeDelete: vi.fn(),
    });

    render(<BusMap />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading bus positions...')).toBeInTheDocument();
  });

  it('renders error state when error exists', () => {
    (useBusPositions as any).mockReturnValue({
      buses: [],
      isLoading: false,
      error: new Error('Failed to fetch'),
      refetch: vi.fn(),
      handleRealtimeInsert: vi.fn(),
      handleRealtimeUpdate: vi.fn(),
      handleRealtimeDelete: vi.fn(),
    });

    render(<BusMap />, { wrapper: createWrapper() });

    expect(screen.getByText(/Failed to load bus data:/)).toBeInTheDocument();
  });

  it('calls useBusRealtime with handlers', () => {
    render(<BusMap />, { wrapper: createWrapper() });

    expect(useBusRealtime).toHaveBeenCalledWith(
      expect.objectContaining({
        onInsert: expect.any(Function),
        onUpdate: expect.any(Function),
        onDelete: expect.any(Function),
        enabled: true,
      })
    );
  });

  it('renders map container', async () => {
    render(<BusMap />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  it('registers moveend handler on map load', async () => {
    const onViewportChange = vi.fn();
    
    render(<BusMap onViewportChange={onViewportChange} />, { wrapper: createWrapper() });

    // Wait for map to load and moveend handler to be registered
    await waitFor(() => {
      expect(mockMap.on).toHaveBeenCalledWith('moveend', expect.any(Function));
    });
  });

  it('subscribes to realtime updates', () => {
    render(<BusMap />, { wrapper: createWrapper() });

    expect(useBusRealtime).toHaveBeenCalled();
  });
});