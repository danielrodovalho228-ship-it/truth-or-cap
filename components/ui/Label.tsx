import { forwardRef, type LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'block font-mono text-[10px] tracking-[0.4em] uppercase text-fg-muted mb-2',
          className
        )}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';
