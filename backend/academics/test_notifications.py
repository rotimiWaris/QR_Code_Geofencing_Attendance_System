from datetime import timedelta
from unittest.mock import patch
from django.core import mail
from django.db import transaction
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from accounts.models import User, StudentProfile
from .models import Course, ClassGroup, Venue, Enrollment, AttendanceSession


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', PUBLIC_FRONTEND_URL='https://attendance.example.edu', ATTENDANCE_EMAIL_TIME_ZONE='Africa/Lagos')
class SessionEmailTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.lecturer = User.objects.create_user(email='email.lecturer@test.edu', first_name='Lee', last_name='Teacher', role='lecturer')
        cls.course = Course.objects.create(code='EML111', name='Email course', level='ND1', lecturer=cls.lecturer)
        cls.venue = Venue.objects.create(name='Email room', latitude=7, longitude=3)
        cls.group = ClassGroup.objects.create(course=cls.course, venue=cls.venue, name='Email class')
        other_group = ClassGroup.objects.create(course=cls.course, name='Other class')
        cls.students = []
        for i in range(6):
            user = User.objects.create_user(email=f'email.student{i}@test.edu', first_name='Student', last_name=str(i), role='student', is_active=i != 4)
            student = StudentProfile.objects.create(user=user, student_number=f'EML{i}', department='Computing', level='ND1')
            cls.students.append(student)
            Enrollment.objects.create(student=student, class_group=other_group if i == 5 else cls.group, status='dropped' if i == 2 else 'completed' if i == 3 else 'active')

    def setUp(self):
        self.client.force_authenticate(self.lecturer)

    def payload(self):
        start = timezone.now() + timedelta(minutes=10)
        return {'classGroupId': str(self.group.pk), 'venueId': str(self.venue.pk), 'startTime': start.isoformat(),
            'endTime': (start + timedelta(hours=1)).isoformat(), 'qrType': 'static', 'radius': 75}

    def create_session(self):
        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            response = self.client.post(reverse('attendance-session-list'), self.payload(), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(len(callbacks), 1)
        return response

    def test_only_active_enrolled_students_receive_private_detailed_email(self):
        response = self.create_session()
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual({m.to[0] for m in mail.outbox}, {s.user.email for s in self.students[:2]})
        for message in mail.outbox:
            self.assertEqual(len(message.to), 1)
            self.assertEqual(message.cc, [])
            self.assertEqual(message.bcc, [])
            for detail in ['EML111', 'Email course', 'Email class', 'Email room', 'Lee Teacher', 'Starts:', 'Ends:', 'https://attendance.example.edu/student/dashboard', 'QR verification']:
                self.assertIn(detail, message.body)
            self.assertNotIn(response.data['qrToken'], message.body)
            self.assertNotIn('?token=', message.body)
            self.assertEqual(message.alternatives[0][1], 'text/html')
        mail.outbox.clear()
        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            updated = self.client.patch(reverse('attendance-session-detail', args=[response.data['id']]), {'radius': 80}, format='json')
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(callbacks, [])
        self.assertEqual(mail.outbox, [])

    def test_invalid_or_unauthorized_session_does_not_send(self):
        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            response = self.client.post(reverse('attendance-session-list'), {}, format='json')
            self.client.force_authenticate(self.students[0].user)
            unauthorized = self.client.post(reverse('attendance-session-list'), self.payload(), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(unauthorized.status_code, 403)
        self.assertEqual(callbacks, [])
        self.assertEqual(len(mail.outbox), 0)

    def test_connection_failure_does_not_fail_saved_session(self):
        with patch('academics.notifications.get_connection', side_effect=OSError('SMTP unavailable')), self.assertLogs('academics.notifications', level='ERROR'):
            response = self.create_session()
        self.assertTrue(AttendanceSession.objects.filter(pk=response.data['id']).exists())

    def test_one_failed_recipient_does_not_stop_other_attempts(self):
        with patch('academics.notifications.EmailMultiAlternatives.send', side_effect=[OSError('Send failed'), 1]) as send, self.assertLogs('academics.notifications', level='ERROR'):
            self.create_session()
        self.assertEqual(send.call_count, 2)

    def test_rolled_back_session_does_not_send(self):
        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            try:
                with transaction.atomic():
                    response = self.client.post(reverse('attendance-session-list'), self.payload(), format='json')
                    self.assertEqual(response.status_code, 201)
                    raise RuntimeError('Rollback')
            except RuntimeError:
                pass
        self.assertEqual(callbacks, [])
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(AttendanceSession.objects.count(), 0)

    def test_no_active_enrollments_means_no_email_connection(self):
        Enrollment.objects.filter(class_group=self.group).update(status='dropped')
        with patch('academics.notifications.get_connection') as connect:
            self.create_session()
        connect.assert_not_called()

    def test_student_feed_includes_future_sessions_without_qr_credentials(self):
        response = self.create_session()
        self.client.force_authenticate(self.students[0].user)
        feed = self.client.get(reverse('student-session-activity'))
        self.assertEqual(feed.status_code, 200)
        self.assertEqual(len(feed.data), 1)
        self.assertEqual(str(feed.data[0]['id']), str(response.data['id']))
        self.assertEqual(feed.data[0]['status'], 'scheduled')
        self.assertNotIn('qrToken', feed.data[0])
        for student in (self.students[2], self.students[5]):
            self.client.force_authenticate(student.user)
            self.assertEqual(self.client.get(reverse('student-session-activity')).data, [])
        self.client.force_authenticate(self.lecturer)
        self.assertEqual(self.client.get(reverse('student-session-activity')).status_code, 403)
