import { apiClient } from './client';
import type {
  User, Course, ClassGroup,
  Enrollment, Venue, AttendanceSession, AttendanceRecord,
  PaginatedResponse,
  AttendanceAttempt, CreateAttendanceSessionData, ResolvedAttendanceSession, SessionReport,
} from '@/types';

export const authApi = {
  login: (data: { email: string; password: string; role: string }) =>
    apiClient.post<{ access: string; refresh: string; user: User }>('/auth/login/', data),
  logout: (refresh: string) => apiClient.post<void>('/auth/logout/', { refresh }),
  me: () => apiClient.get<User>('/auth/me/'),
  signup: (data: SignupData) => apiClient.post<{ access:string; refresh:string; user:User }>('/auth/signup/', data),
};

export interface SignupData {
  token:string; role:'student'|'lecturer'; email:string; password:string; firstName:string; lastName:string;
  identificationNumber:string; department:string; level?:'ND1'|'ND2'|'HND1'|'HND2'; title?:string;
}

export interface RegistrationToken {
  id:string; code:string; role:'student'|'lecturer'; isUsed:boolean; createdAt:string; usedAt:string|null; usedBy:string|null;
}

export const registrationTokenApi = {
  list: () => apiClient.get<RegistrationToken[]>('/auth/registration-tokens/'),
  generate: (role:'student'|'lecturer') => apiClient.post<RegistrationToken>('/auth/registration-tokens/', { role }),
};

