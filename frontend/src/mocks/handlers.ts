import type {
  User, Course, Enrollment, Venue, AttendanceSession,
  AttendanceRecord, PaginatedResponse, AttendanceAttempt,
} from '@/types';
import {
  mockUsers, mockStudentProfiles, mockLecturerProfiles, mockCourses,
  mockClassGroups, mockEnrollments, mockVenues, mockAttendanceSessions,
  mockAttendanceRecords, mockDashboardStats, mockAttendanceTrends,
  mockCourseAttendance, mockNotifications,
} from './data';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function paginate<T>(items: T[], page = 1, pageSize = 10): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    count: items.length,
    next: end < items.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: items.slice(start, end),
  };
}

export const mockAuth = {
  async login(data: { email: string; password: string; role: string }) {
    await delay(800);
    const user = mockUsers.find(
      (u) => u.email === data.email && u.role === data.role
    );
    if (!user) {
      throw new Error('Invalid credentials');
    }
    return { token: `mock-token-${user.id}`, user };
  },

  async logout() {
    await delay(300);
    return { success: true };
  },

  async me() {
    await delay(300);
    const token = localStorage.getItem('auth_token') || '';
    const userId = token.replace('mock-token-', '');
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) throw new Error('Not authenticated');
    return user;
  },
};

export const mockUserApi = {
  async list(params?: { role?: string; search?: string; page?: number }) {
    await delay(400);
    let items = [...mockUsers];
    if (params?.role) items = items.filter((u) => u.role === params.role);
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (u) =>
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }
    return paginate(items, params?.page || 1, 10);
  },

  async get(id: string) {
    await delay(300);
    const user = mockUsers.find((u) => u.id === id);
    if (!user) throw new Error('User not found');
    return user;
  },

  async create(data: Partial<User>) {
    await delay(500);
    const newUser = { ...data, id: String(mockUsers.length + 1), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as User;
    mockUsers.push(newUser);
    return newUser;
  },

  async update(id: string, data: Partial<User>) {
    await delay(400);
    const idx = mockUsers.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    mockUsers[idx] = { ...mockUsers[idx], ...data, updatedAt: new Date().toISOString() };
    return mockUsers[idx];
  },

  async delete(id: string) {
    await delay(300);
    const idx = mockUsers.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    mockUsers.splice(idx, 1);
    return { success: true };
  },
};

export const mockStudentApi = {
  async list(params?: { search?: string; department?: string; page?: number }) {
    await delay(400);
    const students = mockUsers
      .filter((u) => u.role === 'student')
      .map((u) => ({
        ...u,
        profile: mockStudentProfiles[u.id],
      }));
    let items = [...students];
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (s) =>
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          s.profile?.studentId?.toLowerCase().includes(q)
      );
    }
    if (params?.department) {
      items = items.filter((s) => s.profile?.department === params.department);
    }
    return paginate(items, params?.page || 1, 10);
  },

  async get(id: string) {
    await delay(300);
    const user = mockUsers.find((u) => u.id === id && u.role === 'student');
    if (!user) throw new Error('Student not found');
    return { ...user, profile: mockStudentProfiles[id] };
  },
};

export const mockLecturerApi = {
  async list(params?: { search?: string; department?: string; page?: number }) {
    await delay(400);
    const lecturers = mockUsers
      .filter((u) => u.role === 'lecturer')
      .map((u) => ({
        ...u,
        profile: mockLecturerProfiles[u.id],
      }));
    let items = [...lecturers];
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (l) =>
          l.firstName.toLowerCase().includes(q) ||
          l.lastName.toLowerCase().includes(q) ||
          l.profile?.staffId?.toLowerCase().includes(q)
      );
    }
    return paginate(items, params?.page || 1, 10);
  },

  async get(id: string) {
    await delay(300);
    const user = mockUsers.find((u) => u.id === id && u.role === 'lecturer');
    if (!user) throw new Error('Lecturer not found');
    return { ...user, profile: mockLecturerProfiles[id] };
  },
};

