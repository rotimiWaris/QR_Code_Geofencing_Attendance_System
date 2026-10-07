import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { attendanceApi } from '@/api/endpoints';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/contexts/AuthContext';

export function AvailableSessions() {
  const { user } = useAuth();
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['student-available-sessions', user?.id],
    queryFn: attendanceApi.availableSessions,
    staleTime: 0,
    refetchInterval: 15_000,
  });
  return <section>
    <p className="registry-label">Attendance / Open now</p>
    <h2 className="mt-2 text-xl font-bold">Active attendance sessions</h2>
    <p className="mt-2 text-xs text-text-muted">Your enrolled classes appear automatically. Check in by scanning the lecturer's QR, then allowing GPS.</p>
    {isLoading && <div className="mt-5 h-28 animate-pulse bg-background-elevated" />}
    {isError && <div className="mt-5 border border-glass-border p-5"><p className="text-sm text-danger">Active sessions could not be loaded.</p><Button variant="secondary" size="sm" className="mt-3" onClick={() => void refetch()}>Retry</Button></div>}
    {!isLoading && !isError && data.length === 0 && <div className="mt-5 border border-dashed border-glass-border p-7 text-center"><p className="font-semibold">No Active Attendance Sessions</p><p className="mt-1 text-xs text-text-muted">When your lecturer opens attendance, it will appear here.</p></div>}
    {!isLoading && !isError && <div className="mt-5 space-y-3">{data.map(session => <article key={session.id} className="flex flex-col justify-between gap-4 border border-glass-border bg-background-elevated p-5 sm:flex-row sm:items-center"><div><p className="font-display text-xl font-extrabold text-primary">{session.courseCode}</p><h3 className="mt-1 text-sm font-semibold">{session.courseName}</h3><p className="mt-2 text-xs text-text-muted">{session.venueName} · {session.classGroupName}</p><p className="mt-1 text-xs text-text-dim">Closes {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>{session.alreadyMarked ? <span className="text-sm font-semibold text-success">Attendance recorded</span> : <Link to={'/student/check-in?session=' + session.id}><Button>Check in</Button></Link>}</article>)}</div>}
  </section>;
}
