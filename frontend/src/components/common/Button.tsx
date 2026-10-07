import { cn } from '@/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary text-background hover:bg-primary-dark shadow-[2px_3px_0_rgb(var(--text-main)/.16)] border-primary',
    secondary: 'bg-background-card text-text-main hover:bg-primary/5 border-glass-border',
    ghost: 'bg-transparent text-text-muted hover:bg-primary/10 hover:text-text-main border-transparent',
    danger: 'bg-danger/90 text-white hover:bg-danger shadow-[0_0_20px_rgba(239,68,68,0.15)] border-transparent',
    warning: 'bg-warning/90 text-white hover:bg-warning shadow-[0_0_20px_rgba(245,158,11,0.15)] border-transparent',
    success: 'bg-success/90 text-white hover:bg-success shadow-[0_0_20px_rgba(34,197,94,0.15)] border-transparent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-all duration-200 active:translate-y-px',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {!isLoading && leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
