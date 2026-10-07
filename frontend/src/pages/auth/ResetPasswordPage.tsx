import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { errorMessage } from '@/components/admin/RegistryManager';
import { Button } from '@/components/common/Button';

export function ResetPasswordPage() {
  const [params] = useSearchParams(); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false);
  return <div className="flex min-h-screen items-center justify-center bg-background p-5"><section className="w-full max-w-md border border-glass-border bg-background-elevated p-7"><h1 className="text-2xl font-extrabold">Set a new password</h1>{done ? <p className="mt-5 text-sm">Your password is updated. <Link to="/login" className="text-primary underline">Sign in</Link></p> : <form className="mt-5 space-y-5" onSubmit={async event => { event.preventDefault(); if (password !== confirmation) { setError('Passwords must match.'); return; } setBusy(true); setError(''); try { await apiClient.post('/auth/password-reset/confirm/', { uid: params.get('uid'), token: params.get('token'), newPassword: password }); setDone(true); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); } }}>
    <label className="block text-sm">New password<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-glass-border bg-background p-3" /></label><label className="block text-sm">Confirm password<input type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-glass-border bg-background p-3" /></label>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<Button type="submit" className="w-full" isLoading={busy} disabled={!params.get('uid') || !params.get('token')}>Reset password</Button><Link to="/forgot-password" className="block text-xs text-primary">Request another link</Link>
  </form>}</section></div>;
}
