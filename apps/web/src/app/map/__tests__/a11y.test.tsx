import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import axe, { type AxeResults, type RunOptions } from 'axe-core';
import { MapboxTokenError } from '../_components/MapboxTokenError';
import { LiveIndicator } from '../_components/LiveIndicator';
import { BusListSidebar } from '../_components/BusListSidebar';
import { BusInfoPopup } from '../_components/BusInfoPopup';
import { BusDetailBottomSheet } from '../_components/BusDetailBottomSheet';
import type { BusPosition } from '@/types/bus';

vi.mock('mapbox-gl', () => {
  const popup = {
    setLngLat: vi.fn().mockReturnThis(),
    setDOMContent: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  };
  return { default: { Popup: vi.fn(() => popup), Marker: vi.fn() }, Popup: vi.fn(() => popup) };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn(() => undefined) })),
    removeChannel: vi.fn(),
  })),
}));

function makeBus(index: number): BusPosition {
  return {
    id: `clzbus000000000000000${index}`,
    licensePlate: `29A-${10000 + index}`,
    lat: 21.0285 + index * 0.001,
    lng: 105.8342 + index * 0.001,
    heading: 90,
    speed: 30,
    status: 'ACTIVE',
    route: { id: `route${index}`, name: `Tuyến ${index}`, code: `0${index}`, color: '#3B82F6' },
    capacity: 40,
    currentOccupancy: 30,
    updatedAt: new Date().toISOString(),
  };
}

const PAGE_LEVEL_RULES = {
  region: { enabled: false },
  'landmark-one-main': { enabled: false },
  'page-has-heading-one': { enabled: false },
  'heading-order': { enabled: false },
  'html-has-lang': { enabled: false },
  'html-lang-valid': { enabled: false },
};

async function expectNoViolations(container: HTMLElement): Promise<AxeResults> {
  const results: AxeResults = await axe.run(container, {
    rules: PAGE_LEVEL_RULES,
  } as RunOptions);

  const summary = results.violations
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
    .join('\n');

  expect(results.violations, `axe violations:\n${summary}`).toHaveLength(0);
  return results;
}

afterEach(() => {
  cleanup();
});

describe('accessibility audits (5.5 WCAG 2.1 AA)', () => {
  it('Mapbox token fallback has no violations', async () => {
    const { container } = render(
      <MapboxTokenError
        validation={{
          valid: false,
          token: null,
          error: 'Mapbox token is still set to the placeholder value.',
        }}
        onRetry={() => undefined}
      />
    );
    await expectNoViolations(container);
  });

  it('live status indicator has no violations', async () => {
    const { container } = render(<LiveIndicator />);
    await expectNoViolations(container);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('bus list sidebar has no violations', async () => {
    const { container } = render(
      <BusListSidebar
        buses={[makeBus(1), makeBus(2)]}
        selectedBus={makeBus(1)}
        onBusSelect={() => undefined}
        onClose={() => undefined}
        isOpen
        onToggle={() => undefined}
      />
    );
    await expectNoViolations(container);
  });

  it('bus info popup has no violations', async () => {
    const { container } = render(
      <BusInfoPopup bus={makeBus(1)} map={{ on: vi.fn(), off: vi.fn() } as never} onClose={vi.fn()} />
    );
    await expectNoViolations(container);
    expect(screen.getByRole('dialog')).toHaveAccessibleName();
  });

  it('bus detail bottom sheet has no violations', async () => {
    const { container } = render(
      <BusDetailBottomSheet
        bus={makeBus(1)}
        onClose={vi.fn()}
        buses={[makeBus(1), makeBus(2)]}
        onBusSelect={() => undefined}
      />
    );
    await expectNoViolations(container);
    expect(screen.getByRole('dialog')).toHaveAccessibleName();
  });
});
