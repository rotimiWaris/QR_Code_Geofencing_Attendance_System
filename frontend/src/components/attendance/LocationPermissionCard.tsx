import { MapPin, Navigation, AlertTriangle } from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { Button } from '@/components/common/Button';

interface LocationPermissionCardProps {
  onRequest: () => void;
  onManual?: () => void;
  isLoading?: boolean;
  denied?: boolean;
}

export function LocationPermissionCard({ onRequest, onManual, isLoading, denied }: LocationPermissionCardProps) {
  if (denied) {
    return (
      <GlassCard className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 border border-danger/20">
          <AlertTriangle className="h-8 w-8 text-danger" />
        </div>
        <h3 className="text-lg font-semibold text-text-main">Location Access Denied</h3>
        <p className="mt-2 text-sm text-text-muted max-w-sm mx-auto">
          Location permission is required to verify you are within the lecture venue geofence.
        </p>
        <div className="mt-4 space-y-2 text-sm text-text-muted bg-glass-light rounded-xl p-4 border border-glass-border text-left">
          <p className="font-medium text-text-main">To enable location:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open your browser settings</li>
            <li>Find "Site Settings" or "Privacy & Security"</li>
            <li>Allow location access for this site</li>
            <li>Refresh the page and try again</li>
          </ol>
        </div>
        {onManual && (
          <Button variant="secondary" onClick={onManual} className="mt-4">
            Enter Location Manually
          </Button>
        )}
      </GlassCard>
    );
  }

  return (
    <GlassCard className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 animate-pulse-slow">
        <MapPin className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-text-main">Enable Location</h3>
      <p className="mt-2 text-sm text-text-muted max-w-sm mx-auto">
        We need your location to verify you are within the allowed area for this lecture.
        Your location data is only used for attendance verification.
      </p>
      <Button
        onClick={onRequest}
        isLoading={isLoading}
        leftIcon={<Navigation className="h-4 w-4" />}
        className="mt-6"
      >
        Allow Location Access
      </Button>
    </GlassCard>
  );
}
