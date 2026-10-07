import { AlertTriangle, RefreshCw } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error while loading the data. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <GlassCard className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-2xl bg-danger/10 p-4 border border-danger/20">
        <AlertTriangle className="h-8 w-8 text-danger" />
      </div>
      <h3 className="text-lg font-semibold text-text-main">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} leftIcon={<RefreshCw className="h-4 w-4" />} className="mt-6">
          Try Again
        </Button>
      )}
    </GlassCard>
  );
}
