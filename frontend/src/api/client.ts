import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type { APIError } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const isPublicAuth = (url = '') => ['/auth/login/', '/auth/signup/', '/auth/token/refresh/', '/auth/password-reset/'].some(path => url.includes(path));

function expireAuthentication() {
  ['auth_token', 'refresh_token', 'user'].forEach(key => localStorage.removeItem(key));
  window.dispatchEvent(new Event('auth-expired'));
}

class APIClient {
  private client: AxiosInstance;
  private refreshing: Promise<string> | null = null;

  private refreshAccessToken(failedToken?: string): Promise<string> {
    if (this.refreshing) return this.refreshing;
    const refresh = async () => {
      const latestAccess = localStorage.getItem('auth_token');
      if (latestAccess && latestAccess !== failedToken) return latestAccess;
      const savedRefresh = localStorage.getItem('refresh_token');
      if (!savedRefresh) { expireAuthentication(); throw new Error('Your session has expired. Please sign in again.'); }
      try {
        const response = await axios.post<{ access: string; refresh?: string }>(
          `${API_BASE_URL}/auth/token/refresh/`, { refresh: savedRefresh }, { timeout: 30000 },
        );
        if (localStorage.getItem('refresh_token') !== savedRefresh) throw new Error('Authentication changed while refreshing.');
        localStorage.setItem('auth_token', response.data.access);
        if (response.data.refresh) localStorage.setItem('refresh_token', response.data.refresh);
        return response.data.access;
      } catch (error) {
        if (axios.isAxiosError(error) && [400, 401].includes(error.response?.status ?? 0)) expireAuthentication();
        throw error;
      }
    };
    // Coordinate refreshes across tabs where Web Locks is supported.
    const pending: Promise<string> = Promise.resolve(navigator.locks ? navigator.locks.request('attendance-auth-refresh', refresh) : refresh());
    this.refreshing = pending
      .finally(() => { this.refreshing = null; });
    return this.refreshing;
  }

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<APIError>) => {
        const config = error.config as RetryConfig | undefined;
        if (error.response?.status === 401 && config && !isPublicAuth(config.url)) {
          if (config._retry) { expireAuthentication(); return Promise.reject(error); }
          config._retry = true;
          const failedToken = String(config.headers.Authorization ?? '').replace(/^Bearer /, '');
          const access = await this.refreshAccessToken(failedToken);
          config.headers.Authorization = `Bearer ${access}`;
          return this.client.request(config);
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new APIClient();
