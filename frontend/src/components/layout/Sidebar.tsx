import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, MapPin, X, QrCode, History, CalendarDays } from 'lucide-react';
import { cn } from '@/utils';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps { isOpen:boolean; onClose:()=>void }
const nav = {
  admin: [
    {name:'Overview',href:'/admin/dashboard',icon:LayoutDashboard}, {name:'People',href:'/admin/users',icon:Users},
    {name:'Courses',href:'/admin/courses',icon:BookOpen}, {name:'Venues',href:'/admin/venues',icon:MapPin},
    {name:'Classes',href:'/admin/classes',icon:CalendarDays}, {name:'Enrollments',href:'/admin/enrollments',icon:Users},
    {name:'Reports',href:'/admin/reports',icon:History},
  ],
  lecturer: [
    {name:'Today',href:'/lecturer/dashboard',icon:LayoutDashboard}, {name:'Modules',href:'/lecturer/courses',icon:BookOpen},
    {name:'Sessions',href:'/lecturer/sessions',icon:CalendarDays},
    {name:'Reports',href:'/lecturer/reports',icon:History},
  ],
  student: [
    {name:'Today',href:'/student/dashboard',icon:LayoutDashboard}, {name:'Modules',href:'/student/courses',icon:BookOpen},
    {name:'Check in',href:'/student/check-in',icon:QrCode}, {name:'Registry',href:'/student/history',icon:History},
  ],
};

export function Sidebar({isOpen,onClose}:SidebarProps) {
  const {user}=useAuth(); const location=useLocation();
  const items=nav[(user?.role||'student') as keyof typeof nav];
  return <>
    <button aria-label="Close navigation" className={cn('fixed inset-0 z-40 bg-text-main/30 transition-opacity lg:hidden',isOpen?'opacity-100':'pointer-events-none opacity-0')} onClick={onClose}/>
    <aside className={cn('fixed inset-y-0 left-0 z-50 w-60 transform border-r border-glass-border bg-background-elevated transition-transform duration-200 lg:translate-x-0',isOpen?'translate-x-0':'-translate-x-full')}>
      <div className="flex h-full flex-col">
        <div className="flex h-24 items-center justify-between border-b border-glass-border px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center border border-primary bg-primary text-background font-display text-lg font-extrabold">CP</div>
            <div><p className="font-display text-sm font-extrabold leading-tight">Campus<br/>Presence</p><p className="registry-label mt-1">Registry / 26</p></div>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted lg:hidden" aria-label="Close menu"><X className="h-5 w-5"/></button>
        </div>
        <div className="border-b border-glass-border px-5 py-4"><p className="registry-label">Signed in as</p><p className="mt-1 text-sm font-semibold capitalize">{user?.role}</p></div>
        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Main navigation">
          <p className="registry-label px-3 pb-3">Directory</p>
          <div className="space-y-1">{items.map((item,index)=>{const active=location.pathname===item.href; return <NavLink key={item.href} to={item.href} onClick={onClose} className={cn('group flex items-center gap-3 border-l-2 px-3 py-3 text-sm transition-colors',active?'border-primary bg-primary/8 font-semibold text-primary':'border-transparent text-text-muted hover:border-glass-border hover:bg-primary/5 hover:text-text-main')}>
            <span className="font-mono text-[9px] text-text-dim">{String(index+1).padStart(2,'0')}</span><item.icon className="h-[18px] w-[18px]"/><span>{item.name}</span>
          </NavLink>})}</div>
        </nav>
        <div className="border-t border-glass-border p-5"><p className="registry-label">Academic year</p><p className="mt-1 text-sm font-semibold">2026 / 2027</p><p className="mt-3 font-mono text-[10px] text-text-dim">06.5244° N · 3.3792° E</p></div>
      </div>
    </aside>
  </>;
}
