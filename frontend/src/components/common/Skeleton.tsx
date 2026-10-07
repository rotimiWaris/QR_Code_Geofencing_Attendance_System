import { cn } from '@/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-white/5',
        className
      )}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-glass-border bg-glass-light p-5 sm:p-6 shadow-glass">
      <div className="flex items-start justify-between">
        <div className="space-y-3 w-full">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1 hidden sm:block" />
        <Skeleton className="h-10 w-20" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1 hidden sm:block" />
          <Skeleton className="h-12 w-20" />
        </div>
      ))}
    </div>
  );
}