export const mockCourseApi = {
  async list(params?: { search?: string; department?: string; page?: number }) {
    await delay(400);
    let items = [...mockCourses];
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q)
      );
    }
    return paginate(items, params?.page || 1, 10);
  },

  async get(id: string) {
    await delay(300);
    const course = mockCourses.find((c) => c.id === id);
    if (!course) throw new Error('Course not found');
    return course;
  },

  async create(data: Partial<Course>) {
    await delay(500);
    const newCourse = { ...data, id: `c${mockCourses.length + 1}`, createdAt: new Date().toISOString() } as Course;
    mockCourses.push(newCourse);
    return newCourse;
  },

  async update(id: string, data: Partial<Course>) {
    await delay(400);
    const idx = mockCourses.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Course not found');
    mockCourses[idx] = { ...mockCourses[idx], ...data };
    return mockCourses[idx];
  },

  async delete(id: string) {
    await delay(300);
    const idx = mockCourses.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Course not found');
    mockCourses.splice(idx, 1);
    return { success: true };
  },
};

export const mockClassGroupApi = {
  async list(params?: { course?: string; page?: number }) {
    await delay(300);
    let items = [...mockClassGroups];
    if (params?.course) items = items.filter((g) => g.courseId === params.course);
    return paginate(items, params?.page || 1, 10);
  },

  async get(id: string) {
    await delay(200);
    const group = mockClassGroups.find((g) => g.id === id);
    if (!group) throw new Error('Class group not found');
    return group;
  },
};

export const mockEnrollmentApi = {
  async list(params?: { student?: string; classGroup?: string; page?: number }) {
    await delay(300);
    let items = [...mockEnrollments];
    if (params?.student) items = items.filter((e) => e.studentId === params.student);
    if (params?.classGroup) items = items.filter((e) => e.classGroupId === params.classGroup);
    return paginate(items, params?.page || 1, 10);
  },

  async create(data: { studentId: string; classGroupId: string }) {
    await delay(400);
    const group = mockClassGroups.find((g) => g.id === data.classGroupId);
    const student = mockUsers.find((u) => u.id === data.studentId);
    const newEnrollment: Enrollment = {
      id: `e${mockEnrollments.length + 1}`,
      studentId: data.studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
      classGroupId: data.classGroupId,
      classGroupName: group?.name || 'Unknown',
      courseCode: group?.courseCode || 'Unknown',
      courseName: group?.courseName || 'Unknown',
      enrolledAt: new Date().toISOString(),
      status: 'active',
    };
    mockEnrollments.push(newEnrollment);
    return newEnrollment;
  },

  async delete(id: string) {
    await delay(300);
    const idx = mockEnrollments.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Enrollment not found');
    mockEnrollments.splice(idx, 1);
    return { success: true };
  },
};

export const mockVenueApi = {
  async list(params?: { search?: string; page?: number }) {
    await delay(300);
    let items = [...mockVenues];
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter((v) => v.name.toLowerCase().includes(q) || v.building.toLowerCase().includes(q));
    }
    return paginate(items, params?.page || 1, 10);
  },

  async get(id: string) {
    await delay(200);
    const venue = mockVenues.find((v) => v.id === id);
    if (!venue) throw new Error('Venue not found');
    return venue;
  },

  async create(data: Partial<Venue>) {
    await delay(400);
    const newVenue = { ...data, id: `v${mockVenues.length + 1}`, isActive: true } as Venue;
    mockVenues.push(newVenue);
    return newVenue;
  },

  async update(id: string, data: Partial<Venue>) {
    await delay(300);
    const idx = mockVenues.findIndex((v) => v.id === id);
    if (idx === -1) throw new Error('Venue not found');
    mockVenues[idx] = { ...mockVenues[idx], ...data };
    return mockVenues[idx];
  },

  async delete(id: string) {
    await delay(300);
    const idx = mockVenues.findIndex((v) => v.id === id);
    if (idx === -1) throw new Error('Venue not found');
    mockVenues.splice(idx, 1);
    return { success: true };
  },
};

