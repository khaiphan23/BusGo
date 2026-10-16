import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BusListSidebar } from '../BusListSidebar';
import type { BusPosition } from '@/types/bus';

const mockBuses: BusPosition[] = [
  {
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
  },
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

describe('BusListSidebar', () => {
  const onBusSelect = vi.fn();
  const onClose = vi.fn();
  const onToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bus list with correct count', () => {
    render(<BusListSidebar buses={mockBuses} selectedBus={null} onBusSelect={onBusSelect} onClose={onClose} isOpen={true} onToggle={onToggle} />);
    expect(screen.getByText('Xe buýt hoạt động (2)')).toBeInTheDocument();
  });

  it('displays all buses with license plate and route', () => {
    render(<BusListSidebar buses={mockBuses} selectedBus={null} onBusSelect={onBusSelect} onClose={onClose} isOpen={true} onToggle={onToggle} />);
    expect(screen.getByText('29A-12345')).toBeInTheDocument();
    expect(screen.getByText('29B-67890')).toBeInTheDocument();
    expect(screen.getByText(/Tuyến 1/)).toBeInTheDocument();
    expect(screen.getByText(/Tuyến 2/)).toBeInTheDocument();
  });

  it('shows occupancy percentage for each bus', () => {
    render(<BusListSidebar buses={mockBuses} selectedBus={null} onBusSelect={onBusSelect} onClose={onClose} isOpen={true} onToggle={onToggle} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('calls onBusSelect when bus is clicked', () => {
    render(<BusListSidebar buses={mockBuses} selectedBus={null} onBusSelect={onBusSelect} onClose={onClose} isOpen={true} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('29A-12345').closest('button')!);
    expect(onBusSelect).toHaveBeenCalledWith(mockBuses[0]);
  });

  it('filters buses by search query', () => {
    render(<BusListSidebar buses={mockBuses} selectedBus={null} onBusSelect={onBusSelect} onClose={onClose} isOpen={true} onToggle={onToggle} />);
    const searchInput = screen.getByPlaceholderText('Tìm biển số, tuyến...');
    fireEvent.change(searchInput, { target: { value: '29A' } });
    expect(screen.getByText('29A-12345')).toBeInTheDocument();
    expect(screen.queryByText('29B-67890')).not.toBeInTheDocument();
  });

  it('highlights selected bus', () => {
    render(<BusListSidebar buses={mockBuses} selectedBus={mockBuses[0]} onBusSelect={onBusSelect} onClose={onClose} isOpen={true} onToggle={onToggle} />);
    const selectedBus = screen.getByText('29A-12345').closest('button');
    expect(selectedBus).toHaveClass('bg-primary-50');
  });

  it('calls onClose when close button clicked', () => {
    render(<BusListSidebar buses={mockBuses} selectedBus={null} onBusSelect={onBusSelect} onClose={onClose} isOpen={true} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: /đóng danh sách/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows toggle button on mobile', () => {
    render(<BusListSidebar buses={mockBuses} selectedBus={null} onBusSelect={onBusSelect} onClose={onClose} isOpen={false} onToggle={onToggle} />);
    const toggleButton = screen.getByRole('button', { name: /mở thanh bên/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('sorts by occupancy when selected', () => {
    render(<BusListSidebar buses={mockBuses} selectedBus={null} onBusSelect={onBusSelect} onClose={onClose} isOpen={true} onToggle={onToggle} />);
    const sortSelect = screen.getByRole('combobox', { name: /sắp xếp theo/i });
    fireEvent.change(sortSelect, { target: { value: 'occupancy' } });
    // 90% should come before 50%
    const buttons = screen.getAllByRole('listitem');
    expect(buttons[0]).toHaveTextContent('29B-67890');
    expect(buttons[1]).toHaveTextContent('29A-12345');
  });
});