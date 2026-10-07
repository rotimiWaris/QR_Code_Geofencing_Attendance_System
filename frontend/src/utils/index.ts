import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

export function formatTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'present':
    case 'active':
    case 'success':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
    case 'absent':
    case 'closed':
    case 'danger':
      return 'bg-red-500/15 text-red-400 border-red-500/20';
    case 'late':
    case 'warning':
    case 'paused':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
    case 'excused':
    case 'info':
    case 'scheduled':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
    case 'expired':
      return 'bg-slate-500/15 text-slate-400 border-slate-500/20';
    default:
      return 'bg-slate-500/15 text-slate-400 border-slate-500/20';
  }
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case 'present':
    case 'active':
      return 'CheckCircle';
    case 'absent':
    case 'closed':
      return 'XCircle';
    case 'late':
    case 'paused':
      return 'AlertCircle';
    case 'excused':
    case 'scheduled':
      return 'Info';
    default:
      return 'HelpCircle';
  }
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
