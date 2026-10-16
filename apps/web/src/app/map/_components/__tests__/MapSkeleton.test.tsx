import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapSkeleton } from '../MapSkeleton';

describe('MapSkeleton', () => {
  it('renders skeleton loading state', () => {
    render(<MapSkeleton />);
    expect(screen.getByTestId('map-skeleton')).toBeInTheDocument();
  });

  it('has correct structure for map skeleton', () => {
    render(<MapSkeleton />);
    const skeleton = screen.getByTestId('map-skeleton');
    expect(skeleton).toHaveClass('h-full');
    expect(skeleton).toHaveClass('w-full');
  });

  it('shows animated pulse effect', () => {
    render(<MapSkeleton />);
    const pulseElements = document.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });
});