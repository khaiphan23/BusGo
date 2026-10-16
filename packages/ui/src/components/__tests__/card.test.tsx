import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent } from '../card';

describe('Card', () => {
  it('renders children', () => {
    render(
      <Card>
        <p>Nội dung card</p>
      </Card>
    );
    expect(screen.getByText('Nội dung card')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Card className="custom-card">Card</Card>);
    expect(screen.getByText('Card')).toHaveClass('custom-card');
  });

  it('renders header, title and content structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Đăng nhập</CardTitle>
        </CardHeader>
        <CardContent>Nội dung biểu mẫu</CardContent>
      </Card>
    );
    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(screen.getByText('Nội dung biểu mẫu')).toBeInTheDocument();
  });
});
