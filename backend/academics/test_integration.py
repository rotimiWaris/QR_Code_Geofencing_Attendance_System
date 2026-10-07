from datetime import timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from accounts.models import User, StudentProfile
from .models import Course, ClassGroup, Venue, Enrollment, AttendanceSession


class AcademicManagementIntegrationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(email='integration.admin@test.edu', first_name='Ada', last_name='Admin', role='admin')
        cls.lecturer = User.objects.create_user(email='integration.lecturer@test.edu', first_name='Lee', last_name='Tutor', role='lecturer')
        cls.student = User.objects.create_user(email='integration.student@test.edu', first_name='Nia', last_name='Student', role='student')
        cls.profile = StudentProfile.objects.create(user=cls.student, student_number='INT001', department='Computing', level='ND1')

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def create_registry(self):
        venue = self.client.post(reverse('venue-list'), {'name': 'Integration room', 'radius': 75, 'capacity': 30, 'isActive': True, 'latitude': None, 'longitude': None}, format='json')
        self.assertEqual(venue.status_code, 201, venue.data)
        course = self.client.post(reverse('course-list'), {'code': 'INT111', 'name': 'Integration course', 'level': 'ND1', 'creditHours': 3, 'lecturerId': str(self.lecturer.pk), 'isActive': True}, format='json')
        self.assertEqual(course.status_code, 201, course.data)
        group = self.client.post(reverse('class-group-list'), {'name': 'Integration class', 'courseId': course.data['id'], 'venueId': venue.data['id'], 'academicYear': '2026/2027', 'semester': 'First', 'isActive': True, 'capacity': 30}, format='json')
        self.assertEqual(group.status_code, 201, group.data)
        return venue.data, course.data, group.data

    def test_registry_workflow_enrollment_drop_reactivate_and_dashboard(self):
        venue, course, group = self.create_registry()
        response = self.client.post(reverse('enrollment-list'), {'studentId': str(self.student.pk), 'classGroupId': group['id']}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        url = reverse('enrollment-detail', args=[response.data['id']])
        self.assertEqual(self.client.post(reverse('enrollment-list'), {'studentId': 'INT001', 'classGroupId': group['id']}, format='json').status_code, 400)
        self.assertEqual(self.client.patch(url, {'status': 'dropped'}).status_code, 200)
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get(reverse('course-list')).data['count'], 0)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.patch(url, {'status': 'active'}).status_code, 200)
        self.client.force_authenticate(self.lecturer)
        now = timezone.now()
        session = AttendanceSession.objects.create(class_group_id=group['id'], venue_id=venue['id'], lecturer=self.lecturer, start_time=now - timedelta(minutes=1), end_time=now + timedelta(hours=1))
        response = self.client.get(reverse('lecturer-dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['courses']), 1)
        self.assertEqual(str(response.data['todaySessions'][0]['id']), str(session.pk))
        self.assertEqual(response.data['todaySessions'][0]['totalEnrolled'], 1)
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get(reverse('lecturer-dashboard')).status_code, 403)
        self.assertEqual(self.client.get(reverse('student-dashboard')).status_code, 200)
        self.assertEqual(self.client.get(reverse('course-list')).data['count'], 1)

    def test_history_safe_deletes_foreign_keys_and_coordinate_validation(self):
        venue, course, group = self.create_registry()
        now = timezone.now()
        AttendanceSession.objects.create(class_group_id=group['id'], venue_id=venue['id'], lecturer=self.lecturer, start_time=now, end_time=now + timedelta(hours=1))
        for name, id in [('course-detail', course['id']), ('class-group-detail', group['id']), ('venue-detail', venue['id'])]:
            self.assertEqual(self.client.delete(reverse(name, args=[id])).status_code, 409)
        venue_url = reverse('venue-detail', args=[venue['id']])
        self.assertEqual(self.client.patch(venue_url, {'latitude': 95, 'longitude': 3}, format='json').status_code, 400)
        self.assertEqual(self.client.patch(venue_url, {'latitude': 7}, format='json').status_code, 400)
        self.assertEqual(self.client.patch(venue_url, {'latitude': 7, 'longitude': 3}, format='json').status_code, 200)
        self.assertEqual(self.client.patch(venue_url, {'radius': 501}).status_code, 400)
        import uuid
        self.assertEqual(self.client.patch(reverse('class-group-detail', args=[group['id']]), {'courseId': str(uuid.uuid4())}).status_code, 400)
        self.assertEqual(self.client.post(reverse('enrollment-list'), {'studentId': 'nonsense', 'classGroupId': group['id']}, format='json').status_code, 400)

    def test_all_academic_writes_are_admin_only(self):
        for user in (self.student, self.lecturer):
            self.client.force_authenticate(user)
            for name in ('course-list', 'venue-list', 'class-group-list', 'enrollment-list'):
                self.assertEqual(self.client.post(reverse(name), {}, format='json').status_code, 403)

    def test_unassigned_lecturer_dashboard_is_empty_and_dates_validate(self):
        self.client.force_authenticate(self.lecturer)
        response = self.client.get(reverse('lecturer-dashboard'))
        self.assertEqual(response.data['courses'], [])
        self.assertEqual(response.data['todaySessions'], [])
        self.assertEqual(self.client.get(reverse('lecturer-dashboard'), {'dayStart': 'bad'}).status_code, 400)
