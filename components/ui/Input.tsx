import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full bg-transparent border-2 border-line text-fg',
          'font-body text-base px-4 h-14 min-h-[56px]',
          'placeholder:text-fg-muted placeholder:font-mono placeholder:text-sm placeholder:tracking-wide',
          'focus:outline-none focus:border-fg',
          'disabled:opacity-50 disabled:pointer-events-none',
          'transition-colors',
          invalid && 'border-blood focus:border-blood',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
