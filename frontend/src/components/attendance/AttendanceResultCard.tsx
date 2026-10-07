import {
  CheckCircle, AlertCircle, MapPinOff, Clock,
  QrCode, UserX, MapPin, ShieldAlert
} from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { Button } from '@/components/common/Button';
import { cn } from '@/utils';

type ResultType =
  | 'success'
  | 'error'
  | 'already_marked'
  | 'outside_area'
  | 'gps_low'
  | 'expired'
  | 'not_active'
  | 'invalid_qr'
  | 'not_enrolled'
  | 'venue_unconfigured'
  | 'permission_denied';

interface AttendanceResultCardProps {
  type: ResultType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

const resultConfig: Record<ResultType, {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  error: {
    icon: AlertCircle,
    title: 'Check-in Failed',
    description: 'An unexpected error prevented check-in. Please try again.',
    color: 'text-danger',
    bgColor: 'bg-danger/15',
    borderColor: 'border-danger/20',
  },
  success: {
    icon: CheckCircle,
    title: 'Attendance Recorded',
    description: 'Your attendance has been successfully recorded for this session.',
    color: 'text-success',
    bgColor: 'bg-success/15',
    borderColor: 'border-success/20',
  },
  already_marked: {
    icon: Clock,
    title: 'Already Marked',
    description: 'You have already checked in for this session. No further action is needed.',
    color: 'text-warning',
    bgColor: 'bg-warning/15',
    borderColor: 'border-warning/20',
  },
  outside_area: {
    icon: MapPinOff,
    title: 'Outside Allowed Area',
    description: 'You appear to be outside the lecture venue geofence. Please move closer to the venue and try again.',
    color: 'text-danger',
    bgColor: 'bg-danger/15',
    borderColor: 'border-danger/20',
  },
  gps_low: {
    icon: ShieldAlert,
    title: 'GPS Accuracy Too Low',
    description: 'Your device GPS accuracy is insufficient. Please ensure you have a clear view of the sky and try again.',
    color: 'text-warning',
    bgColor: 'bg-warning/15',
    borderColor: 'border-warning/20',
  },
  expired: {
    icon: Clock,
    title: 'Session Expired',
    description: 'This attendance session has already ended. Contact your lecturer if you believe this is an error.',
    color: 'text-danger',
    bgColor: 'bg-danger/15',
    borderColor: 'border-danger/20',
  },
  not_active: {
    icon: Clock,
    title: 'Session Not Active',
    description: 'This session has not started or is currently paused. Scan the QR code again when your lecturer opens attendance.',
    color: 'text-warning',
    bgColor: 'bg-warning/15',
    borderColor: 'border-warning/20',
  },
  invalid_qr: {
    icon: QrCode,
    title: 'Invalid QR Code',
    description: 'The QR code you scanned is invalid or has been tampered with. Please scan the current code displayed by your lecturer.',
    color: 'text-danger',
    bgColor: 'bg-danger/15',
    borderColor: 'border-danger/20',
  },
  not_enrolled: {
    icon: UserX,
    title: 'Not Enrolled',
    description: 'You are not enrolled in this course. Please contact the administration office to resolve this issue.',
    color: 'text-danger',
    bgColor: 'bg-danger/15',
    borderColor: 'border-danger/20',
  },
  venue_unconfigured: {
    icon: MapPinOff,
    title: 'Venue Not Configured',
    description: 'The lecturer has not configured a geofence centre for this session. Please notify the lecturer.',
    color: 'text-danger',
    bgColor: 'bg-danger/15',
    borderColor: 'border-danger/20',
  },
  permission_denied: {
    icon: MapPin,
    title: 'Location Permission Denied',
    description: 'Location access is required for attendance verification. Please enable location permissions in your browser settings.',
    color: 'text-danger',
    bgColor: 'bg-danger/15',
    borderColor: 'border-danger/20',
  },
};

export function AttendanceResultCard({ type, title, message, onRetry, onGoHome }: AttendanceResultCardProps) {
  const config = resultConfig[type];
  const Icon = config.icon;

  return (
    <GlassCard className="text-center py-8">
      <div className={cn(
        'mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border',
        config.bgColor,
        config.borderColor
      )}>
        <Icon className={cn('h-10 w-10', config.color)} />
      </div>
      <h2 className={cn('text-2xl font-bold', config.color)}>{title || config.title}</h2>
      <p className="mt-3 text-sm text-text-muted max-w-sm mx-auto leading-relaxed">
        {message || config.description}
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        {onRetry && (
          <Button variant="secondary" onClick={onRetry} leftIcon={<AlertCircle className="h-4 w-4" />}>
            Try Again
          </Button>
        )}
        {onGoHome && (
          <Button onClick={onGoHome} variant={type === 'success' ? 'success' : 'primary'}>
            Go to Dashboard
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
