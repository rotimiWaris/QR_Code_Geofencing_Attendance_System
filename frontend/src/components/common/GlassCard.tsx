import { cn } from '@/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function GlassCard({ children, className, padding = 'md', hover = false }: GlassCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-glass-border bg-background-elevated shadow-glass',
        paddingClasses[padding],
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40',
        className
      )}
    >
      {children}
    </div>
  );
}
