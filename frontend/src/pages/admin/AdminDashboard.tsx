import { Users, BookOpen, Calendar, RefreshCw, MapPin, KeyRound, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { attendanceApi, type AdminDashboardData } from '@/api/endpoints';
import { RegistrationTokenPanel } from '@/components/admin/RegistrationTokenPanel';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function AdminDashboard() {
  const { user } = useAuth();
  const { hash } = useLocation();
  useEffect(() => { if (hash === '#registration') document.getElementById('registration')?.scrollIntoView({ behavior: 'smooth' }); }, [hash]);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const dashboard = useQuery({
    queryKey: ['admin-dashboard', user?.id, start.toISOString()],
    queryFn: () => attendanceApi.adminDashboard(start.toISOString(), end.toISOString()),
    refetchInterval: 30_000, staleTime: 15_000,
  });
  const data = dashboard.data;
  const s = data?.summary;
  const trends = data?.trends.map(t => ({ ...t, day: new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric' }), verified: t.present + t.late })) ?? [];
  const rate = s?.attendancePercentage;
  return <div className="space-y-8 animate-fade-in">
    <header className="flex flex-col justify-between gap-4 border-b border-glass-border pb-7 sm:flex-row sm:items-end">
      <div><p className="registry-label rule-title">01 / Institutional overview</p><h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome{user?.firstName ? ', ' + user.firstName : ''}.</h1><p className="mt-2 text-sm text-text-muted">The campus attendance record for today, at a glance.</p></div>
      <div><p className="font-mono text-xs text-text-muted">{new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p><Button className="mt-3" size="sm" variant="secondary" disabled={dashboard.isFetching} leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void dashboard.refetch()}>Refresh overview</Button></div>
    </header>
    {dashboard.isError && <p role="alert" className="border border-danger/30 p-4 text-sm text-danger">Overview could not be refreshed. {data ? 'Showing the last loaded figures.' : 'Check your connection and use Refresh overview to retry.'}</p>}
    {dashboard.isLoading && <p role="status" className="text-sm text-text-muted">Loading institutional overview...</p>}
    {s && <>
      <section className="grid border border-glass-border bg-background-elevated lg:grid-cols-[1.25fr_.75fr]">
        <div className="border-b border-glass-border p-7 lg:border-b-0 lg:border-r lg:p-10"><p className="registry-label">Attendance rate / Today</p><strong className="mt-4 block font-display text-7xl font-extrabold tracking-[-.07em] text-primary sm:text-8xl">{rate == null ? '—' : rate + '%'}</strong><div className="mt-7 h-2 bg-glass-border"><div className="h-full bg-primary" style={{ width: `${rate ?? 0}%` }} /></div><p className="mt-3 text-xs text-text-muted">{s.presentToday + s.lateToday} verified attendance entries today; {s.pendingToday} pending.</p><p className="mt-2 text-xs text-text-dim">Present and late count as verified. Absences are counted only after sessions end. Excused and pending entries are excluded from the rate. A student attending two sessions counts twice.</p></div>
        <div className="grid grid-cols-2 divide-x divide-y divide-glass-border lg:grid-cols-1 lg:divide-x-0"><Metric icon={Users} label="Active students" value={s.totalStudents} /><Metric icon={BookOpen} label="Active courses" value={s.totalCourses} /><Metric icon={Calendar} label="Live sessions" value={s.activeSessions} /><Metric icon={Users} label="Absent today" value={s.absentToday} warning /></div>
      </section>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-muted"><span>Present today: {s.presentToday}</span><span>Late today: {s.lateToday}</span><span>Excused today: {s.excusedToday}</span><span>Pending today: {s.pendingToday}</span></div>
      <section className="grid grid-cols-2 gap-px border border-glass-border bg-glass-border sm:grid-cols-3 xl:grid-cols-6">
        <Metric icon={Users} label="Lecturers" value={s.totalLecturers} /><Metric icon={Layers} label="Class groups" value={s.totalClasses} /><Metric icon={MapPin} label="Venues" value={s.totalVenues} /><Metric icon={Users} label="Enrollments" value={s.activeEnrollments} /><Metric icon={KeyRound} label="Unused tokens" value={s.unusedTokens} /><Metric icon={KeyRound} label="Used tokens" value={s.usedTokens} />
      </section>
      <section className="grid gap-8 xl:grid-cols-[1.35fr_.65fr]">
        <div><p className="registry-label">02 / Seven-day register</p><h2 className="mt-2 text-xl font-bold">Attendance movement</h2><p className="mt-2 text-xs text-text-muted">Verified (present + late) and finalized absences.</p>{trends.some(t => t.total > 0) ? <div className="mt-5 h-72 border-y border-glass-border py-5"><ResponsiveContainer><BarChart data={trends}><CartesianGrid vertical={false} stroke="rgb(var(--border))" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgb(var(--text-muted))', fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'rgb(var(--text-muted))', fontSize: 11 }} /><Tooltip contentStyle={{ background: 'rgb(var(--surface-raised))', border: '1px solid rgb(var(--border))' }} /><Bar dataKey="verified" name="Verified" fill="rgb(var(--primary))" radius={[2, 2, 0, 0]} /><Bar dataKey="absent" name="Absent" fill="rgb(var(--terracotta))" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="mt-5 border-y border-glass-border py-12 text-center text-sm text-text-muted">No attendance activity in the last seven days.</p>}</div>
        <div><p className="registry-label">03 / Modules</p><h2 className="mt-2 text-xl font-bold">Rates requiring attention</h2><p className="mt-2 text-xs text-text-muted">Completed sessions in the last seven days, lowest rates first.</p><div className="mt-5 border-t border-glass-border">{data!.courseStats.length ? data!.courseStats.map((c, i) => <div key={c.courseId} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-glass-border py-5"><span className="font-mono text-[10px] text-text-dim">{String(i + 1).padStart(2, '0')}</span><div><p className="font-display text-base font-extrabold">{c.courseCode}</p><p className="text-xs text-text-muted">{c.courseName}</p><p className="mt-1 text-xs text-text-dim">{c.sessions} ended session(s)</p></div><strong className={c.attendanceRate !== null && c.attendanceRate < 80 ? 'text-accent-violet' : 'text-primary'}>{c.attendanceRate === null ? '—' : c.attendanceRate + '%'}</strong></div>) : <p className="py-8 text-sm text-text-muted">No completed course attendance yet.</p>}</div></div>
      </section>
      <section><p className="registry-label">04 / Timetable</p><h2 className="mb-5 mt-2 text-xl font-bold">Today's sessions ({s.sessionsToday})</h2><DataTable<AdminDashboardData['todaySessions'][number]>
        columns={[
          { key: 'courseCode', header: 'Course / class', render: session => <div><p className="font-semibold">{session.courseCode}</p><p className="text-xs text-text-muted">{session.classGroupName}</p></div> },
          { key: 'lecturerName', header: 'Lecturer' }, { key: 'venueName', header: 'Venue' },
          { key: 'startTime', header: 'Time', render: session => new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' – ' + new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
          { key: 'checkedInCount', header: 'Verified', render: session => session.checkedInCount + ' / ' + session.totalEnrolled },
          { key: 'status', header: 'Status', render: session => <StatusBadge status={session.status} /> },
        ]} data={data!.todaySessions} keyExtractor={session => session.id} emptyTitle="No sessions today" emptyDescription="Attendance sessions scheduled for today will appear here." /></section>
      <p className="text-xs text-text-dim">Last updated: {new Date(data!.generatedAt).toLocaleString()}. Overview refreshes every 30 seconds.</p>
    </>}
    <RegistrationTokenPanel />
  </div>;
}

function Metric({ icon: Icon, label, value, warning = false }: { icon: typeof Users; label: string; value: number; warning?: boolean }) {
  return <div className="flex items-center gap-4 bg-background-elevated p-5"><Icon className={`h-5 w-5 ${warning ? 'text-accent-violet' : 'text-primary'}`} /><div><p className="registry-label">{label}</p><p className="mt-1 font-display text-2xl font-extrabold">{value}</p></div></div>;
}
