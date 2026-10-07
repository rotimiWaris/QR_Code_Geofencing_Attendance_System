import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, QrCode, History, Users, Calendar,
} from 'lucide-react';
import { cn } from '@/utils';
import { useAuth } from '@/contexts/AuthContext';

export function MobileNavigation() {
  const { user } = useAuth();
  const location = useLocation();

  const items =
    user?.role === 'admin'
      ? [
          { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'Users', href: '/admin/users', icon: Users },
          { name: 'Courses', href: '/admin/courses', icon: BookOpen },
          { name: 'Reports', href: '/admin/reports', icon: Calendar },
        ]
      : user?.role === 'lecturer'
      ? [
          { name: 'Dashboard', href: '/lecturer/dashboard', icon: LayoutDashboard },
          { name: 'Courses', href: '/lecturer/courses', icon: BookOpen },
          { name: 'Sessions', href: '/lecturer/sessions', icon: Calendar },
          { name: 'Reports', href: '/lecturer/reports', icon: Calendar },
        ]
      : [
          { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
          { name: 'Courses', href: '/student/courses', icon: BookOpen },
          { name: 'Check In', href: '/student/check-in', icon: QrCode },
          { name: 'History', href: '/student/history', icon: History },
        ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-glass-border bg-background-card lg:hidden">
      <div className="flex items-center justify-around px-2 pb-safe">
        {items.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                'relative flex min-w-[64px] flex-col items-center gap-1 px-3 py-2.5 transition-colors before:absolute before:top-0 before:h-0.5 before:w-8',
                isActive ? 'text-primary before:bg-primary' : 'text-text-dim before:bg-transparent'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
