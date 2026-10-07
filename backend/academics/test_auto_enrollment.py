from io import StringIO
from unittest.mock import patch
from django.core.management import call_command
from django.urls import reverse
from rest_framework.test import APITestCase
from accounts.models import User, StudentProfile, RegistrationToken
from .models import Course, ClassGroup, Enrollment
from .enrollment_service import enroll_student_for_level


class AutomaticEnrollmentTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(email='auto.admin@test.edu', first_name='Ada', last_name='Admin', role='admin')
        cls.groups = {}
        for level in ('ND1', 'ND2', 'HND1', 'HND2'):
            course = Course.objects.create(code=level + '101', name=level + ' course', level=level)
            cls.groups[level] = ClassGroup.objects.create(course=course, name=level + ' class')
        inactive = Course.objects.create(code='INA101', name='Inactive course', level='ND1', is_active=False)
        ClassGroup.objects.create(course=inactive, name='Inactive course class')
        ClassGroup.objects.create(course=cls.groups['ND1'].course, name='Inactive class', is_active=False)

    def student(self, suffix='1', active=True):
        user = User.objects.create_user(email=f'auto.student{suffix}@test.edu', first_name='New', last_name='Student', role='student', is_active=active)
        return StudentProfile.objects.create(user=user, student_number='AUTO' + suffix, department='Computing', level='ND1')

    def signup_payload(self, level):
        token = RegistrationToken.issue('student', self.admin)
        return {'token': token.code, 'role': 'student', 'email': level.lower() + '@auto.test.edu',
            'firstName': 'New', 'lastName': 'Student', 'password': 'School!NewPass982',
            'identificationNumber': 'AUTO' + level, 'department': 'Computing', 'level': level}, token

    def test_signup_assigns_only_active_matching_level_classes_for_each_level(self):
        for level in self.groups:
            with self.subTest(level=level):
                payload, token = self.signup_payload(level)
                response = self.client.post(reverse('signup'), payload, format='json')
                self.assertEqual(response.status_code, 201, response.data)
                student = StudentProfile.objects.get(student_number=payload['identificationNumber'])
                self.assertEqual(list(student.enrollments.values_list('class_group_id', flat=True)), [self.groups[level].pk])
                self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.data['access'])
                self.assertEqual(self.client.get(reverse('course-list')).data['count'], 1)
                self.client.credentials()

    def test_idempotent_backfill_preserves_dropped_completed_and_dates(self):
        student = self.student()
        first = Enrollment.objects.create(student=student, class_group=self.groups['ND1'], status='dropped')
        group = ClassGroup.objects.create(course=self.groups['ND1'].course, name='Completed class')
        second = Enrollment.objects.create(student=student, class_group=group, status='completed')
        missing = ClassGroup.objects.create(course=self.groups['ND1'].course, name='Missing class')
        original_dates = [first.enrolled_at, second.enrolled_at]
        self.assertEqual(enroll_student_for_level(student), 1)
        self.assertEqual(enroll_student_for_level(student), 0)
        first.refresh_from_db(); second.refresh_from_db()
        self.assertEqual([first.status, second.status], ['dropped', 'completed'])
        self.assertEqual([first.enrolled_at, second.enrolled_at], original_dates)
        self.assertEqual(student.enrollments.get(class_group=missing).status, 'active')

    def test_dry_run_does_not_write_and_command_is_repeatable(self):
        student = self.student()
        output = StringIO()
        call_command('backfill_enrollments', dry_run=True, stdout=output)
        self.assertIn('Would create 1', output.getvalue())
        self.assertEqual(Enrollment.objects.count(), 0)
        call_command('backfill_enrollments', stdout=StringIO())
        call_command('backfill_enrollments', stdout=StringIO())
        self.assertEqual(student.enrollments.count(), 1)

    def test_inactive_students_are_not_backfilled(self):
        student = self.student(active=False)
        self.assertEqual(enroll_student_for_level(student), 0)
        call_command('backfill_enrollments', stdout=StringIO())
        self.assertEqual(Enrollment.objects.count(), 0)

    def test_signup_with_no_matching_classes_still_succeeds(self):
        ClassGroup.objects.filter(course__level='ND2').update(is_active=False)
        payload, token = self.signup_payload('ND2')
        response = self.client.post(reverse('signup'), payload, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Enrollment.objects.count(), 0)

    def test_failed_enrollment_rolls_back_user_profile_and_signup_token(self):
        payload, token = self.signup_payload('ND1')
        with patch('academics.enrollment_service.enroll_student_for_level', side_effect=RuntimeError('Enrollment failed')):
            with self.assertRaises(RuntimeError):
                self.client.post(reverse('signup'), payload, format='json')
        self.assertFalse(User.objects.filter(email=payload['email']).exists())
        self.assertFalse(StudentProfile.objects.filter(student_number=payload['identificationNumber']).exists())
        token.refresh_from_db()
        self.assertFalse(token.is_used)

    def test_targeted_backfill_does_not_change_other_students(self):
        first = self.student('1'); second = self.student('2')
        call_command('backfill_enrollments', student_number=first.student_number, stdout=StringIO())
        self.assertEqual(first.enrollments.count(), 1)
        self.assertEqual(second.enrollments.count(), 0)
