'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

export type AlertVariant = 'error' | 'success' | 'info';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

const variantStyles: Record<AlertVariant, string> = {
  error: 'border-danger/30 bg-danger/10 text-danger',
  success: 'border-success/30 bg-success/10 text-success',
  info: 'border-primary/30 bg-primary/10 text-primary',
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', children, ...props }, ref) => (
    <div
      ref={ref}
      role={variant === 'error' ? 'alert' : undefined}
      className={cn('rounded-lg border px-4 py-3 text-sm', variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  )
);

Alert.displayName = 'Alert';

export { Alert };