export const userApi = {
  list: (params?: { role?: string; search?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<User>>('/users/', { params }),
  get: (id: string) => apiClient.get<User>(`/users/${id}/`),
  update: (id: string, data: Partial<User>) => apiClient.patch<User>(`/users/${id}/`, data),
};

export const studentApi = {
  list: (params?: { search?: string; department?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<User>>('/students/', { params }),
};

export const lecturerApi = {
  list: (params?: { search?: string; department?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<User>>('/lecturers/', { params }),
};

export const courseApi = {
  all: () => fetchAllPages<Course>('/courses/'),
  list: (params?: { search?: string; department?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<Course>>('/courses/', { params }),
  get: (id: string) => apiClient.get<Course>(`/courses/${id}/`),
  create: (data: Partial<Course>) => apiClient.post<Course>('/courses/', data),
  update: (id: string, data: Partial<Course>) => apiClient.patch<Course>(`/courses/${id}/`, data),
  delete: (id: string) => apiClient.delete<void>(`/courses/${id}/`),
};

export const classGroupApi = {
  all: (params?: Record<string, string>) => fetchAllPages<ClassGroup>('/class-groups/', params),
  list: (params?: { course?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<ClassGroup>>('/class-groups/', { params }),
  get: (id: string) => apiClient.get<ClassGroup>(`/class-groups/${id}/`),
  create: (data: Partial<ClassGroup>) => apiClient.post<ClassGroup>('/class-groups/', data),
  update: (id: string, data: Partial<ClassGroup>) => apiClient.patch<ClassGroup>(`/class-groups/${id}/`, data),
  delete: (id: string) => apiClient.delete<void>(`/class-groups/${id}/`),
};

export const enrollmentApi = {
  list: (params?: { student?: string; classGroup?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<Enrollment>>('/enrollments/', { params }),
  create: (data: { studentId: string; classGroupId: string }) =>
    apiClient.post<Enrollment>('/enrollments/', data),
  delete: (id: string) => apiClient.delete<void>(`/enrollments/${id}/`),
};

export const venueApi = {
  all: () => fetchAllPages<Venue>('/venues/'),
  list: (params?: { search?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<Venue>>('/venues/', { params }),
  get: (id: string) => apiClient.get<Venue>(`/venues/${id}/`),
  create: (data: Partial<Venue>) => apiClient.post<Venue>('/venues/', data),
  update: (id: string, data: Partial<Venue>) => apiClient.patch<Venue>(`/venues/${id}/`, data),
  delete: (id: string) => apiClient.delete<void>(`/venues/${id}/`),
};

export const attendanceApi = {
  studentSessionActivity: () => apiClient.get<ResolvedAttendanceSession[]>('/attendance/activity/'),
  lecturerDashboard: (dayStart: string, dayEnd: string) => apiClient.get<{ generatedAt: string; courses: Course[]; todaySessions: AttendanceSession[] }>('/dashboard/lecturer/', { params: { dayStart, dayEnd } }),
  adminDashboard: (dayStart: string, dayEnd: string) => apiClient.get<AdminDashboardData>('/dashboard/admin/', { params: { dayStart, dayEnd } }),
  studentDashboard: (dayStart: string, dayEnd: string) => apiClient.get<{
    presence: { present: number; late: number; absent: number; total: number; rate: number };
    todaySessions: ResolvedAttendanceSession[];
  }>('/dashboard/student/', { params: { dayStart, dayEnd } }),
  availableSessions: () => apiClient.get<ResolvedAttendanceSession[]>('/attendance/available/'),
  sessions: (params?: { course?: string; status?: string; page?: number; search?: string; ordering?: string }) =>
    apiClient.get<PaginatedResponse<AttendanceSession>>('/attendance/sessions/', { params }),
  getSession: (id: string) => apiClient.get<AttendanceSession>(`/attendance/sessions/${id}/`),
  sessionReport: (id: string) => apiClient.get<SessionReport>(`/attendance/sessions/${id}/report/`),
  exportSessionReport: (id: string, fileType: 'pdf' | 'xlsx') =>
    apiClient.get<Blob>(`/attendance/sessions/${id}/report-export/`, { params: { fileType }, responseType: 'blob' }),
  createSession: (data: CreateAttendanceSessionData) =>
    apiClient.post<AttendanceSession>('/attendance/sessions/', data),
  closeSession: (id: string) =>
    apiClient.post<AttendanceSession>(`/attendance/sessions/${id}/close/`, {}),
  resolveSession: (qrToken: string, sessionId?: string) =>
    apiClient.post<{ success: boolean; session: ResolvedAttendanceSession }>('/attendance/resolve/', { qrToken, ...(sessionId ? { sessionId } : {}) }),
  sessionRecords: (id: string, params?: { page?: number }) =>
    apiClient.get<PaginatedResponse<AttendanceRecord>>(`/attendance/sessions/${id}/records/`, { params }),
  checkIn: (data: AttendanceAttempt) =>
    apiClient.post<{ success: boolean; message: string; record: AttendanceRecord }>('/attendance/check-in/', data),
  myHistory: (params?: { course?: string; status?: string; page?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<AttendanceRecord>>('/attendance/my-history/', { params }),
};

export async function fetchAllPages<T>(url: string, params?: Record<string, string>): Promise<PaginatedResponse<T>> {
  const results: T[] = [];
  let page = 1;
  let count = 0;
  while (true) {
    const data = await apiClient.get<PaginatedResponse<T>>(url, { params: { ...params, page } });
    results.push(...data.results); count = data.count;
    if (!data.next) return { count, results, next: null, previous: null };
    page++;
  }
}

export interface AdminDashboardData {
  generatedAt: string;
  summary: { totalStudents: number; totalLecturers: number; totalCourses: number; totalClasses: number; totalVenues: number; activeEnrollments: number; unusedTokens: number; usedTokens: number; activeSessions: number; sessionsToday: number; presentToday: number; lateToday: number; absentToday: number; pendingToday: number; excusedToday: number; attendancePercentage: number | null };
  trends: { date: string; present: number; late: number; absent: number; pending: number; excused: number; total: number; attendanceRate: number | null }[];
  courseStats: { courseId: string; courseCode: string; courseName: string; sessions: number; present: number; late: number; absent: number; excused: number; total: number; attendanceRate: number | null }[];
  todaySessions: { id: string; courseCode: string; classGroupName: string; lecturerName: string; venueName: string; startTime: string; endTime: string; status: string; checkedInCount: number; totalEnrolled: number }[];
}
