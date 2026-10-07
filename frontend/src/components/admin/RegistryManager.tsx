import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useToast } from '@/contexts/ToastContext';
import type { PaginatedResponse } from '@/types';
import axios from 'axios';

export type RegistryRow = { id: string; [key: string]: unknown };
type Option = { value: string; label: string };
type Field = { key: string; label: string; type?: 'number' | 'checkbox'; required?: boolean; min?: number; max?: number; options?: Option[]; source?: string; nullable?: boolean; default?: string | boolean };
const levels = ['ND1', 'ND2', 'HND1', 'HND2'].map(value => ({ value, label: value }));
const semester = ['First', 'Second'].map(value => ({ value, label: value }));
const active: Field = { key: 'isActive', label: 'Active', type: 'checkbox', default: true };
const name: Field = { key: 'name', label: 'Name', required: true };
const capacity: Field = { key: 'capacity', label: 'Capacity', type: 'number', min: 1, default: '50', required: true };
const configurations = {
  courses: { title: 'Courses', description: 'Create courses and assign their responsible lecturers.', columns: ['code', 'name', 'level', 'lecturerName', 'creditHours', 'isActive'], fields: [
    { key: 'code', label: 'Course code', required: true }, name, { key: 'description', label: 'Description' }, { key: 'department', label: 'Department', default: 'Computer Science', required: true },
    { key: 'level', label: 'Level', options: levels, required: true }, { key: 'creditHours', label: 'Credit units', type: 'number', min: 1, max: 10, default: '3', required: true },
    { key: 'semester', label: 'Semester', options: semester, default: 'First' }, { key: 'lecturerId', label: 'Assigned lecturer', source: 'lecturers', nullable: true }, active,
  ] as Field[] },
  venues: { title: 'Venues', description: 'Manage rooms and geofences. Coordinates can stay empty until you capture them at school.', columns: ['name', 'building', 'roomNumber', 'latitude', 'longitude', 'radius', 'capacity', 'isActive'], fields: [
    name, { key: 'building', label: 'Building' }, { key: 'floor', label: 'Floor' }, { key: 'roomNumber', label: 'Room number' },
    { key: 'latitude', label: 'Latitude (optional)', type: 'number', min: -90, max: 90, nullable: true }, { key: 'longitude', label: 'Longitude (optional)', type: 'number', min: -180, max: 180, nullable: true },
    { key: 'radius', label: 'Geofence radius (metres)', type: 'number', min: 10, max: 500, default: '75', required: true }, capacity, active,
  ] as Field[] },
  'class-groups': { title: 'Classes', description: 'Organize course classes, venues, and scheduled teaching times.', columns: ['courseCode', 'name', 'venue', 'schedule', 'enrolledCount', 'academicYear', 'isActive'], fields: [
    { key: 'courseId', label: 'Course', source: 'courses', required: true }, name, { key: 'venueId', label: 'Venue (optional)', source: 'venues', nullable: true },
    { key: 'academicYear', label: 'Academic year', default: '2026/2027', required: true }, { key: 'semester', label: 'Semester', options: semester, default: 'First' }, { key: 'schedule', label: 'Teaching schedule' }, capacity, active,
  ] as Field[] },
  enrollments: { title: 'Enrollments', description: 'Enroll students in matching-level classes or update their enrollment status.', columns: ['studentName', 'studentIdNumber', 'courseCode', 'classGroupName', 'status'], fields: [
    { key: 'studentId', label: 'Student', source: 'students', required: true }, { key: 'classGroupId', label: 'Class', source: 'class-groups', required: true },
    { key: 'status', label: 'Status', options: ['active', 'dropped', 'completed'].map(value => ({ value, label: value })), default: 'active', required: true },
  ] as Field[] },
};
export type RegistryKind = keyof typeof configurations;
const labels: Record<string, string> = { code: 'Code', name: 'Name', level: 'Level', lecturerName: 'Lecturer', creditHours: 'Units', isActive: 'Status', building: 'Building', roomNumber: 'Room', latitude: 'Latitude', longitude: 'Longitude', radius: 'Radius (m)', capacity: 'Capacity', courseCode: 'Course', venue: 'Venue', schedule: 'Schedule', enrolledCount: 'Enrolled', academicYear: 'Year', studentName: 'Student', studentIdNumber: 'Student ID', classGroupName: 'Class', status: 'Status' };

