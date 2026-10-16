import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MapContainer } from '../MapContainer';
import type { TokenValidationResult } from '@/lib/mapbox';

const invalidToken: TokenValidationResult = {
  valid: false,
  token: null,
  error:
    'Mapbox token is still set to the placeholder value. Please replace "your_mapbox_token" with your actual Mapbox access token in .env.local',
};

const mockMapInstance = { remove: vi.fn(), on: vi.fn() };

vi.mock('mapbox-gl', () => ({
  default: { Map: vi.fn(() => mockMapInstance) },
  Map: vi.fn(() => mockMapInstance),
}));

vi.mock('@/lib/mapbox', () => ({
  initializeMapbox: vi.fn(() => invalidToken),
  TokenValidationResult: {} as unknown as TokenValidationResult,
}));

describe('MapContainer with an unusable token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the fallback UI instead of constructing a map', async () => {
    render(
      <MapContainer>
        {() => <div data-testid="map-children">should not render</div>}
      </MapContainer>
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Mapbox Token Chưa Được Cập Nhật' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('map-children')).toBeNull();

    // Give the map-creation effect a chance to run (and prove it never does).
    await waitFor(() => {
      expect(screen.getByRole('application')).toHaveAttribute(
        'aria-label',
        'Interactive bus tracking map - configuration required'
      );
    });
    expect(mockMapInstance.on).not.toHaveBeenCalled();
  });

  it('renders the retry button wired to a page reload', async () => {
    render(
      <MapContainer>
        {() => <div />}
      </MapContainer>
    );

    expect(await screen.findByRole('button', { name: 'Thử Lại' })).toBeInTheDocument();
  });
});
