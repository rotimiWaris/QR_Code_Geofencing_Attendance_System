import { useState } from 'react';
import { Menu, LogOut, User, ChevronDown, Sun, Moon, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SessionActivity } from './SessionActivity';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext';
import { cn } from '@/utils';

export function TopBar({onMenuClick}:{onMenuClick:()=>void}) {
  const {user,logout}=useAuth(); const {theme,setTheme}=useTheme();
  const [profileOpen,setProfileOpen]=useState(false); const [themeOpen,setThemeOpen]=useState(false);
  const themes:{value:ThemePreference;label:string;icon:typeof Sun}[]=[{value:'light',label:'Light',icon:Sun},{value:'dark',label:'Dark',icon:Moon},{value:'system',label:'System',icon:Monitor}];
  const ThemeIcon=themes.find(t=>t.value===theme)?.icon||Sun;
  return <header className="sticky top-0 z-30 border-b border-glass-border bg-background/95">
    <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
      <div className="flex items-center gap-3"><button onClick={onMenuClick} className="p-2 text-text-muted lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5"/></button><div><p className="registry-label hidden sm:block">Campus operations</p><p className="text-sm font-semibold">Attendance Registry</p></div></div>
      <div className="flex items-center gap-1">
        <div className="relative"><button onClick={()=>setThemeOpen(!themeOpen)} className="flex items-center gap-2 rounded-lg border border-glass-border bg-background-card px-3 py-2 text-xs font-semibold" aria-label="Select theme" aria-expanded={themeOpen}><ThemeIcon className="h-4 w-4"/><span className="hidden sm:inline capitalize">{theme}</span></button>
        {themeOpen&&<div className="absolute right-0 mt-2 w-36 border border-glass-border bg-background-card p-1 shadow-glass">{themes.map(item=><button key={item.value} onClick={()=>{setTheme(item.value);setThemeOpen(false)}} className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs',theme===item.value?'bg-primary text-background':'hover:bg-primary/8')}><item.icon className="h-4 w-4"/>{item.label}</button>)}</div>}</div>
        <SessionActivity />
        <div className="relative"><button onClick={()=>setProfileOpen(!profileOpen)} className="ml-1 flex items-center gap-2 border-l border-glass-border py-1 pl-3"><div className="grid h-8 w-8 place-items-center bg-primary text-xs font-bold text-background">{user?.firstName?.[0]}{user?.lastName?.[0]}</div><ChevronDown className="h-4 w-4 text-text-muted"/></button>
        {profileOpen&&<div className="absolute right-0 mt-2 w-60 border border-glass-border bg-background-card shadow-glass"><div className="border-b border-glass-border p-4"><p className="font-semibold">{user?.firstName} {user?.lastName}</p><p className="mt-1 truncate text-xs text-text-muted">{user?.email}</p></div><Link to="/profile" onClick={() => setProfileOpen(false)} className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-primary/5"><User className="h-4 w-4"/>Profile</Link><button onClick={() => void logout().catch(() => {})} className="flex w-full items-center gap-2 border-t border-glass-border px-4 py-3 text-sm text-danger hover:bg-danger/5"><LogOut className="h-4 w-4"/>Sign out</button></div>}</div>
      </div>
    </div>
  </header>;
}
