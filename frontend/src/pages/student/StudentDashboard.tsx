import { ArrowRight, BookOpen, Clock, MapPin, QrCode } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { attendanceApi, courseApi } from '@/api/endpoints';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';

const time = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function StudentDashboard() {
  const { user } = useAuth();
  const profile = user?.studentProfile;
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const coursesQuery = useQuery({
    queryKey: ['student-courses', user?.id],
    queryFn: () => courseApi.all(),
    refetchInterval: 30_000,
  });
  const dashboard = useQuery({
    queryKey: ['student-dashboard', user?.id, dayStart.toISOString()],
    queryFn: () => attendanceApi.studentDashboard(dayStart.toISOString(), dayEnd.toISOString()),
    staleTime: 0,
    refetchInterval: 15_000,
  });
  const courses = coursesQuery.data?.results ?? [];
  const sessions = dashboard.data?.todaySessions ?? [];
  const presence = dashboard.data?.presence;
  const showFigures = !dashboard.isError && Boolean(presence);
  const rate = showFigures ? presence!.rate : 0;

  return (
    <div className="space-y-8">
      <header className="border-b border-glass-border pb-7">
        <p className="registry-label rule-title">01 / Student record</p>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Hello, {user?.firstName}.</h1>
        <p className="mt-2 text-sm text-text-muted">Your enrollment and presence record for the current academic session.</p>
      </header>

      <section className="grid overflow-hidden border border-glass-border bg-background-elevated lg:grid-cols-[1.1fr_.9fr]">
        <div className="relative overflow-hidden bg-primary p-7 text-background sm:p-10">
          <div className="absolute right-[-60px] top-[-60px] h-48 w-48 rounded-full border border-background/20" />
          <p className="font-mono text-[10px] uppercase tracking-[.2em] opacity-75">Student attendance pass</p>
          <h2 className="mt-8 font-display text-3xl font-extrabold">{user?.firstName} {user?.lastName}</h2>
          <p className="mt-1 text-sm opacity-80">{profile?.studentId ?? 'Student'} · {profile?.department ?? 'Department pending'}</p>
          <div className="mt-10 flex items-end justify-between">
            <div><p className="font-mono text-[9px] uppercase tracking-widest opacity-70">Level / Modules</p><p className="mt-1 text-sm font-semibold">{profile?.level ?? '—'} · {coursesQuery.isLoading ? '…' : courses.length} courses</p></div>
            <div className="grid h-20 w-20 place-items-center bg-white text-slate-900"><QrCode className="h-14 w-14" /></div>
          </div>
        </div>
        <div className="flex flex-col justify-between p-7 sm:p-10">
          <div>
            <p className="registry-label">Presence standing</p>
            <div className="mt-3 flex items-end gap-3"><strong className="font-display text-6xl font-extrabold tracking-[-.06em] text-primary">{showFigures ? rate + '%' : '—'}</strong><span className="mb-2 text-xs text-text-muted">overall</span></div>
            <div className="mt-5 h-2 bg-glass-border"><div className="h-full bg-primary transition-all" style={{ width: rate + '%' }} /></div>
            <div className="mt-5 grid grid-cols-3 text-center">
              {(['present', 'late', 'absent'] as const).map((key, index) => <div key={key} className={index === 1 ? 'border-x border-glass-border' : ''}><b>{showFigures ? presence![key] : '—'}</b><p className="registry-label mt-1">{key}</p></div>)}
            </div>
            {dashboard.isLoading && <p className="mt-4 text-xs text-text-muted">Loading attendance standing...</p>}
            {dashboard.isError && <div className="mt-4"><p className="text-xs text-danger">Attendance standing could not be loaded.</p><Button className="mt-2" size="sm" variant="secondary" onClick={() => void dashboard.refetch()}>Retry</Button></div>}
            {showFigures && <p className="mt-4 text-xs leading-5 text-text-muted">{presence!.total ? 'Present and late check-ins count toward your rate. Missed sessions count only after attendance closes; excused records are excluded.' : 'No attendance outcomes yet. Your first check-in or completed class will update this standing.'}</p>}
          </div>
          <Link to="/student/check-in" className="mt-8"><Button className="w-full" size="lg">Check in to a class</Button></Link>
        </div>
      </section>

      <section>
        <p className="registry-label">02 / Today</p>
        <h2 className="mt-2 text-xl font-bold">Class line</h2>
        <div className="mt-5 border-l border-primary pl-6">
          {dashboard.isLoading && <div className="space-y-5">{[1, 2].map(item => <div key={item} className="h-16 animate-pulse border-b border-glass-border bg-background-elevated" />)}</div>}
          {dashboard.isError && <div className="py-5"><p className="text-sm text-danger">Today's classes could not be loaded.</p><Button className="mt-3" variant="secondary" size="sm" onClick={() => void dashboard.refetch()}>Retry</Button></div>}
          {!dashboard.isLoading && !dashboard.isError && sessions.length === 0 && <div className="relative py-5 before:absolute before:-left-[29px] before:top-7 before:h-2 before:w-2 before:border before:border-primary before:bg-background"><p className="font-semibold">No classes scheduled</p><p className="mt-1 text-xs text-text-muted">Sessions scheduled for today will appear here automatically.</p></div>}
          {!dashboard.isError && sessions.map(session => <article key={session.id} className="relative border-b border-glass-border py-5 first:pt-0 last:border-b-0 before:absolute before:-left-[29px] before:top-6 before:h-2 before:w-2 before:bg-primary first:before:top-1">
            <div className="flex items-center justify-between gap-3"><p className="font-mono text-xs text-primary">{time(session.startTime)} — {time(session.endTime)}</p><StatusBadge status={session.status} /></div>
            <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div><h3 className="font-bold">{session.courseCode} · {session.courseName}</h3><p className="mt-1 flex items-center gap-2 text-xs text-text-muted"><MapPin className="h-3.5 w-3.5" />{session.venueName} · {session.classGroupName}</p><p className="mt-1 text-xs text-text-dim">{session.lecturerName}</p></div>
              {session.alreadyMarked ? <span className="text-xs font-semibold text-success">Attendance recorded</span> : session.status === 'active' ? <Link to={'/student/check-in?session=' + session.id}><Button size="sm">Check in</Button></Link> : ['closed', 'expired'].includes(session.status) ? <span className="text-xs text-text-muted">Attendance closed</span> : null}
            </div>
          </article>)}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4"><div><p className="registry-label">03 / Registered modules</p><h2 className="mt-2 text-xl font-bold">Your courses</h2></div><Link to="/student/courses" className="flex items-center gap-1 text-xs font-semibold text-primary">All modules<ArrowRight className="h-3 w-3" /></Link></div>
        <div className="mt-5 border-t border-glass-border">
          {coursesQuery.isLoading && <div className="grid gap-px bg-glass-border sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-28 animate-pulse bg-background-elevated" />)}</div>}
          {coursesQuery.isError && <div className="py-6"><p className="text-sm text-danger">Courses could not be loaded.</p><Button className="mt-3" variant="secondary" size="sm" onClick={() => void coursesQuery.refetch()}>Retry</Button></div>}
          {!coursesQuery.isLoading && !coursesQuery.isError && courses.length === 0 && <div className="py-8 text-center"><BookOpen className="mx-auto h-6 w-6 text-text-dim" /><p className="mt-3 font-semibold">No courses assigned yet</p><p className="mt-1 text-xs text-text-muted">An administrator must enroll you in classes matching your level.</p></div>}
          {!coursesQuery.isError && courses.length > 0 && <div className="grid gap-px bg-glass-border sm:grid-cols-2 lg:grid-cols-3">{courses.map((course, index) => <article key={course.id} className="flex min-h-36 flex-col justify-between bg-background-elevated p-5"><div className="flex items-start justify-between"><span className="font-mono text-[10px] text-text-dim">M.{String(index + 1).padStart(2, '0')}</span><StatusBadge status={course.isActive ? 'active' : 'absent'} label={course.isActive ? 'Active' : 'Inactive'} size="sm" /></div><div className="mt-5"><p className="font-display text-xl font-extrabold text-primary">{course.code}</p><p className="mt-1 text-sm text-text-muted">{course.name}</p><p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-text-dim">{course.level} · {course.creditHours} units</p></div></article>)}</div>}
        </div>
        <Link to="/student/history" className="mt-5 flex items-center gap-2 text-xs font-semibold text-text-muted"><Clock className="h-4 w-4" />Open complete attendance registry</Link>
      </section>
    </div>
  );
}
