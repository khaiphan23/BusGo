import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BusInfoPopup } from '../BusInfoPopup';
import type { BusPosition } from '@/types/bus';

const mockPopup = {
  setLngLat: vi.fn().mockReturnThis(),
  setDOMContent: vi.fn().mockReturnThis(),
  addTo: vi.fn().mockReturnThis(),
  remove: vi.fn(),
};

vi.mock('mapbox-gl', () => {
  return {
    default: {
      Popup: vi.fn().mockImplementation(() => mockPopup),
    },
    Popup: vi.fn().mockImplementation(() => mockPopup),
  };
});

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

const mockMap = {
  on: vi.fn(),
  off: vi.fn(),
} as any;

describe('BusInfoPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPopup.setLngLat.mockClear();
    mockPopup.setDOMContent.mockClear();
    mockPopup.addTo.mockClear();
    mockPopup.remove.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('renders bus license plate', () => {
    render(<BusInfoPopup bus={mockBus} map={mockMap} onClose={vi.fn()} />);
    
    expect(screen.getByText('51A-12345')).toBeInTheDocument();
  });

  it('renders route code and name', () => {
    render(<BusInfoPopup bus={mockBus} map={mockMap} onClose={vi.fn()} />);
    
    expect(screen.getByText('Route R1 - Route 1')).toBeInTheDocument();
  });

  it('renders occupancy percentage', () => {
    render(<BusInfoPopup bus={mockBus} map={mockMap} onClose={vi.fn()} />);
    
    expect(screen.getByText('63%')).toBeInTheDocument();
  });

  it('renders capacity', () => {
    render(<BusInfoPopup bus={mockBus} map={mockMap} onClose={vi.fn()} />);
    
    expect(screen.getByText('25 / 40')).toBeInTheDocument();
  });

  it('renders heading when available', () => {
    render(<BusInfoPopup bus={mockBus} map={mockMap} onClose={vi.fn()} />);
    
    expect(screen.getByText('90°')).toBeInTheDocument();
  });

  it('renders speed when available', () => {
    render(<BusInfoPopup bus={mockBus} map={mockMap} onClose={vi.fn()} />);
    
    expect(screen.getByText('30.0 km/h')).toBeInTheDocument();
  });

  it('does not render heading when undefined', () => {
    const busNoHeading = { ...mockBus, heading: undefined };
    render(<BusInfoPopup bus={busNoHeading} map={mockMap} onClose={vi.fn()} />);
    
    expect(screen.queryByText(/°/)).not.toBeInTheDocument();
  });

  it('does not render speed when undefined', () => {
    const busNoSpeed = { ...mockBus, speed: undefined };
    render(<BusInfoPopup bus={busNoSpeed} map={mockMap} onClose={vi.fn()} />);
    
    expect(screen.queryByText(/km\/h/)).not.toBeInTheDocument();
  });

  it('renders close button', () => {
    render(<BusInfoPopup bus={mockBus} map={mockMap} onClose={vi.fn()} />);
    
    expect(screen.getByLabelText('Close popup')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<BusInfoPopup bus={mockBus} map={mockMap} onClose={onClose} />);
    
    act(() => {
      screen.getByLabelText('Close popup').click();
    });
    
    expect(onClose).toHaveBeenCalled();
  });

  it('creates mapbox Popup on mount', async () => {
    const mapboxgl = await import('mapbox-gl');
    
    render(<BusInfoPopup bus={mockBus} map={mockMap} onClose={vi.fn()} />);
    
    expect(mapboxgl.default.Popup).toHaveBeenCalledWith(
      expect.objectContaining({
        closeButton: false,
        closeOnClick: false,
        anchor: 'bottom',
        offset: 25,
      })
    );
  });

  it('sets popup position on mount', async () => {
    const mapboxgl = await import('mapbox-gl');
    
    render(<BusInfoPopup bus={mockBus} map={mockMap} onClose={vi.fn()} />);
    
    await waitFor(() => {
      expect(mockPopup.setLngLat).toHaveBeenCalledWith([105.8342, 21.0285]);
    });
  });

  it('updates popup position when bus location changes', async () => {
    const { rerender } = render(<BusInfoPopup bus={mockBus} map={mockMap} onClose={vi.fn()} />);
    
    const newBus = { ...mockBus, lng: 106.0, lat: 21.1 };
    rerender(<BusInfoPopup bus={newBus} map={mockMap} onClose={vi.fn()} />);
    
    await waitFor(() => {
      expect(mockPopup.setLngLat).toHaveBeenCalledWith([106.0, 21.1]);
    });
  });

  it('removes popup on unmount', () => {
    const { unmount } = render(<BusInfoPopup bus={mockBus} map={mockMap} onClose={vi.fn()} />);
    
    unmount();
    
    expect(mockPopup.remove).toHaveBeenCalled();
  });

  it('shows occupancy bar with correct width', () => {
    render(<BusInfoPopup bus={mockBus} map={mockMap} onClose={vi.fn()} />);
    
    const bar = document.querySelector('[style*="width: 63%"]');
    expect(bar).toBeInTheDocument();
  });

  it('shows last updated time', () => {
    render(<BusInfoPopup bus={mockBus} map={mockMap} onClose={vi.fn()} />);
    
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });
});