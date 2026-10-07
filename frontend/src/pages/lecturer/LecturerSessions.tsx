import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, QrCode, Square } from 'lucide-react';
import { attendanceApi, classGroupApi, courseApi, venueApi } from '@/api/endpoints';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { FormInput } from '@/components/forms/FormInput';
import { FormSelect } from '@/components/forms/FormSelect';
import { StatusBadge } from '@/components/common/StatusBadge';
import { QRDisplay } from '@/components/attendance/QRDisplay';
import { useToast } from '@/contexts/ToastContext';
import type { AttendanceSession } from '@/types';

type SessionForm = {
  courseId: string;
  classGroupId: string;
  venueId: string;
  radius: string;
  startTime: string;
  endTime: string;
  qrType: 'static' | 'rotating';
  qrRefreshInterval: string;
  latitude: number | null;
  longitude: number | null;
};

const localDateTimeValue = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const freshForm = (): SessionForm => {
  const start = new Date();
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const end = new Date(start.getTime() + 90 * 60_000);
  return {
    courseId: '',
    classGroupId: '',
    venueId: '',
    radius: '75',
    startTime: localDateTimeValue(start),
    endTime: localDateTimeValue(end),
    qrType: 'static',
    qrRefreshInterval: '60',
    latitude: null,
    longitude: null,
  };
};

