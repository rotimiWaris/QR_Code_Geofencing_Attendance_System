import { MapPin } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { cn } from '@/utils';

interface GeofenceIndicatorProps {
  distance: number;
  radius: number;
  accuracy: number;
  isInside: boolean;
}

export function GeofenceIndicator({ distance, radius, accuracy, isInside }: GeofenceIndicatorProps) {
  const percentage = Math.min(100, Math.max(0, (1 - distance / radius) * 100));

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            'rounded-lg p-2',
            isInside ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
          )}>
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-main">
              {isInside ? 'Inside Geofence' : 'Outside Geofence'}
            </p>
            <p className="text-xs text-text-muted">
              {distance.toFixed(1)}m from venue center
            </p>
          </div>
        </div>
        <div className={cn(
          'rounded-full px-3 py-1 text-xs font-bold',
          isInside ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
        )}>
          {isInside ? 'WITHIN RANGE' : 'OUT OF RANGE'}
        </div>
      </div>

      <div className="relative h-3 rounded-full bg-glass-light overflow-hidden border border-glass-border">
        <div
          className={cn(
            'absolute top-0 left-0 h-full rounded-full transition-all duration-1000',
            isInside ? 'bg-success' : 'bg-danger'
          )}
          style={{ width: `${percentage}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-white/50"
          style={{ left: `${(radius / (radius + 50)) * 100}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-4 text-center">
        <div className="rounded-xl bg-glass-light p-2 border border-glass-border">
          <p className="text-xs text-text-muted">Distance</p>
          <p className="text-sm font-bold text-text-main">{distance.toFixed(1)}m</p>
        </div>
        <div className="rounded-xl bg-glass-light p-2 border border-glass-border">
          <p className="text-xs text-text-muted">Radius</p>
          <p className="text-sm font-bold text-text-main">{radius}m</p>
        </div>
        <div className="rounded-xl bg-glass-light p-2 border border-glass-border">
          <p className="text-xs text-text-muted">Accuracy</p>
          <p className={cn(
            'text-sm font-bold',
            accuracy < 20 ? 'text-success' : accuracy < 50 ? 'text-warning' : 'text-danger'
          )}>
            {accuracy.toFixed(1)}m
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
