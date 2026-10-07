import { Inbox } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title = 'No data found',
  description = 'There are no items to display at the moment.',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <GlassCard className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-2xl bg-glass-light p-4 border border-glass-border">
        {icon || <Inbox className="h-8 w-8 text-text-dim" />}
      </div>
      <h3 className="text-lg font-semibold text-text-main">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </GlassCard>
  );
}
