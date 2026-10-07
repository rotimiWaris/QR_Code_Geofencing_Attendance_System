import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Loader2, Navigation, QrCode, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { attendanceApi } from '@/api/endpoints';
import { AttendanceResultCard } from '@/components/attendance/AttendanceResultCard';
import { GeofenceIndicator } from '@/components/attendance/GeofenceIndicator';
import { LocationPermissionCard } from '@/components/attendance/LocationPermissionCard';
import { Button } from '@/components/common/Button';
import { GlassCard } from '@/components/common/GlassCard';
import { AvailableSessions } from '@/components/attendance/AvailableSessions';
import { QRScanner } from '@/components/attendance/QRScanner';
import type { ResolvedAttendanceSession } from '@/types';

type CheckInStep = 'scan' | 'validate' | 'locating' | 'result';
type ResultType = Parameters<typeof AttendanceResultCard>[0]['type'];
type ApiFailure = { code?: string; title?: string; message?: string; distance?: number; radius?: number };

const resultCodes: ResultType[] = [
  'already_marked', 'outside_area', 'gps_low', 'expired', 'not_active',
  'invalid_qr', 'not_enrolled', 'venue_unconfigured', 'permission_denied',
];

const normalizeToken = (value: string) => {
  const trimmed = value.trim();
  try {
    return new URL(trimmed).searchParams.get('token') || trimmed;
  } catch {
    return trimmed;
  }
};

const failureFrom = (error: unknown): ApiFailure => {
  if (axios.isAxiosError(error)) {
    if (!error.response) return {
      code: 'error',
      title: error.code === 'ECONNABORTED' ? 'Server Request Timed Out' : 'Connection Failed',
      message: error.code === 'ECONNABORTED'
        ? 'The attendance server did not respond within 30 seconds. Check your connection and try again.'
        : 'Could not reach the attendance server. Check your internet connection and that the Django server is running. This is not a GPS accuracy error.',
    };
    const data = error.response.data;
    const status = error.response.status;
    const messages = (value: unknown): string[] => {
      if (typeof value === 'string') return [value];
      if (Array.isArray(value)) return value.flatMap(messages);
      if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => messages(item).map(message => key === 'detail' || key === 'non_field_errors' ? message : `${key}: ${message}`));
      return [];
    };
    const payload = data && typeof data === 'object' ? data : {};
    return {
      code: payload.code,
      title: resultCodes.includes(payload.code) ? undefined : status >= 500 ? 'Attendance Server Error' : 'Request Rejected',
      message: typeof payload.message === 'string' ? payload.message : typeof payload.detail === 'string' ? payload.detail : messages(payload.errors).join(' ') || `The attendance server returned HTTP ${status}. Please try again.`,
      distance: payload.distance,
      radius: payload.radius,
    };
  }
  return { code: 'error', title: 'Check-in Failed', message: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.' };
};

