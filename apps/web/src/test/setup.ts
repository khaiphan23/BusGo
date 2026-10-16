import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Component tests exercise the "happy path" map render; individual tests that
// cover missing/placeholder tokens stub the variable themselves.
process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??= 'pk.test_vitest_token_for_component_tests';

// Node-environment tests (e.g. middleware) have no window; guard the DOM-only stubs.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'fetch', {
    writable: true,
    value: vi.fn(),
  });
}