import React, { createContext, useContext, useEffect, useState } from 'react';
export type ThemePreference = 'light' | 'dark' | 'system';
interface ThemeContextType { theme:ThemePreference; isDark:boolean; setTheme:(theme:ThemePreference)=>void; toggleTheme:()=>void }
const ThemeContext=createContext<ThemeContextType|undefined>(undefined);
const systemIsDark=()=>window.matchMedia('(prefers-color-scheme: dark)').matches;
export function ThemeProvider({children}:{children:React.ReactNode}) {
  const [theme,setTheme]=useState<ThemePreference>(()=>{ const saved=localStorage.getItem('campus-theme'); return saved==='dark'||saved==='system'?saved:'light'; });
  const [systemDark,setSystemDark]=useState(systemIsDark);
  const isDark=theme==='dark'||(theme==='system'&&systemDark);
  useEffect(()=>{ const media=window.matchMedia('(prefers-color-scheme: dark)'); const update=()=>setSystemDark(media.matches); media.addEventListener('change',update); return()=>media.removeEventListener('change',update); },[]);
  useEffect(()=>{ localStorage.setItem('campus-theme',theme); document.documentElement.classList.toggle('dark',isDark); document.documentElement.dataset.theme=theme; },[theme,isDark]);
  return <ThemeContext.Provider value={{theme,isDark,setTheme,toggleTheme:()=>setTheme(isDark?'light':'dark')}}>{children}</ThemeContext.Provider>;
}
export function useTheme(){ const context=useContext(ThemeContext); if(!context) throw new Error('useTheme must be used within a ThemeProvider'); return context; }
