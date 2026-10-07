import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { attendanceApi } from '@/api/endpoints';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { AttendanceSession, SessionReport } from '@/types';

type StudentRow = SessionReport['students'][number];

export function LecturerReports() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const reportsPath = user?.role === 'admin' ? '/admin/reports' : '/lecturer/reports';
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  useEffect(() => { setSearch(''); setPage(1); }, [sessionId]);
  const sessions = useQuery({
    queryKey: ['lecturer-report-sessions', user?.id, search, page],
    queryFn: () => attendanceApi.sessions({ search, page }),
    enabled: !sessionId,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchInterval: 15_000,
  });
  const report = useQuery({
    queryKey: ['lecturer-session-report', user?.id, sessionId],
    queryFn: () => attendanceApi.sessionReport(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 0,
    refetchInterval: 15_000,
  });
  const download = async (fileType: 'pdf' | 'xlsx') => {
    if (!sessionId || !report.data?.canExport) return;
    setExporting(true);
    try {
      const blob = await attendanceApi.exportSessionReport(sessionId, fileType);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = report.data.session.courseCode + '-' + sessionId + '-attendance.' + fileType;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      let message = 'The report could not be exported. Please try again.';
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try { message = JSON.parse(await error.response.data.text()).message || message; } catch { /* Keep readable fallback. */ }
      }
      showToast(message, 'error');
    } finally { setExporting(false); }
  };
  const students = report.data?.students ?? [];
  const filtered = students.filter(student => [student.name, student.studentId, student.email, student.department, student.level, student.status].some(value => value.toLowerCase().includes(search.toLowerCase())));

  return <div className="space-y-7 animate-fade-in">
    <header className="border-b border-glass-border pb-7">
      <p className="registry-label rule-title">Attendance / Reports</p>
      <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{sessionId ? report.data ? report.data.session.courseCode + ' report' : 'Session report' : 'Session reports'}</h1>
      <p className="mt-2 text-sm text-text-muted">{sessionId ? 'Full class roster and verified attendance for this session.' : 'Choose a session to view its student register and attendance report.'}</p>
      {sessionId && <Link to={reportsPath} className="mt-3 inline-block text-xs font-semibold text-primary">Back to all reports</Link>}
    </header>
    {(sessionId ? report.isError : sessions.isError) && <div className="border border-glass-border p-6"><p className="text-sm text-danger">Report could not be loaded. It may be unavailable or not assigned to you.</p><Button className="mt-3" variant="secondary" onClick={() => void (sessionId ? report.refetch() : sessions.refetch())}>Retry</Button></div>}
    {!sessionId && <DataTable<AttendanceSession>
      columns={[
        { key: 'course', header: 'Course / class', render: session => <div><Link to={reportsPath + '/' + session.id} className="font-semibold text-primary">{session.courseCode}</Link><p className="mt-1 text-xs text-text-muted">{session.classGroupName}</p></div> },
        { key: 'lecturer', header: 'Lecturer', render: session => session.lecturerName },
        { key: 'venue', header: 'Venue', render: session => session.venueName },
        { key: 'time', header: 'Session date', render: session => new Date(session.startTime).toLocaleString() },
        { key: 'attendance', header: 'Checked in', render: session => session.checkedInCount + ' / ' + session.totalEnrolled },
        { key: 'status', header: 'Status', render: session => <StatusBadge status={session.status} /> },
      ]}
      data={sessions.data?.results ?? []}
      keyExtractor={session => session.id}
      isLoading={sessions.isLoading}
      searchable
      searchPlaceholder="Search course, class, or venue..."
      onSearch={value => { setSearch(value); setPage(1); }}
      onRowClick={session => navigate(reportsPath + '/' + session.id)}
      emptyTitle="No matching sessions"
      emptyDescription="Create an attendance session or try a different search."
      pagination={{ page, totalPages: Math.ceil((sessions.data?.count ?? 0) / 50), onPageChange: setPage }}
    />}
    {sessionId && report.isLoading && <div className="h-48 animate-pulse bg-background-elevated" />}
    {sessionId && report.data && !report.isError && <>
      <div className="flex flex-col justify-between gap-4 border border-glass-border bg-background-elevated p-5 sm:flex-row sm:items-center">
        <div><p className="font-semibold">{report.data.session.courseName}</p><p className="mt-1 text-xs text-text-muted">{report.data.session.classGroupName} · {report.data.session.venueName}</p><p className="mt-1 text-xs text-text-muted">{new Date(report.data.session.startTime).toLocaleString()} — {new Date(report.data.session.endTime).toLocaleString()}</p><div className="mt-2"><StatusBadge status={report.data.session.status} /></div></div>
        <div className="flex gap-2"><Button disabled={!report.data.canExport || exporting} variant="secondary" onClick={() => void download('pdf')}>Export PDF</Button><Button disabled={!report.data.canExport || exporting} onClick={() => void download('xlsx')}>Export Excel</Button></div>
      </div>
      {!report.data.canExport && <p className="text-xs text-text-muted">Live report preview. PDF and Excel exports unlock only after attendance closes or expires. Unmarked students are pending until then.</p>}
      <div className="grid grid-cols-3 gap-px border border-glass-border bg-glass-border sm:grid-cols-6">{Object.entries(report.data.summary).map(([key, value]) => <div key={key} className="bg-background-elevated p-4"><p className="registry-label">{key}</p><p className="mt-2 text-2xl font-extrabold text-primary">{value}</p></div>)}</div>
      <DataTable<StudentRow>
        columns={[
          { key: 'studentId', header: 'Student ID', render: student => <span className="font-mono text-xs">{student.studentId}</span> },
          { key: 'name', header: 'Student', render: student => <div><p className="font-semibold">{student.name}</p><p className="mt-1 text-xs text-text-muted">{student.email}</p></div> },
          { key: 'department', header: 'Department' },
          { key: 'level', header: 'Level' },
          { key: 'status', header: 'Attendance', render: student => <StatusBadge status={student.status} /> },
          { key: 'time', header: 'Check-in', render: student => student.checkInTime ? new Date(student.checkInTime).toLocaleString() : '—' },
          { key: 'distance', header: 'Distance / accuracy', render: student => student.distance !== null ? student.distance.toFixed(1) + 'm / ' + student.accuracy?.toFixed(1) + 'm' : '—' },
        ]}
        data={filtered}
        keyExtractor={student => student.id}
        searchable
        searchPlaceholder="Search student, ID, department, or status..."
        onSearch={setSearch}
        emptyTitle={search ? 'No matching students' : 'No students enrolled'}
      />
    </>}
  </div>;
}
