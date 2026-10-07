import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Download, Filter } from 'lucide-react';
import { cn } from '@/utils';
import { GlassCard } from './GlassCard';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  emptyTitle?: string;
  emptyDescription?: string;
  onExport?: () => void;
  filters?: React.ReactNode;
  rowActions?: (item: T) => React.ReactNode;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  searchable,
  searchPlaceholder = 'Search...',
  onSearch,
  pagination,
  emptyTitle,
  emptyDescription,
  onExport,
  filters,
  rowActions,
  onRowClick,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  if (isLoading) {
    return (
      <GlassCard>
        <div className="space-y-4">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-full max-w-xs" />
            <Skeleton className="h-10 w-24 ml-auto" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              {columns.map((_, j) => (
                <Skeleton key={j} className="h-12 flex-1" />
              ))}
              {rowActions && <Skeleton className="h-12 w-20" />}
            </div>
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="none">
      {(searchable || onExport || filters) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 sm:p-5 border-b border-glass-border">
          {searchable && (
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl border border-glass-border bg-glass-light pl-10 pr-4 py-2 text-sm text-text-main placeholder:text-text-dim focus:border-primary/50 focus:ring-1 focus:ring-primary/30 focus:outline-none"
              />
            </div>
          )}
          {filters && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-text-dim" />
              {filters}
            </div>
          )}
          {onExport && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={onExport}
              className="ml-auto"
            >
              Export
            </Button>
          )}
        </div>
      )}

      {data.length === 0 ? <EmptyState title={emptyTitle || 'No data found'} description={emptyDescription || 'There are no items to display.'} /> : <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-glass-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right'
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
              {rowActions && <th className="px-4 py-3 w-20" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-glass-border/50">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={cn('hover:bg-primary/5 transition-colors', onRowClick && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary')}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={event => {
                  if (!(event.target as HTMLElement).closest('button, a, input, select, textarea')) onRowClick?.(item);
                }}
                onKeyDown={event => {
                  if (onRowClick && event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) {
                    event.preventDefault();
                    onRowClick(item);
                  }
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3.5 text-sm text-text-main',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right'
                    )}
                  >
                    {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {rowActions(item)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-glass-border">
          <p className="text-sm text-text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg p-2 text-text-muted hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg p-2 text-text-muted hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
