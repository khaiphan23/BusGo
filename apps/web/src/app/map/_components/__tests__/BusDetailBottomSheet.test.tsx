import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BusDetailBottomSheet } from '../BusDetailBottomSheet';
import type { BusPosition } from '@/types/bus';

const mockBus: BusPosition = {
  id: '1',
  licensePlate: '29A-12345',
  lat: 21.0285,
  lng: 105.8342,
  heading: 90,
  speed: 30,
  status: 'ACTIVE',
  route: { id: 'r1', name: 'Tuyến 1', code: '01', color: '#3b82f6' },
  capacity: 40,
  currentOccupancy: 20,
  updatedAt: new Date().toISOString(),
};

const mockBuses: BusPosition[] = [
  mockBus,
  {
    id: '2',
    licensePlate: '29B-67890',
    lat: 21.0385,
    lng: 105.8442,
    heading: 180,
    speed: 25,
    status: 'ACTIVE',
    route: { id: 'r2', name: 'Tuyến 2', code: '02', color: '#ef4444' },
    capacity: 50,
    currentOccupancy: 45,
    updatedAt: new Date().toISOString(),
  },
];

describe('BusDetailBottomSheet', () => {
  const onClose = vi.fn();
  const onBusSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bus details correctly', () => {
    render(<BusDetailBottomSheet bus={mockBus} onClose={onClose} buses={mockBuses} onBusSelect={onBusSelect} />);
    expect(screen.getByText('29A-12345')).toBeInTheDocument();
    expect(screen.getByText('Tuyến 1')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
  });

  it('shows occupancy percentage and capacity', () => {
    render(<BusDetailBottomSheet bus={mockBus} onClose={onClose} buses={mockBuses} onBusSelect={onBusSelect} />);
    expect(screen.getByText('20 / 40')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows heading and speed when available', () => {
    render(<BusDetailBottomSheet bus={mockBus} onClose={onClose} buses={mockBuses} onBusSelect={onBusSelect} />);
    expect(screen.getByText('90°')).toBeInTheDocument();
    expect(screen.getByText('30.0 km/h')).toBeInTheDocument();
  });

  it('shows progress bar for occupancy', () => {
    render(<BusDetailBottomSheet bus={mockBus} onClose={onClose} buses={mockBuses} onBusSelect={onBusSelect} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('calls onClose when close button clicked', () => {
    render(<BusDetailBottomSheet bus={mockBus} onClose={onClose} buses={mockBuses} onBusSelect={onBusSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /đóng chi tiết/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows other buses on same route', () => {
    render(<BusDetailBottomSheet bus={mockBus} onClose={onClose} buses={mockBuses} onBusSelect={onBusSelect} />);
    expect(screen.getByText('29B-67890')).toBeInTheDocument();
  });

  it('calls onBusSelect when other bus clicked', () => {
    render(<BusDetailBottomSheet bus={mockBus} onClose={onClose} buses={mockBuses} onBusSelect={onBusSelect} />);
    fireEvent.click(screen.getByText('29B-67890').closest('button')!);
    expect(onBusSelect).toHaveBeenCalledWith(mockBuses[1]);
  });

  it('shows last updated time', () => {
    render(<BusDetailBottomSheet bus={mockBus} onClose={onClose} buses={mockBuses} onBusSelect={onBusSelect} />);
    expect(screen.getByText(/cập nhật:/i)).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<BusDetailBottomSheet bus={mockBus} onClose={onClose} buses={mockBuses} onBusSelect={onBusSelect} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Chi tiết xe 29A-12345');
  });
});