export function LecturerSessions() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<SessionForm>(freshForm);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [locatingCentre, setLocatingCentre] = useState(false);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const sessionsQuery = useQuery({
    queryKey: ['lecturer-sessions', searchQuery, page],
    queryFn: () => attendanceApi.sessions({ search: searchQuery, page }),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });
  const coursesQuery = useQuery({
    queryKey: ['lecturer-courses'],
    queryFn: () => courseApi.all(),
  });
  const groupsQuery = useQuery({
    queryKey: ['lecturer-class-groups', form.courseId],
    queryFn: () => classGroupApi.all({ course: form.courseId }),
    enabled: Boolean(form.courseId),
  });
  const venuesQuery = useQuery({
    queryKey: ['venues'],
    queryFn: () => venueApi.all(),
  });

  const sessions = sessionsQuery.data?.results ?? [];
  const courses = coursesQuery.data?.results ?? [];
  const groups = groupsQuery.data?.results ?? [];
  const venues = venuesQuery.data?.results ?? [];
  const qrSession = sessions.find((session) => session.id === qrSessionId) ?? null;
  const filtered = sessions;

  const createMutation = useMutation({
    mutationFn: () => attendanceApi.createSession({
      classGroupId: form.classGroupId,
      venueId: form.venueId,
      radius: Number(form.radius),
      latitude: form.latitude ?? undefined,
      longitude: form.longitude ?? undefined,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
      qrType: form.qrType,
      qrRefreshInterval: form.qrType === 'rotating' ? Number(form.qrRefreshInterval) : null,
    }),
    onSuccess: async (created) => {
      setSearchQuery(''); setPage(1);
      await queryClient.invalidateQueries({ queryKey: ['lecturer-sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['lecturer-dashboard'] });
      setShowCreate(false);
      setQrSessionId(created.id);
      showToast('Attendance session created successfully.', 'success');
    },
    onError: () => showToast('The attendance session could not be created. Check the selected class and times.', 'error'),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => attendanceApi.closeSession(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lecturer-sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['lecturer-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['lecturer-session-report'] });
      showToast('Attendance session closed.', 'success');
    },
    onError: () => showToast('The session could not be closed.', 'error'),
  });

  const openCreate = () => {
    const initial = freshForm();
    if (courses[0]) initial.courseId = courses[0].id;
    if (venues[0]) {
      initial.venueId = venues[0].id;
      initial.radius = String(venues[0].radius);
      initial.latitude = venues[0].latitude;
      initial.longitude = venues[0].longitude;
    }
    setForm(initial);
    setShowCreate(true);
  };

  const selectVenue = (venueId: string) => {
    const venue = venues.find((item) => item.id === venueId);
    setForm((current) => ({
      ...current,
      venueId,
      radius: venue ? String(venue.radius) : current.radius,
      latitude: venue?.latitude ?? null,
      longitude: venue?.longitude ?? null,
    }));
  };

  const captureVenueCentre = () => {
    if (!navigator.geolocation) {
      showToast('This browser does not support location capture.', 'error');
      return;
    }
    setLocatingCentre(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocatingCentre(false);
        showToast('Venue centre captured from your current location.', 'success');
      },
      () => {
        setLocatingCentre(false);
        showToast('Location could not be captured. Check your browser permission.', 'error');
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  const canCreate = Boolean(
    form.courseId
    && form.classGroupId
    && form.venueId
    && form.latitude !== null
    && form.longitude !== null
    && form.startTime
    && form.endTime
    && Number(form.radius) >= 10
    && new Date(form.endTime) > new Date(form.startTime),
  );

  return (
    <div className="space-y-7 animate-fade-in">
      <header className="flex flex-col items-start justify-between gap-5 border-b border-glass-border pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="registry-label rule-title">Attendance / Session register</p>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Attendance sessions</h1>
          <p className="mt-2 text-sm text-text-muted">Schedule classes, generate secure QR tokens, and close completed registers.</p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={openCreate}
          disabled={coursesQuery.isLoading || courses.length === 0}
        >
          Create session
        </Button>
      </header>

      {!coursesQuery.isLoading && courses.length === 0 && (
        <div className="border-l-2 border-warning bg-warning/5 px-5 py-4">
          <p className="text-sm font-semibold text-text-main">No Course Assigned</p>
          <p className="mt-1 text-xs text-text-muted">An administrator must assign a course before you can create an attendance session.</p>
        </div>
      )}

      <DataTable
        columns={[
          {
            key: 'course', header: 'Course', render: (session: AttendanceSession) => (
              <div>
                <p className="font-display text-lg font-extrabold text-primary">{session.courseCode}</p>
                <p className="text-xs text-text-muted">{session.classGroupName}</p>
              </div>
            ),
          },
          {
            key: 'venue', header: 'Venue', render: (session: AttendanceSession) => (
              <span className="text-sm text-text-muted">{session.venueName}</span>
            ),
          },
          {
            key: 'time', header: 'Date and time', render: (session: AttendanceSession) => (
              <div className="text-xs text-text-dim">
                <p>{new Date(session.startTime).toLocaleDateString()}</p>
                <p className="mt-1 font-mono">
                  {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ),
          },
          {
            key: 'attendance', header: 'Attendance', render: (session: AttendanceSession) => (
              <span className="text-sm font-medium">{session.checkedInCount}/{session.totalEnrolled}</span>
            ),
          },
          {
            key: 'status', header: 'Status', render: (session: AttendanceSession) => (
              <StatusBadge status={session.status} />
            ),
          },
        ]}
        data={filtered}
        keyExtractor={(session) => session.id}
        onRowClick={session => navigate('/lecturer/reports/' + session.id)}
        isLoading={sessionsQuery.isLoading}
        searchable
        searchPlaceholder="Search sessions..."
        onSearch={value => { setSearchQuery(value); setPage(1); }}
        pagination={{ page, totalPages: Math.ceil((sessionsQuery.data?.count ?? 0) / 50), onPageChange: setPage }}
        emptyTitle={searchQuery ? 'No matching sessions' : 'No Attendance Sessions'}
        emptyDescription={searchQuery ? 'Try another search term.' : 'Create a session to add it to your teaching schedule.'}
        rowActions={(session) => (
          <>
            {!['closed', 'expired'].includes(session.status) && (
              <button
                onClick={() => closeMutation.mutate(session.id)}
                disabled={closeMutation.isPending}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                title="Close session"
              >
                <Square className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => setQrSessionId(session.id)} className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-primary/10 hover:text-primary" title="Display QR code">
              <QrCode className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <Modal
        isOpen={showCreate}
        onClose={() => !createMutation.isPending && setShowCreate(false)}
        title="Create attendance session"
        description="The session will appear in today's schedule when its date is today."
        size="lg"
        footer={(
          <>
            <Button variant="secondary" disabled={createMutation.isPending} onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button disabled={!canCreate} isLoading={createMutation.isPending} onClick={() => createMutation.mutate()}>Create session</Button>
          </>
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Course"
            value={form.courseId}
            onChange={(event) => setForm((current) => ({ ...current, courseId: event.target.value, classGroupId: '' }))}
            options={courses.map((course) => ({ value: course.id, label: `${course.code} — ${course.name}` }))}
            placeholder="Select an assigned course"
            required
          />
          <FormSelect
            label="Class group"
            value={form.classGroupId}
            onChange={(event) => setForm((current) => ({ ...current, classGroupId: event.target.value }))}
            options={groups.map((group) => ({ value: group.id, label: group.name }))}
            placeholder={groupsQuery.isLoading ? 'Loading classes...' : 'Select a class'}
            disabled={!form.courseId || groupsQuery.isLoading}
            required
          />
          <FormSelect
            label="Venue"
            value={form.venueId}
            onChange={(event) => selectVenue(event.target.value)}
            options={venues.map((venue) => ({ value: venue.id, label: venue.name }))}
            placeholder="Select a venue"
            required
          />
          <FormInput
            label="Geofence radius (metres)"
            type="number"
            min={10}
            max={500}
            value={form.radius}
            onChange={(event) => setForm((current) => ({ ...current, radius: event.target.value }))}
            required
          />
          <div className="sm:col-span-2 flex flex-col gap-3 border border-glass-border bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-main">Venue geofence centre</p>
              <p className="mt-1 text-xs text-text-muted">
                {form.latitude !== null && form.longitude !== null
                  ? `${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}`
                  : 'No coordinates saved for this venue. Capture them while inside the lecture room.'}
              </p>
            </div>
            <Button type="button" size="sm" variant="secondary" isLoading={locatingCentre} leftIcon={<MapPin className="h-4 w-4" />} onClick={captureVenueCentre}>
              Use current location
            </Button>
          </div>
          <FormInput
            label="Start time"
            type="datetime-local"
            value={form.startTime}
            onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
            required
          />
          <FormInput
            label="End time"
            type="datetime-local"
            value={form.endTime}
            min={form.startTime}
            onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
            required
          />
          <FormSelect
            label="QR type"
            value={form.qrType}
            onChange={(event) => setForm((current) => ({ ...current, qrType: event.target.value as SessionForm['qrType'] }))}
            options={[
              { value: 'static', label: 'Static QR' },
              { value: 'rotating', label: 'Rotating QR' },
            ]}
          />
          {form.qrType === 'rotating' && (
            <FormInput
              label="Refresh interval (seconds)"
              type="number"
              min={15}
              max={600}
              value={form.qrRefreshInterval}
              onChange={(event) => setForm((current) => ({ ...current, qrRefreshInterval: event.target.value }))}
              required
            />
          )}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(qrSession)}
        onClose={() => setQrSessionId(null)}
        title={qrSession ? `${qrSession.courseCode} attendance QR` : 'Attendance QR'}
        description={qrSession ? `${qrSession.classGroupName} · ${qrSession.venueName}` : undefined}
        size="lg"
      >
        {qrSession && (
          <QRDisplay
            token={`${window.location.origin}/student/check-in?token=${encodeURIComponent(qrSession.qrToken)}`}
            isRotating={qrSession.qrType === 'rotating'}
            refreshInterval={qrSession.qrRefreshInterval ?? 60}
            onRefresh={() => void sessionsQuery.refetch()}
          />
        )}
      </Modal>
    </div>
  );
}
