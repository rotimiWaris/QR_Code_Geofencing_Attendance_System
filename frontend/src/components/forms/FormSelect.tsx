import { forwardRef } from 'react';
import { cn } from '@/utils';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  helper?: string;
  options: Option[];
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, helper, options, placeholder, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-text-main">
            {label}
            {props.required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full appearance-none rounded-lg border bg-background-card px-4 py-3 text-sm text-text-main',
              'focus:border-primary/50 focus:ring-1 focus:ring-primary/30 focus:outline-none',
              'transition-all duration-200 pr-10',
              error
                ? 'border-danger/50 focus:border-danger focus:ring-danger/30'
                : 'border-glass-border hover:border-primary/40',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim pointer-events-none" />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        {helper && !error && <p className="text-xs text-text-muted">{helper}</p>}
      </div>
    );
  }
);
FormSelect.displayName = 'FormSelect';
