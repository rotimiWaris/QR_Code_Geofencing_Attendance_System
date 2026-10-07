from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APITestCase
from accounts.models import User, StudentProfile, RegistrationToken
from .models import Course, Venue, ClassGroup, Enrollment, AttendanceSession, AttendanceRecord


class AdminDashboardTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.now = datetime(2026, 9, 13, 12, tzinfo=dt_timezone.utc)
        cls.admin = User.objects.create_user(email='dashboard.admin@test.edu', first_name='Ada', last_name='Admin', role='admin')
        cls.lecturer = User.objects.create_user(email='dashboard.lec@test.edu', first_name='Lee', last_name='Tutor', role='lecturer')
        cls.students = []
        for i in range(2):
            user = User.objects.create_user(email=f'dashboard.student{i}@test.edu', first_name='Student', last_name=str(i), role='student')
            cls.students.append(StudentProfile.objects.create(user=user, student_number=f'DASH{i}', level='ND1', department='Computing'))
        cls.course = Course.objects.create(code='DAS111', name='Dashboard course', level='ND1', lecturer=cls.lecturer)
        cls.venue = Venue.objects.create(name='Dashboard room')
        cls.group = ClassGroup.objects.create(course=cls.course, name='ND1', venue=cls.venue)
        for student in cls.students:
            Enrollment.objects.create(student=student, class_group=cls.group)
        Enrollment.objects.update(enrolled_at=cls.now - timedelta(days=10))

    def setUp(self):
        self.client.force_authenticate(self.admin)
        self.clock = patch('django.utils.timezone.now', return_value=self.now)
        self.clock.start()
        self.addCleanup(self.clock.stop)

    def session(self, start, end, status='scheduled'):
        return AttendanceSession.objects.create(class_group=self.group, lecturer=self.lecturer, venue=self.venue,
            start_time=start, end_time=end, status=status)

    def record(self, session, student, status='present'):
        return AttendanceRecord.objects.create(session=session, student=student, status=status,
            check_in_latitude=7, check_in_longitude=3, distance_from_venue=1, gps_accuracy=20)

    def test_empty_overview_has_real_totals_and_no_fake_rates(self):
        token = RegistrationToken.issue('student', self.admin)
        RegistrationToken.objects.filter(pk=token.pk).update(is_used=True)
        RegistrationToken.issue('lecturer', self.admin)
        Course.objects.create(code='DAS112', name='Inactive', level='ND1', is_active=False)
        response = self.client.get(reverse('admin-dashboard'))
        self.assertEqual(response.status_code, 200)
        summary = response.data['summary']
        self.assertEqual(summary['totalStudents'], 2)
        self.assertEqual(summary['totalLecturers'], 1)
        self.assertEqual(summary['totalCourses'], 1)
        self.assertEqual(summary['totalClasses'], 1)
        self.assertEqual(summary['totalVenues'], 1)
        self.assertEqual(summary['activeEnrollments'], 2)
        self.assertEqual(summary['unusedTokens'], 1)
        self.assertEqual(summary['usedTokens'], 1)
        self.assertIsNone(summary['attendancePercentage'])
        self.assertEqual(len(response.data['trends']), 7)
        self.assertEqual(response.data['courseStats'], [])
        self.assertEqual(response.data['todaySessions'], [])

    def test_finished_absences_open_pending_and_future_exclusion(self):
        finished = self.session(self.now - timedelta(hours=3), self.now - timedelta(hours=2))
        self.record(finished, self.students[0], 'late')
        active = self.session(self.now - timedelta(minutes=30), self.now + timedelta(hours=1))
        self.record(active, self.students[0])
        self.session(self.now + timedelta(hours=2), self.now + timedelta(hours=3))
        self.session(self.now - timedelta(days=1, hours=1), self.now - timedelta(days=1))
        response = self.client.get(reverse('admin-dashboard'))
        s = response.data['summary']
        self.assertEqual((s['presentToday'], s['lateToday'], s['absentToday'], s['pendingToday']), (1, 1, 1, 1))
        self.assertEqual(s['activeSessions'], 1)
        self.assertEqual(s['sessionsToday'], 3)
        self.assertEqual(s['attendancePercentage'], 66.7)
        self.assertEqual(response.data['trends'][-2]['absent'], 2)
        self.assertEqual(response.data['courseStats'][0]['sessions'], 2)
        self.assertEqual(response.data['courseStats'][0]['attendanceRate'], 25)
        self.assertNotIn('qrToken', str(response.data))
        self.assertNotIn(finished.qr_token, str(response.data))

    def test_excused_excluded_and_closed_before_end_finalized(self):
        session = self.session(self.now - timedelta(hours=1), self.now + timedelta(hours=1), 'closed')
        self.record(session, self.students[0], 'excused')
        response = self.client.get(reverse('admin-dashboard'))
        self.assertEqual(response.data['summary']['excusedToday'], 1)
        self.assertEqual(response.data['summary']['absentToday'], 1)
        self.assertEqual(response.data['summary']['activeSessions'], 0)
        self.assertEqual(response.data['summary']['attendancePercentage'], 0)

    def test_local_boundaries_and_invalid_ranges(self):
        session = self.session(self.now.replace(hour=1), self.now.replace(hour=2))
        self.record(session, self.students[0])
        params = dict(dayStart='2026-09-13T07:00:00Z', dayEnd='2026-09-14T07:00:00Z')
        response = self.client.get(reverse('admin-dashboard'), params)
        self.assertEqual(response.data['summary']['sessionsToday'], 0)
        self.assertEqual(response.data['trends'][-2]['present'], 1)
        for params in [dict(dayStart='bad', dayEnd='bad'), dict(dayStart='2026-09-13T00:00:00Z'),
                       dict(dayStart='2026-09-13T00:00:00Z', dayEnd='2026-09-15T00:00:00Z')]:
            self.assertEqual(self.client.get(reverse('admin-dashboard'), params).status_code, 400)

    def test_other_roles_and_anonymous_cannot_access(self):
        for user in (self.lecturer, self.students[0].user):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get(reverse('admin-dashboard')).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse('admin-dashboard')).status_code, 401)

    def test_cross_midnight_live_sessions_and_late_enrollments(self):
        self.session(self.now - timedelta(days=1), self.now + timedelta(hours=1))
        finished = self.session(self.now - timedelta(hours=2), self.now - timedelta(hours=1))
        Enrollment.objects.filter(student=self.students[1]).update(enrolled_at=self.now)
        self.record(finished, self.students[0])
        response = self.client.get(reverse('admin-dashboard'))
        self.assertEqual(response.data['summary']['activeSessions'], 1)
        self.assertEqual(response.data['summary']['absentToday'], 0)
        self.assertEqual(response.data['summary']['attendancePercentage'], 100)

    def test_session_rosters_do_not_cause_per_session_queries(self):
        for i in range(20):
            self.session(self.now - timedelta(minutes=i + 1), self.now + timedelta(hours=1))
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(reverse('admin-dashboard'))
        self.assertEqual(response.data['summary']['sessionsToday'], 20)
        self.assertLess(len(queries), 20)