export function StudentCheckIn() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialToken = searchParams.get('token') ?? '';
  const initialSessionId = searchParams.get('session') ?? '';
  const autoVerified = useRef('');
  const [step, setStep] = useState<CheckInStep>('scan');
  const [scanning, setScanning] = useState(Boolean(initialSessionId));
  const [qrToken, setQrToken] = useState('');
  const [session, setSession] = useState<ResolvedAttendanceSession | null>(null);
  const [result, setResult] = useState<ResultType>('success');
  const [resultMessage, setResultMessage] = useState<string>();
  const [resultTitle, setResultTitle] = useState<string>();
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const showFailure = (failure: ApiFailure, fallback: ResultType = 'error') => {
    const next = resultCodes.includes(failure.code as ResultType) ? failure.code as ResultType : fallback;
    if (typeof failure.distance === 'number') setDistance(failure.distance);
    setResult(next);
    setResultMessage(failure.message);
    setResultTitle(failure.title);
    setStep('result');
  };

  const verifyToken = async (rawToken: string) => {
    const token = normalizeToken(rawToken);
    if (!token) return;
    setScanning(false);
    setIsVerifying(true);
    try {
      const response = await attendanceApi.resolveSession(token, initialSessionId || undefined);
      setQrToken(token);
      setSession(response.session);
      setStep('validate');
    } catch (error) {
      showFailure(failureFrom(error));
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const key = initialToken || (initialSessionId ? 'session:' + initialSessionId : '');
    if (!key) autoVerified.current = '';
    if (initialToken && autoVerified.current !== key) {
      autoVerified.current = key;
      void verifyToken(initialToken);
    } else if (initialSessionId && autoVerified.current !== key) {
      autoVerified.current = key;
      setScanning(true);
      setStep('scan');
    }
  }, [initialToken, initialSessionId]);

  const requestLocation = () => {
    if (!window.isSecureContext) {
      showFailure({ code: 'permission_denied', title: 'Secure Connection Required', message: 'Browser location requires HTTPS or localhost. Open this site over HTTPS, then try again.' });
      return;
    }
    if (!navigator.geolocation) {
      showFailure({ code: 'error', title: 'Location Not Supported', message: 'This browser does not support location access. Use a browser with geolocation support.' });
      return;
    }
    setResultMessage(undefined);
    setResultTitle(undefined);
    setDistance(null);
    setStep('locating');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const captured = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setLocation(captured);
        try {
          const response = await attendanceApi.checkIn({
            qrToken,
            ...(initialSessionId ? { sessionId: initialSessionId } : {}),
            latitude: captured.lat,
            longitude: captured.lng,
            accuracy: captured.accuracy,
            timestamp: new Date().toISOString(),
          });
          setDistance(response.record.distanceFromVenue ?? 0);
          setResult('success');
          setStep('result');
        } catch (error) {
          showFailure(failureFrom(error));
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          showFailure({ code: 'permission_denied', message: `${error.message || 'Location access was denied.'} Allow location for this site in your browser settings, then retry.` });
        } else if (error.code === error.TIMEOUT) {
          showFailure({ code: 'error', title: 'Location Request Timed Out', message: `${error.message || 'Location capture timed out.'} No GPS position was received within 15 seconds. Check that device location is enabled and try again.` });
        } else {
          showFailure({ code: 'error', title: 'Location Unavailable', message: `${error.message || 'Your device could not determine its location.'} Check device location settings and try again.` });
        }
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  const reset = () => {
    setSearchParams({});
    setStep('scan');
    setSession(null);
    setQrToken('');
    setScanning(false);
    setLocation(null);
    setDistance(null);
    setResultMessage(undefined);
    setResultTitle(undefined);
  };

  if (step === 'scan') {
    return (
      <div className="mx-auto max-w-lg space-y-6 animate-fade-in">
        <header className="text-center">
          <p className="registry-label">Secure attendance</p>
          <h1 className="mt-3 text-3xl font-extrabold text-text-main">Check in to a class</h1>
          <p className="mt-2 text-sm text-text-muted">Scan your lecturer's classroom QR, then allow GPS to verify your location.</p>
        </header>
        {isVerifying && <p className="text-center text-sm text-text-muted">Loading session...</p>}
        {!scanning && !isVerifying && <AvailableSessions />}
        <GlassCard className="py-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <QrCode className="h-10 w-10 text-primary" />
          </div>
          {scanning ? <><QRScanner onScan={value => void verifyToken(value)} /><Button className="mt-4" variant="ghost" onClick={() => setScanning(false)}>Close scanner</Button></> : <Button disabled={isVerifying} onClick={() => setScanning(true)}>Open QR scanner</Button>}
        </GlassCard>
        <div className="flex gap-3 border-l-2 border-primary bg-primary/5 px-5 py-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-xs leading-5 text-text-muted">A valid classroom QR is required for every check-in. Location, enrollment, and duplicate attendance are validated by the server.</p>
        </div>
      </div>
    );
  }

  if (step === 'validate' && session) {
    return (
      <div className="mx-auto max-w-lg space-y-6 animate-fade-in">
        <h1 className="text-center text-2xl font-bold text-text-main">Confirm session</h1>
        <GlassCard>
          <div className="space-y-4">
            {[
              ['Course', `${session.courseCode} — ${session.courseName}`],
              ['Class', session.classGroupName],
              ['Lecturer', session.lecturerName],
              ['Venue', session.venueName],
              ['Time', `${new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`],
              ['Allowed radius', `${session.radius} metres`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-5 border-b border-glass-border pb-3 last:border-0 last:pb-0">
                <span className="text-sm text-text-muted">{label}</span>
                <span className="text-right text-sm font-medium text-text-main">{value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
        <LocationPermissionCard onRequest={requestLocation} />
      </div>
    );
  }

  if (step === 'locating') {
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center animate-fade-in">
        <GlassCard className="py-12">
          <div className="relative mx-auto mb-6 h-24 w-24">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
              <Navigation className="h-10 w-10 animate-pulse text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-text-main">Verifying your location...</h3>
          <p className="mt-2 text-sm text-text-muted">Keep this page open while your GPS position is checked.</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-text-dim">
            <Loader2 className="h-3 w-3 animate-spin" /> Requesting high-accuracy GPS
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 animate-fade-in">
      {session && location && distance !== null && ['success', 'outside_area'].includes(result) && (
        <GeofenceIndicator
          distance={distance}
          radius={session.radius}
          accuracy={location.accuracy}
          isInside={result === 'success'}
        />
      )}
      <AttendanceResultCard
        type={result}
        title={resultTitle}
        message={resultMessage}
        onRetry={['error', 'outside_area', 'gps_low', 'permission_denied', 'invalid_qr', 'not_active'].includes(result) ? reset : undefined}
        onGoHome={() => { window.location.href = '/student/dashboard'; }}
      />
    </div>
  );
}
