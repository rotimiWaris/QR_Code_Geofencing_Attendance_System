import { GlassCard } from './GlassCard';
import { cn } from '@/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  color?: 'blue' | 'cyan' | 'violet' | 'green' | 'amber' | 'red';
}

const colorMap = {
  blue: 'bg-primary/15 text-primary',
  cyan: 'bg-accent-cyan/15 text-accent-cyan',
  violet: 'bg-accent-violet/15 text-accent-violet',
  green: 'bg-success/15 text-success',
  amber: 'bg-warning/15 text-warning',
  red: 'bg-danger/15 text-danger',
};

const glowMap = {
  blue: 'hover:shadow-glow-blue',
  cyan: 'hover:shadow-glow-cyan',
  violet: 'hover:shadow-glow-violet',
  green: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]',
  amber: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
  red: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'blue' }: StatCardProps) {
  return (
    <GlassCard hover className={cn(glowMap[color])}>
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-muted">{title}</p>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-text-main tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
          </div>
          {trend && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-xs font-semibold',
                  trend.isPositive ? 'text-success' : 'text-danger'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-text-dim">vs last week</span>
            </div>
          )}
        </div>
        <div className={cn('rounded-xl p-3', colorMap[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </GlassCard>
  );
}
