import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base
          'border-2 font-display font-black uppercase tracking-tight transition-colors',
          'disabled:opacity-50 disabled:pointer-events-none',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mustard',

          // Variants
          variant === 'primary' &&
            'border-fg bg-fg text-bg hover:bg-bg hover:text-fg',
          variant === 'secondary' &&
            'border-fg bg-transparent text-fg hover:bg-fg hover:text-bg',
          variant === 'ghost' &&
            'border-transparent bg-transparent text-fg hover:bg-bg-card',
          variant === 'destructive' &&
            'border-blood bg-blood text-fg hover:bg-bg hover:text-blood',

          // Sizes
          size === 'sm' && 'px-3 py-1.5 text-sm',
          size === 'md' && 'px-5 py-3 text-base',
          size === 'lg' && 'px-6 py-4 text-lg',
          size === 'xl' && 'px-8 py-5 text-2xl',

          // Width
          fullWidth && 'w-full',

          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
