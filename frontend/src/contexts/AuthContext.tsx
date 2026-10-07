import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { authApi } from '@/api/endpoints';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null; isLoading: boolean; isAuthenticated: boolean;
  login: (email: string, password: string, role: string) => Promise<void>;
  logout: () => Promise<void>; checkAuth: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const savedUser = (): User | null => {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(savedUser);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const clear = useCallback(() => {
    ['auth_token', 'refresh_token', 'user'].forEach(key => localStorage.removeItem(key));
    setUser(null);
    queryClient.clear();
  }, [queryClient]);
  const checkAuth = useCallback(async () => {
    if (!localStorage.getItem('auth_token') && !localStorage.getItem('refresh_token')) { clear(); setIsLoading(false); return; }
    try {
      const current = await authApi.me();
      if (localStorage.getItem('auth_token')) { setUser(current); localStorage.setItem('user', JSON.stringify(current)); }
    } catch (error) {
      // A temporary network/server failure must not erase a valid refresh token.
      if (axios.isAxiosError(error) && error.response?.status === 401) clear();
    } finally { setIsLoading(false); }
  }, [clear]);
  useEffect(() => {
    void checkAuth();
    window.addEventListener('auth-expired', clear);
    const sync = (event: StorageEvent) => {
      if (event.key === 'user' || event.key === 'auth_token') setUser(localStorage.getItem('auth_token') ? savedUser() : null);
      if (event.key === 'auth_token' && !event.newValue) queryClient.clear();
    };
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('auth-expired', clear); window.removeEventListener('storage', sync); };
  }, [checkAuth, clear, queryClient]);
  const login = useCallback(async (email: string, password: string, role: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.login({ email, password, role });
      queryClient.clear();
      localStorage.setItem('auth_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
    } finally { setIsLoading(false); }
  }, [queryClient]);
  const logout = useCallback(async () => {
    setIsLoading(true);
    try { const refresh = localStorage.getItem('refresh_token'); if (refresh) await authApi.logout(refresh); }
    finally { clear(); setIsLoading(false); }
  }, [clear]);
  return <AuthContext.Provider value={{ user, isLoading, isAuthenticated: Boolean(user), login, logout, checkAuth }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within an AuthProvider');
  return value;
}
