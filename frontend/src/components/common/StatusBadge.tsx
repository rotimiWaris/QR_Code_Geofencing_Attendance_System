import { cn, getStatusColor } from '@/utils';
import { CheckCircle, XCircle, AlertCircle, Info, HelpCircle, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}

const iconMap: Record<string, React.ElementType> = {
  present: CheckCircle,
  active: CheckCircle,
  success: CheckCircle,
  absent: XCircle,
  closed: XCircle,
  danger: XCircle,
  late: Clock,
  paused: Clock,
  warning: AlertCircle,
  excused: Info,
  scheduled: Info,
  info: Info,
  expired: HelpCircle,
};

export function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const Icon = iconMap[status.toLowerCase()] || HelpCircle;
  const displayLabel = label || status;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium capitalize',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        getStatusColor(status.toLowerCase())
      )}
    >
      <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      {displayLabel}
    </span>
  );
}