export async function allRegistryRows(source: string, params?: Record<string, string>): Promise<RegistryRow[]> {
  const rows: RegistryRow[] = [];
  let page = 1;
  while (true) {
    const result = await apiClient.get<PaginatedResponse<RegistryRow>>('/' + source + '/', { params: { ...params, page } });
    rows.push(...result.results);
    if (!result.next) return rows;
    page++;
  }
}
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data;
    return typeof data === 'string' ? 'Request failed. Please try again.' : Object.entries(data).filter(([key]) => key !== 'code').map(([key, value]) => key + ': ' + (typeof value === 'object' ? JSON.stringify(value) : String(value))).join(' ');
  }
  return 'Request failed. Check your connection and retry.';
}

export function RegistryManager({ kind }: { kind: RegistryKind }) {
  const config = configurations[kind];
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<RegistryRow | 'new' | null>(null);
  const [deleting, setDeleting] = useState<RegistryRow | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState('');
  const client = useQueryClient(); const { showToast } = useToast();
  const list = useQuery({ queryKey: ['admin-registry', kind, search, page], queryFn: () => apiClient.get<PaginatedResponse<RegistryRow>>('/' + kind + '/', { params: { search, page } }), placeholderData: keepPreviousData });
  const options = useQuery({ queryKey: ['admin-registry-options', kind], enabled: editing !== null, queryFn: async () => {
    const sources = [...new Set(config.fields.flatMap(field => field.source ? [field.source] : []))];
    const entries = await Promise.all(sources.map(async source => [source, await allRegistryRows(source)] as const));
    return Object.fromEntries(entries);
  } });
  const refresh = async () => { await client.invalidateQueries(); };
  const save = useMutation({ mutationFn: async () => {
    const fields = config.fields.filter(field => !(kind === 'enrollments' && editing !== 'new' && field.key !== 'status'));
    const data = Object.fromEntries(fields.map(field => {
      const value = form[field.key];
      return [field.key, field.nullable && value === '' ? null : field.type === 'number' ? Number(value) : value];
    }));
    return editing === 'new' ? apiClient.post('/' + kind + '/', data) : apiClient.patch('/' + kind + '/' + (editing as RegistryRow).id + '/', data);
  }, onSuccess: async () => { setEditing(null); showToast('Saved successfully.', 'success'); await refresh(); }, onError: err => setError(errorMessage(err)) });
  const remove = useMutation({ mutationFn: () => apiClient.delete('/' + kind + '/' + deleting!.id + '/'), onSuccess: async () => { setDeleting(null); if ((list.data?.results.length ?? 0) <= 1) setPage(1); showToast('Removed successfully.', 'success'); await refresh(); }, onError: err => setError(errorMessage(err)) });
  const open = (row: RegistryRow | 'new') => {
    setEditing(row); setError('');
    setForm(Object.fromEntries(config.fields.map(field => [field.key, row === 'new' ? field.default ?? '' : field.type === 'checkbox' ? Boolean(row[field.key]) : String(row[field.key] ?? '')])));
  };
  const inputClass = 'mt-2 w-full rounded-xl border border-glass-border bg-background px-3 py-3 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30';
  return <div className="space-y-7 animate-fade-in">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-glass-border pb-7"><div><p className="registry-label">Academic registry</p><h1 className="mt-4 text-3xl font-extrabold">{config.title}</h1><p className="mt-2 text-sm text-text-muted">{config.description}</p></div><Button onClick={() => open('new')}>Add {kind === 'class-groups' ? 'class' : kind === 'enrollments' ? 'enrollment' : kind.slice(0, -1)}</Button></header>
    {list.isError && <p role="alert" className="text-sm text-danger">{errorMessage(list.error)} <button onClick={() => void list.refetch()} className="underline">Retry</button></p>}
    <DataTable<RegistryRow> columns={config.columns.map(key => ({ key, header: labels[key] ?? key, render: row => key === 'isActive' ? <StatusBadge status={row[key] ? 'active' : 'absent'} label={row[key] ? 'Active' : 'Inactive'} /> : key === 'status' ? <span className="capitalize">{String(row[key])}</span> : <span>{String(row[key] ?? '—')}</span> }))}
      data={list.data?.results ?? []} keyExtractor={row => row.id} isLoading={list.isLoading} searchable searchPlaceholder={'Search ' + config.title.toLowerCase() + '...'} onSearch={value => { setSearch(value); setPage(1); }} pagination={{ page, totalPages: Math.ceil((list.data?.count ?? 0) / 50), onPageChange: setPage }} emptyTitle="No matching records"
      rowActions={row => <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => open(row)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => { setDeleting(row); setError(''); }}>Remove</Button></div>} />
    <Modal isOpen={editing !== null} onClose={() => !save.isPending && setEditing(null)} title={(editing === 'new' ? 'Add ' : 'Edit ') + config.title.toLowerCase()}>
      <form onSubmit={event => { event.preventDefault(); setError(''); save.mutate(); }} className="space-y-5">
        {config.fields.filter(field => !(kind === 'enrollments' && editing !== 'new' && field.key !== 'status')).map(field => <label key={field.key} className="block text-xs font-semibold text-text-muted" htmlFor={'registry-' + field.key}>{field.label}
          {field.type === 'checkbox' ? <input id={'registry-' + field.key} type="checkbox" className="ml-3" checked={Boolean(form[field.key])} onChange={event => setForm({ ...form, [field.key]: event.target.checked })} /> : field.options || field.source ? <select id={'registry-' + field.key} className={inputClass} value={String(form[field.key] ?? '')} required={field.required} disabled={save.isPending || options.isLoading} onChange={event => setForm({ ...form, [field.key]: event.target.value })}>
            <option value="">{field.nullable ? 'Unassigned' : 'Select...'}</option>{(field.options ?? options.data?.[field.source!]?.map(row => ({ value: row.id, label: field.source === 'lecturers' || field.source === 'students' ? `${row.firstName} ${row.lastName} (${field.source === 'students' ? (row.studentProfile as { studentId?: string })?.studentId ?? row.email : row.email})` : `${row.code ?? row.courseCode ?? ''} ${row.name}` })) ?? []).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select> : <input id={'registry-' + field.key} className={inputClass} type={field.type ?? 'text'} step={field.key === 'latitude' || field.key === 'longitude' ? 'any' : 1} min={field.min} max={field.max} required={field.required} value={String(form[field.key] ?? '')} disabled={save.isPending} onChange={event => setForm({ ...form, [field.key]: event.target.value })} />}
        </label>)}
        {options.isError && <p role="alert" className="text-danger text-sm">Selection lists could not load. <button type="button" onClick={() => void options.refetch()} className="underline">Retry</button></p>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={save.isPending} onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" isLoading={save.isPending} disabled={options.isError || options.isLoading}>Save</Button></div>
      </form>
    </Modal>
    <Modal isOpen={deleting !== null} onClose={() => !remove.isPending && setDeleting(null)} title="Confirm removal"><p className="text-sm text-text-muted">Remove this record? Related enrollments/classes may also be removed. Records with attendance history are protected; deactivate them or drop the enrollment instead.</p>{error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}<div className="mt-6 flex justify-end gap-2"><Button variant="secondary" disabled={remove.isPending} onClick={() => setDeleting(null)}>Cancel</Button><Button isLoading={remove.isPending} onClick={() => remove.mutate()}>Confirm removal</Button></div></Modal>
  </div>;
}
