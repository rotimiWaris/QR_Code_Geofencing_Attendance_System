export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'lecturer' | 'student';
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  studentProfile?: {
    studentId: string;
    department: string;
    level: 'ND1' | 'ND2' | 'HND1' | 'HND2';
  } | null;
  lecturerProfile?: {
    staffId: string;
    title: string;
    department: string;
  } | null;
}

export interface StudentProfile {
  id: string;
  userId: string;
  studentId: string;
  department: string;
  program: string;
  yearOfStudy: number;
  enrollmentDate: string;
}

export interface LecturerProfile {
  id: string;
  userId: string;
  staffId: string;
  department: string;
  title: string;
  specialization: string;
  officeLocation?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  department: string;
  level: 'ND1' | 'ND2' | 'HND1' | 'HND2';
  creditHours: number;
  semester: string;
  lecturerId: string | null;
  lecturerName: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ClassGroup {
  id: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  name: string;
  schedule: string;
  venue: string;
  capacity: number;
  enrolledCount: number;
  isActive: boolean;
}

export interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  classGroupId: string;
  classGroupName: string;
  courseCode: string;
  courseName: string;
  enrolledAt: string;
  status: 'active' | 'dropped' | 'completed';
}

export interface Venue {
  id: string;
  name: string;
  building: string;
  floor: string;
  roomNumber: string;
  latitude: number | null;
  longitude: number | null;
  radius: number;
  capacity: number;
  isActive: boolean;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  classGroupId: string;
  classGroupName: string;
  lecturerId: string;
  lecturerName: string;
  venueId: string;
  venueName: string;
  latitude: number | null;
  longitude: number | null;
  radius: number;
  qrToken: string;
  qrType: 'static' | 'rotating';
  qrRefreshInterval?: number;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'active' | 'paused' | 'closed' | 'expired';
  checkedInCount: number;
  totalEnrolled: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendanceSessionData {
  classGroupId: string;
  venueId: string;
  radius: number;
  latitude?: number;
  longitude?: number;
  qrType: 'static' | 'rotating';
  qrRefreshInterval?: number | null;
  startTime: string;
  endTime: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  courseCode?: string;
  courseName?: string;
  venueName?: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  studentIdNumber: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  checkInTime?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  distanceFromVenue?: number;
  gpsAccuracy?: number;
  manualOverride: boolean;
  overrideReason?: string;
  overriddenBy?: string;
}

export interface ResolvedAttendanceSession {
  alreadyMarked?: boolean;
  id: string;
  courseCode: string;
  courseName: string;
  classGroupName: string;
  lecturerName: string;
  venueName: string;
  radius: number;
  startTime: string;
  endTime: string;
  status: AttendanceSession['status'];
}

export interface AttendanceAttempt {
  qrToken: string;
  sessionId?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

export interface SessionReport {
  session: AttendanceSession;
  canExport: boolean;
  summary: { total: number; present: number; late: number; absent: number; excused: number; pending: number };
  students: Array<{
    id: string; studentId: string; name: string; email: string; department: string; level: string;
    status: string; checkInTime: string | null; distance: number | null; accuracy: number | null;
  }>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface APIError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
  status: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalCourses: number;
  activeSessions: number;
  attendancePercentage: number;
  presentToday: number;
  absentToday: number;
}

export interface AttendanceTrend {
  date: string;
  present: number;
  absent: number;
  late: number;
}

export interface CourseAttendance {
  courseCode: string;
  courseName: string;
  attendanceRate: number;
  totalSessions: number;
}
