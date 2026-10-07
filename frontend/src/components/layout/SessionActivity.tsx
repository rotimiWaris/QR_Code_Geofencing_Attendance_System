import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { attendanceApi } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';

function readSeen(key: string): string[] {
  try { const value = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(value) ? value.filter(item => typeof item === 'string') : []; } catch { return []; }
}

export function SessionActivity() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const storageKey = 'seen-session-notifications:' + user?.id;
  const [readState, setReadState] = useState(() => ({ key: storageKey, ids: readSeen(storageKey) }));
  const seen = readState.key === storageKey ? readState.ids : readSeen(storageKey);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === storageKey) setReadState({ key: storageKey, ids: readSeen(storageKey) }); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [storageKey]);
  const activity = useQuery({
    queryKey: ['session-activity', user?.id], enabled: Boolean(user), refetchInterval: 15_000, staleTime: 0,
    queryFn: async () => user?.role === 'student' ? attendanceApi.studentSessionActivity() : (await attendanceApi.sessions({ ordering: '-created_at' })).results.slice(0, 20),
  });
  const unread = activity.data?.filter(session => !seen.includes(session.id)) ?? [];
  const markRead = (ids: string[]) => {
    const next = [...new Set([...readSeen(storageKey), ...seen, ...ids])];
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Still clear within this visit if browser storage is unavailable. */ }
    setReadState({ key: storageKey, ids: next });
  };
  return <div className="relative">
    <button className="relative p-2.5 text-text-muted hover:text-text-main" aria-label={'Session activity' + (unread.length ? ', ' + unread.length + ' unread notifications' : '')} aria-expanded={open} onClick={() => setOpen(!open)}>
      <Bell className="h-5 w-5" />
      {unread.length > 0 && <span data-testid="notification-badge" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white" aria-hidden="true">{unread.length > 99 ? '99+' : unread.length}</span>}
    </button>
    {open && <section className="absolute right-0 mt-2 max-h-96 w-72 overflow-y-auto border border-glass-border bg-background-card p-4 shadow-glass">
      <div className="flex justify-between"><h2 className="text-sm font-semibold">Session notifications</h2><button aria-label="Close session activity" onClick={() => setOpen(false)} className="text-xs text-text-muted">Close</button></div>
      {unread.length > 0 && <button className="mt-3 text-xs font-semibold text-primary" onClick={() => markRead(unread.map(session => session.id))}>Mark all as read</button>}
      {activity.isLoading && <p className="mt-4 text-xs text-text-muted">Loading...</p>}
      {activity.isError && <button className="mt-4 text-xs text-danger" onClick={() => void activity.refetch()}>Notifications could not load. Retry</button>}
      {!activity.isLoading && !activity.isError && !activity.data?.length && <p className="mt-4 text-xs text-text-muted">No session notifications yet.</p>}
      {activity.data?.map(session => <Link key={session.id} onClick={() => { markRead([session.id]); setOpen(false); }} to={user?.role === 'student' ? '/student/dashboard' : '/' + user?.role + '/reports/' + session.id} className="mt-3 block border-t border-glass-border pt-3">
        <p className="text-xs font-semibold text-primary">{session.courseCode} / {session.status}{!seen.includes(session.id) && <span className="ml-2 text-danger">New</span>}</p><p className="mt-1 text-xs text-text-muted">{session.venueName} · {new Date(session.startTime).toLocaleString()}</p>
      </Link>)}
    </section>}
  </div>;
}
