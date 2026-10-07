import { cn, getInitials } from '@/utils';

interface UserAvatarProps {
  firstName: string;
  lastName: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function UserAvatar({ firstName, lastName, src, size = 'md', className }: UserAvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName} ${lastName}`}
        className={cn('rounded-full object-cover ring-2 ring-glass-border', sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/20 text-primary font-bold ring-2 ring-glass-border',
        sizeMap[size],
        className
      )}
    >
      {getInitials(firstName, lastName)}
    </div>
  );
}
