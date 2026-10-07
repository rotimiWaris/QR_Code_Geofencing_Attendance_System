import { ArrowRight, BookOpen, CalendarX2, Clock3, MapPin, Plus, RefreshCw, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { attendanceApi } from '@/api/endpoints';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';

const time = (value: string) => new Date(value).toLocaleTimeString([], {
  hour: '2-digit',
  minute: '2-digit',
});

export function LecturerDashboard() {
  const { user } = useAuth();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const dashboard = useQuery({ queryKey: ['lecturer-dashboard', user?.id, start.toISOString()], queryFn: () => attendanceApi.lecturerDashboard(start.toISOString(), end.toISOString()), refetchInterval: 15_000, staleTime: 0 });
  const courses = dashboard.data?.courses ?? [];
  const todaySessions = dashboard.data?.todaySessions ?? [];
  const activeSession = todaySessions.find((session) => session.status === 'active');
  const expectedStudents = todaySessions.reduce((sum, session) => sum + session.totalEnrolled, 0);
  const title = user?.lecturerProfile?.title?.trim();
  const displayName = [title, user?.firstName].filter(Boolean).join(' ');
  const isLoading = dashboard.isLoading;
  const isError = dashboard.isError;

  if (isError) {
    return (
      <div className="border border-glass-border bg-background-elevated p-10 text-center animate-fade-in">
        <RefreshCw className="mx-auto h-8 w-8 text-danger" />
        <h1 className="mt-4 text-xl font-bold">Teaching dashboard could not be loaded</h1>
        <p className="mt-2 text-sm text-text-muted">Make sure the Django server is running and try again.</p>
        <Button className="mt-5" variant="secondary" onClick={() => {
          void dashboard.refetch();
        }}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col justify-between gap-5 border-b border-glass-border pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="registry-label rule-title">01 / Teaching desk</p>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Today{displayName ? ` with ${displayName}` : ''}</h1>
          <p className="mt-2 text-sm text-text-muted">
            {isLoading
              ? 'Loading your teaching record...'
              : `${todaySessions.length} scheduled session${todaySessions.length === 1 ? '' : 's'} · ${expectedStudents} students expected`}
          </p>
        </div>
        <Link to="/lecturer/sessions">
          <Button leftIcon={<Plus className="h-4 w-4" />}>New attendance session</Button>
        </Link>
      </header>

      {activeSession && (
        <section className="grid overflow-hidden border border-primary bg-primary text-background md:grid-cols-[1fr_auto]">
          <div className="p-7 sm:p-9">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">Live session</span>
              <span className="h-2 w-2 animate-pulse rounded-full bg-background" />
            </div>
            <p className="mt-7 font-display text-4xl font-extrabold">{activeSession.courseCode}</p>
            <p className="mt-1 text-lg">{activeSession.classGroupName}</p>
            <div className="mt-7 flex flex-wrap gap-6 text-xs">
              <span className="flex gap-2"><MapPin className="h-4 w-4" />{activeSession.venueName}</span>
              <span className="flex gap-2"><Users className="h-4 w-4" />{activeSession.checkedInCount} / {activeSession.totalEnrolled} checked in</span>
            </div>
          </div>
          <Link to={'/lecturer/reports/' + activeSession.id} className="flex min-h-32 items-center justify-between gap-6 border-t border-background/30 px-7 md:min-w-56 md:flex-col md:items-start md:justify-end md:border-l md:border-t-0 md:py-9">
            <span className="text-sm font-semibold">Open live register</span>
            <ArrowRight className="h-6 w-6" />
          </Link>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <section>
          <p className="registry-label">02 / Today's line</p>
          <h2 className="mt-2 text-xl font-bold">Teaching schedule</h2>
          {!isLoading && todaySessions.length === 0 ? (
            <div className="mt-5 border border-dashed border-glass-border px-6 py-10 text-center">
              <CalendarX2 className="mx-auto h-7 w-7 text-text-dim" />
              <p className="mt-3 font-semibold text-text-main">No Teaching Schedule</p>
              <p className="mt-1 text-xs text-text-muted">Sessions created for today will appear here.</p>
            </div>
          ) : (
            <div className="mt-5 border-l border-primary pl-6">
              {todaySessions.map((session, index) => (
                <Link
                  to={'/lecturer/reports/' + session.id}
                  key={session.id}
                  className="relative block border-b border-glass-border py-5 first:pt-0 last:border-b-0 last:pb-0 before:absolute before:-left-[29px] before:top-6 before:h-2 before:w-2 before:bg-primary first:before:top-1 hover:bg-primary/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xs text-primary">{time(session.startTime)} — {time(session.endTime)}</p>
                    <StatusBadge status={session.status} size="sm" />
                  </div>
                  <h3 className="mt-2 font-bold">{session.courseName}</h3>
                  <p className="mt-1 text-xs text-text-muted">{session.classGroupName} · {session.venueName}</p>
                  <span className="sr-only">Schedule item {index + 1}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-end justify-between">
            <div>
              <p className="registry-label">03 / Assigned modules</p>
              <h2 className="mt-2 text-xl font-bold">Course register</h2>
            </div>
            <Clock3 className="h-5 w-5 text-text-dim" />
          </div>
          {!isLoading && courses.length === 0 ? (
            <div className="mt-5 border border-dashed border-glass-border px-6 py-10 text-center">
              <BookOpen className="mx-auto h-7 w-7 text-text-dim" />
              <p className="mt-3 font-semibold text-text-main">No Course Assigned</p>
              <p className="mt-1 text-xs text-text-muted">An administrator must assign courses to your account.</p>
            </div>
          ) : (
            <div className="mt-5 border-t border-glass-border">
              {courses.map((course, index) => (
                <Link to="/lecturer/courses" key={course.id} className="grid grid-cols-[54px_1fr_auto] items-center gap-4 border-b border-glass-border py-5 transition-colors hover:bg-primary/5">
                  <div className="font-mono text-xs text-text-dim">M.{String(index + 1).padStart(2, '0')}</div>
                  <div>
                    <p className="font-display text-xl font-extrabold text-primary">{course.code}</p>
                    <p className="text-sm text-text-muted">{course.name}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={course.isActive ? 'active' : 'absent'} label={course.isActive ? 'Active' : 'Inactive'} size="sm" />
                    <p className="mt-2 text-[10px] text-text-dim">{course.creditHours} units</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
