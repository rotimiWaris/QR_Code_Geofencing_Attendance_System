import { forwardRef } from 'react';
import { cn } from '@/utils';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helper, leftIcon, rightIcon, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-text-main">
            {label}
            {props.required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded-lg border bg-background-card px-4 py-3 text-sm text-text-main placeholder:text-text-dim',
              'focus:border-primary/50 focus:ring-1 focus:ring-primary/30 focus:outline-none',
              'transition-all duration-200',
              error
                ? 'border-danger/50 focus:border-danger focus:ring-danger/30'
                : 'border-glass-border hover:border-primary/40',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        {helper && !error && <p className="text-xs text-text-muted">{helper}</p>}
      </div>
    );
  }
);
FormInput.displayName = 'FormInput';
