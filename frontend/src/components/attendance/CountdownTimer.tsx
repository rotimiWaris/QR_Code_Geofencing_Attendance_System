import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/utils';

interface CountdownTimerProps {
  endTime: string;
  size?: 'sm' | 'md' | 'lg';
  onExpire?: () => void;
}

function getTimeRemaining(end: Date) {
  const total = end.getTime() - Date.now();
  if (total <= 0) return { total: 0, minutes: 0, seconds: 0 };
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  return { total, minutes, seconds };
}

export function CountdownTimer({ endTime, size = 'md', onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeRemaining(new Date(endTime)));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getTimeRemaining(new Date(endTime));
      setTimeLeft(remaining);
      if (remaining.total <= 0) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  const sizeClasses = {
    sm: 'text-sm gap-1.5',
    md: 'text-base gap-2',
    lg: 'text-2xl gap-3',
  };

  const boxClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-xl',
  };

  const isUrgent = timeLeft.minutes < 5;

  return (
    <div className={cn('flex items-center gap-2', sizeClasses[size])}>
      <Clock className={cn('h-4 w-4', isUrgent ? 'text-danger' : 'text-text-muted')} />
      <div className="flex items-center gap-1">
        <span className={cn(
          'rounded-lg bg-glass-light border border-glass-border font-mono font-bold',
          boxClasses[size],
          isUrgent ? 'text-danger border-danger/20' : 'text-text-main'
        )}>
          {String(timeLeft.minutes).padStart(2, '0')}
        </span>
        <span className="text-text-muted">:</span>
        <span className={cn(
          'rounded-lg bg-glass-light border border-glass-border font-mono font-bold',
          boxClasses[size],
          isUrgent ? 'text-danger border-danger/20' : 'text-text-main'
        )}>
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
