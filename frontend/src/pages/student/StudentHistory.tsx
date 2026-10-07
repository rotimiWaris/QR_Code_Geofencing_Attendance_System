import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { attendanceApi } from '@/api/endpoints';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { AttendanceRecord } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export function StudentHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student-attendance-history', user?.id, searchQuery, page],
    queryFn: () => attendanceApi.myHistory({ search: searchQuery, page }),
    placeholderData: keepPreviousData,
  });
  const records = data?.results ?? [];

  if (isError) {
    return (
      <div className="border border-glass-border bg-background-elevated p-10 text-center animate-fade-in">
        <p className="font-semibold text-danger">Attendance history could not be loaded</p>
        <Button className="mt-5" variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fade-in">
      <header className="border-b border-glass-border pb-7">
        <p className="registry-label rule-title">Attendance / Personal record</p>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Attendance history</h1>
        <p className="mt-2 text-sm text-text-muted">Your verified check-ins from completed and active sessions.</p>
      </header>
      <DataTable
        columns={[
          {
            key: 'course', header: 'Course', render: (record: AttendanceRecord) => (
              <div>
                <p className="font-display text-lg font-extrabold text-primary">{record.courseCode ?? 'Course'}</p>
                <p className="text-xs text-text-muted">{record.courseName ?? record.sessionId}</p>
              </div>
            ),
          },
          { key: 'venue', header: 'Venue', render: (record: AttendanceRecord) => <span className="text-sm text-text-muted">{record.venueName ?? '—'}</span> },
          { key: 'status', header: 'Status', render: (record: AttendanceRecord) => <StatusBadge status={record.status} /> },
          {
            key: 'time', header: 'Check-in time', render: (record: AttendanceRecord) => (
              <span className="text-sm text-text-muted">
                {record.checkInTime ? new Date(record.checkInTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            ),
          },
          { key: 'distance', header: 'Distance', render: (record: AttendanceRecord) => <span className="font-mono text-xs text-text-muted">{record.distanceFromVenue !== undefined ? `${record.distanceFromVenue.toFixed(1)}m` : '—'}</span> },
          { key: 'accuracy', header: 'GPS accuracy', render: (record: AttendanceRecord) => <span className="font-mono text-xs text-text-muted">{record.gpsAccuracy !== undefined ? `${record.gpsAccuracy.toFixed(1)}m` : '—'}</span> },
        ]}
        data={records}
        keyExtractor={(record) => record.id}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Search course, venue, or status..."
        onSearch={value => { setSearchQuery(value); setPage(1); }}
        pagination={{ page, totalPages: Math.ceil((data?.count ?? 0) / 50), onPageChange: setPage }}
        emptyTitle={searchQuery ? 'No matching records' : 'No Attendance Records'}
        emptyDescription={searchQuery ? 'Try another search term.' : 'Your first successful check-in will appear here.'}
      />
    </div>
  );
}
