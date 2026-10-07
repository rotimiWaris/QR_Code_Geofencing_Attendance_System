import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['admin', 'lecturer', 'student']),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const userSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  role: z.enum(['admin', 'lecturer', 'student']),
  isActive: z.boolean().default(true),
});

export type UserFormData = z.infer<typeof userSchema>;

export const studentProfileSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  department: z.string().min(1, 'Department is required'),
  program: z.string().min(1, 'Program is required'),
  yearOfStudy: z.number().min(1).max(7),
});

export type StudentProfileFormData = z.infer<typeof studentProfileSchema>;

export const lecturerProfileSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
  department: z.string().min(1, 'Department is required'),
  title: z.string().min(1, 'Title is required'),
  specialization: z.string().min(1, 'Specialization is required'),
  officeLocation: z.string().optional(),
});

export type LecturerProfileFormData = z.infer<typeof lecturerProfileSchema>;

export const courseSchema = z.object({
  code: z.string().min(1, 'Course code is required'),
  name: z.string().min(1, 'Course name is required'),
  description: z.string().min(1, 'Description is required'),
  department: z.string().min(1, 'Department is required'),
  creditHours: z.number().min(1).max(6),
  semester: z.string().min(1, 'Semester is required'),
});

export type CourseFormData = z.infer<typeof courseSchema>;

export const venueSchema = z.object({
  name: z.string().min(1, 'Venue name is required'),
  building: z.string().min(1, 'Building is required'),
  floor: z.string().min(1, 'Floor is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(10).max(500),
  capacity: z.number().min(1),
});

export type VenueFormData = z.infer<typeof venueSchema>;

export const attendanceSessionSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  classGroupId: z.string().min(1, 'Class group is required'),
  venueId: z.string().min(1, 'Venue is required'),
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number().min(10).max(500),
  qrType: z.enum(['static', 'rotating']),
  qrRefreshInterval: z.number().min(10).max(300).optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
});

export type AttendanceSessionFormData = z.infer<typeof attendanceSessionSchema>;

export const manualAttendanceSchema = z.object({
  status: z.enum(['present', 'absent', 'late', 'excused']),
  reason: z.string().min(5, 'Please provide a reason (min 5 characters)'),
});

export type ManualAttendanceFormData = z.infer<typeof manualAttendanceSchema>;