export const mockAttendanceApi = {
  async sessions(params?: { course?: string; status?: string; page?: number }) {
    await delay(400);
    let items = [...mockAttendanceSessions];
    if (params?.course) items = items.filter((s) => s.courseId === params.course);
    if (params?.status) items = items.filter((s) => s.status === params.status);
    return paginate(items, params?.page || 1, 10);
  },

  async getSession(id: string) {
    await delay(300);
    const session = mockAttendanceSessions.find((s) => s.id === id);
    if (!session) throw new Error('Session not found');
    return session;
  },

  async createSession(data: Partial<AttendanceSession>) {
    await delay(600);
    const newSession = {
      ...data,
      id: `s${mockAttendanceSessions.length + 1}`,
      checkedInCount: 0,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as AttendanceSession;
    mockAttendanceSessions.push(newSession);
    return newSession;
  },

  async closeSession(id: string) {
    await delay(400);
    const idx = mockAttendanceSessions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Session not found');
    mockAttendanceSessions[idx].status = 'closed';
    mockAttendanceSessions[idx].updatedAt = new Date().toISOString();
    return mockAttendanceSessions[idx];
  },

  async sessionRecords(id: string) {
    await delay(300);
    const records = mockAttendanceRecords.filter((r) => r.sessionId === id);
    return paginate(records, 1, 50);
  },

  async checkIn(data: AttendanceAttempt) {
    await delay(1000);
    const session = mockAttendanceSessions.find((s) => s.qrToken === data.qrToken);
    if (!session) {
      return { success: false, message: 'Invalid QR code' };
    }
    if (session.status !== 'active') {
      return { success: false, message: 'Session expired' };
    }
    if (data.accuracy > 50) {
      return { success: false, message: 'GPS accuracy too low' };
    }
    const token = localStorage.getItem('auth_token') || '';
    const userId = token.replace('mock-token-', '');
    const enrolled = mockEnrollments.find(
      (e) => e.studentId === userId && e.classGroupId === session.classGroupId
    );
    if (!enrolled) {
      return { success: false, message: 'Student not enrolled' };
    }
    const existing = mockAttendanceRecords.find(
      (r) => r.sessionId === session.id && r.studentId === userId
    );
    if (existing) {
      return { success: false, message: 'Already marked' };
    }
    const newRecord: AttendanceRecord = {
      id: `r${mockAttendanceRecords.length + 1}`,
      sessionId: session.id,
      studentId: userId,
      studentName: enrolled.studentName,
      studentIdNumber: mockStudentProfiles[userId]?.studentId || 'Unknown',
      status: 'present',
      checkInTime: new Date().toISOString(),
      checkInLatitude: data.latitude,
      checkInLongitude: data.longitude,
      distanceFromVenue: 20,
      gpsAccuracy: data.accuracy,
      manualOverride: false,
    };
    mockAttendanceRecords.push(newRecord);
    session.checkedInCount += 1;
    return { success: true, message: 'Attendance successfully recorded', record: newRecord };
  },

  async myHistory(params?: { course?: string; status?: string; page?: number }) {
    await delay(400);
    const token = localStorage.getItem('auth_token') || '';
    const userId = token.replace('mock-token-', '');
    let items = mockAttendanceRecords.filter((r) => r.studentId === userId);
    if (params?.status) items = items.filter((r) => r.status === params.status);
    return paginate(items, params?.page || 1, 10);
  },
};

export const mockReportApi = {
  async attendance() {
    await delay(500);
    return {
      trends: mockAttendanceTrends,
      courseStats: mockCourseAttendance,
      summary: mockDashboardStats,
    };
  },
};

export const mockNotificationApi = {
  async list() {
    await delay(300);
    return mockNotifications;
  },

  async markRead(id: string) {
    await delay(200);
    const notif = mockNotifications.find((n) => n.id === id);
    if (notif) notif.read = true;
    return notif;
  },

  async markAllRead() {
    await delay(200);
    mockNotifications.forEach((n) => (n.read = true));
    return { success: true };
  },
};
