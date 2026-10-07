import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/api/endpoints';
import { apiClient } from '@/api/client';
import { errorMessage } from '@/components/admin/RegistryManager';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types';

export function UserManagement() {
  const { user: current, checkAuth } = useAuth(); const client = useQueryClient(); const { showToast } = useToast();
  const [search, setSearch] = useState(''); const [role, setRole] = useState(''); const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null); const [reset, setReset] = useState<User | null>(null);
  const [form, setForm] = useState<Record<string, string>>({}); const [active, setActive] = useState(true); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  const list = useQuery({ queryKey: ['admin-users', search, role, page], queryFn: () => userApi.list({ search, role: role || undefined, page }), placeholderData: keepPreviousData });
  const save = useMutation({ mutationFn: () => userApi.update(selected!.id, {
    firstName: form.firstName, lastName: form.lastName, email: form.email, isActive: active,
    ...(selected?.studentProfile ? { studentProfile: { studentId: form.studentId, department: form.department, level: form.level as 'ND1' | 'ND2' | 'HND1' | 'HND2' } } : {}),
    ...(selected?.lecturerProfile ? { lecturerProfile: { staffId: form.staffId, department: form.department, title: form.title } } : {}),
  }), onSuccess: async () => { const own = selected?.id === current?.id; setSelected(null); await client.invalidateQueries(); if (own) await checkAuth(); showToast('Account updated.', 'success'); }, onError: err => setError(errorMessage(err)) });
  const resetPassword = useMutation({ mutationFn: () => apiClient.post('/users/' + reset!.id + '/reset-password/', { newPassword: password }), onSuccess: () => { setReset(null); setPassword(''); showToast('Password reset. Share it securely with the owner.', 'success'); }, onError: err => setError(errorMessage(err)) });
  const open = (user: User) => { setSelected(user); setError(''); setActive(user.isActive); setForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, ...(user.studentProfile ?? {}), ...(user.lecturerProfile ?? {}) }); };
  const fields = ['firstName', 'lastName', 'email', ...(selected?.studentProfile ? ['studentId', 'department', 'level'] : []), ...(selected?.lecturerProfile ? ['staffId', 'department', 'title'] : [])];
  return <div className="space-y-7 animate-fade-in">
    <header className="flex flex-wrap justify-between gap-4 border-b border-glass-border pb-7"><div><p className="registry-label">Account registry</p><h1 className="mt-4 text-3xl font-extrabold">People</h1><p className="mt-2 text-sm text-text-muted">Edit registered accounts, deactivate access, or securely reset a password. Attendance history is retained.</p></div><Link to="/admin/dashboard#registration"><Button>Invite with signup token</Button></Link></header>
    {list.isError && <p role="alert" className="text-sm text-danger">{errorMessage(list.error)} <button className="underline" onClick={() => void list.refetch()}>Retry</button></p>}
    <DataTable<User> columns={[
      { key: 'name', header: 'Name / email', render: user => <div><p className="font-semibold">{user.firstName} {user.lastName}</p><p className="text-xs text-text-muted">{user.email}</p></div> },
      { key: 'role', header: 'Role' }, { key: 'identification', header: 'ID / level', render: user => user.studentProfile ? user.studentProfile.studentId + ' / ' + user.studentProfile.level : user.lecturerProfile?.staffId ?? '—' },
      { key: 'department', header: 'Department', render: user => user.studentProfile?.department ?? user.lecturerProfile?.department ?? '—' },
      { key: 'status', header: 'Status', render: user => <StatusBadge status={user.isActive ? 'active' : 'absent'} label={user.isActive ? 'Active' : 'Inactive'} /> },
    ]} data={list.data?.results ?? []} keyExtractor={user => user.id} isLoading={list.isLoading} searchable onSearch={value => { setSearch(value); setPage(1); }} searchPlaceholder="Search name, email, or student/staff ID..."
      filters={<select aria-label="Filter account role" className="bg-background p-2 text-sm" value={role} onChange={event => { setRole(event.target.value); setPage(1); }}><option value="">All roles</option>{['admin', 'student', 'lecturer'].map(value => <option key={value}>{value}</option>)}</select>}
      pagination={{ page, totalPages: Math.ceil((list.data?.count ?? 0) / 50), onPageChange: setPage }} emptyTitle="No matching accounts" rowActions={user => <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => open(user)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => { setReset(user); setPassword(''); setError(''); }}>Reset password</Button></div>} />
    <Modal isOpen={selected !== null} onClose={() => !save.isPending && setSelected(null)} title="Edit account"><form className="space-y-4" onSubmit={event => { event.preventDefault(); setError(''); save.mutate(); }}>
      {fields.map(field => <label key={field} className="block text-xs font-semibold text-text-muted">{field.replace(/([A-Z])/g, ' $1')}{field === 'level' ? <select className="mt-2 w-full rounded-xl border border-glass-border bg-background p-3 text-sm" value={form[field]} onChange={event => setForm({ ...form, [field]: event.target.value })}>{['ND1', 'ND2', 'HND1', 'HND2'].map(level => <option key={level}>{level}</option>)}</select> : <input type={field === 'email' ? 'email' : 'text'} required={field !== 'title'} className="mt-2 w-full rounded-xl border border-glass-border bg-background p-3 text-sm" value={form[field] ?? ''} onChange={event => setForm({ ...form, [field]: event.target.value })} />}</label>)}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} disabled={selected?.id === current?.id} onChange={event => setActive(event.target.checked)} />Active account</label><p className="text-xs text-text-muted">Role and admin privileges cannot be changed here. Deactivating revokes refresh tokens.</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={save.isPending} onClick={() => setSelected(null)}>Cancel</Button><Button type="submit" isLoading={save.isPending}>Save</Button></div>
    </form></Modal>
    <Modal isOpen={reset !== null} onClose={() => !resetPassword.isPending && setReset(null)} title="Reset account password"><form className="space-y-4" onSubmit={event => { event.preventDefault(); setError(''); resetPassword.mutate(); }}><p className="text-sm text-text-muted">Reset for {reset?.email}. Existing refresh tokens will be revoked.</p><label className="block text-sm">New password<input type="password" autoComplete="new-password" minLength={8} required className="mt-2 w-full rounded-xl border border-glass-border bg-background p-3" value={password} onChange={event => setPassword(event.target.value)} /></label>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<Button type="submit" isLoading={resetPassword.isPending}>Confirm reset</Button></form></Modal>
  </div>;
}
