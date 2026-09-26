import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  }),
  createServerClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }),
}));

// Mock mapbox-gl
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      off: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      removeSource: vi.fn(),
      getSource: vi.fn(),
      setPaintProperty: vi.fn(),
      setLayoutProperty: vi.fn(),
      flyTo: vi.fn(),
      jumpTo: vi.fn(),
      easeTo: vi.fn(),
      getCenter: vi.fn(() => ({ lng: 0, lat: 0 })),
      getZoom: vi.fn(() => 10),
      resize: vi.fn(),
      remove: vi.fn(),
    })),
    NavigationControl: vi.fn(),
    GeolocateControl: vi.fn(),
    Marker: vi.fn().mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      setPopup: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
    Popup: vi.fn().mockImplementation(() => ({
      setHTML: vi.fn().mockReturnThis(),
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
  },
}));

// Mock next-pwa
vi.mock('next-pwa', () => ({
  default: (config: any) => config,
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'navigator', {
  writable: true,
  value: {
    ...window.navigator,
    serviceWorker: {
      register: vi.fn().mockResolvedValue({}),
      ready: Promise.resolve({}),
    },
  },
});
