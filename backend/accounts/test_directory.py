from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, StudentProfile, LecturerProfile


class DirectoryIntegrationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(email='manage.admin@test.edu', first_name='Ada', last_name='Admin', role='admin')
        cls.student = User.objects.create_user(email='manage.student@test.edu', first_name='Nia', last_name='Student', role='student')
        cls.lecturer = User.objects.create_user(email='manage.lecturer@test.edu', first_name='Lee', last_name='Lecturer', role='lecturer')
        StudentProfile.objects.create(user=cls.student, student_number='MAN001', department='Computing', level='ND1')
        LecturerProfile.objects.create(user=cls.lecturer, staff_number='LEC001', title='Dr', department='Computing')

    def setUp(self):
        cache.clear()
        self.client.force_authenticate(self.admin)

    def test_directories_search_profiles_and_filter_roles(self):
        for name, role in [('student-list', 'student'), ('lecturer-list', 'lecturer')]:
            response = self.client.get(reverse(name))
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['count'], 1)
            self.assertEqual(response.data['results'][0]['role'], role)
        response = self.client.get(reverse('user-list'), {'search': 'MAN001'})
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['studentProfile']['level'], 'ND1')
        self.assertEqual(self.client.get(reverse('user-list'), {'role': 'fake'}).status_code, 400)

    def test_edit_account_and_nested_profile_without_privilege_escalation(self):
        response = self.client.patch(reverse('user-detail', args=[self.student.pk]), {
            'firstName': 'Updated', 'email': 'UPDATED@test.edu', 'role': 'admin', 'is_staff': True,
            'studentProfile': {'studentId': 'MAN001', 'department': 'Computer Science', 'level': 'ND2'},
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.student.refresh_from_db()
        self.assertEqual(self.student.role, 'student')
        self.assertFalse(self.student.is_staff)
        self.assertEqual(self.student.email, 'updated@test.edu')
        self.assertEqual(self.student.student_profile.level, 'ND2')

    def test_self_deactivation_invalid_profile_and_duplicates_rejected(self):
        self.assertEqual(self.client.patch(reverse('user-detail', args=[self.admin.pk]), {'isActive': False}).status_code, 400)
        self.assertEqual(self.client.patch(reverse('user-detail', args=[self.student.pk]), {'lecturerProfile': {'staffId': 'BAD'}}, format='json').status_code, 400)
        self.assertEqual(self.client.patch(reverse('user-detail', args=[self.student.pk]), {'email': self.admin.email}).status_code, 400)

    def test_deactivation_preserves_profile_and_revokes_refresh(self):
        token = RefreshToken.for_user(self.student)
        response = self.client.patch(reverse('user-detail', args=[self.student.pk]), {'isActive': False})
        self.assertEqual(response.status_code, 200)
        self.student.refresh_from_db()
        self.assertFalse(self.student.is_active)
        self.assertTrue(StudentProfile.objects.filter(user=self.student).exists())
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(reverse('token-refresh'), {'refresh': str(token)}).status_code, 401)

    def test_admin_reset_password_validates_and_revokes_refresh(self):
        url = reverse('user-reset-password', args=[self.student.pk])
        self.assertEqual(self.client.post(url, {'newPassword': '123'}).status_code, 400)
        token = RefreshToken.for_user(self.student)
        self.assertEqual(self.client.post(url, {'newPassword': 'Updated!Pass345'}).status_code, 200)
        self.student.refresh_from_db()
        self.assertTrue(self.student.check_password('Updated!Pass345'))
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(reverse('token-refresh'), {'refresh': str(token)}).status_code, 401)

    def test_nonadmins_cannot_manage_or_list_users(self):
        for user in (self.student, self.lecturer):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get(reverse('user-list')).status_code, 403)
            self.assertEqual(self.client.get(reverse('student-list')).status_code, 403)
            self.assertEqual(self.client.patch(reverse('user-detail', args=[self.admin.pk]), {'firstName': 'Hacked'}).status_code, 403)
            self.assertEqual(self.client.post(reverse('user-reset-password', args=[self.admin.pk]), {'newPassword': 'Hacked!Pass123'}).status_code, 403)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_password_recovery_email_single_use_and_invalid_link(self):
        self.client.force_authenticate(None)
        response = self.client.post(reverse('password-reset-request'), {'email': self.student.email})
        unknown = self.client.post(reverse('password-reset-request'), {'email': 'unknown@test.edu'})
        self.assertEqual(response.data, unknown.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('/reset-password?uid=', mail.outbox[0].body)
        data = {'uid': urlsafe_base64_encode(force_bytes(self.student.pk)), 'token': default_token_generator.make_token(self.student), 'newPassword': 'Recovery!Pass123'}
        self.assertEqual(self.client.post(reverse('password-reset-confirm'), {**data, 'newPassword': '123'}).status_code, 400)
        self.assertEqual(self.client.post(reverse('password-reset-confirm'), data).status_code, 200)
        self.assertEqual(self.client.post(reverse('password-reset-confirm'), data).status_code, 400)
        cache.clear()
        self.assertEqual(self.client.post(reverse('password-reset-confirm'), {**data, 'uid': 'bad'}).status_code, 400)
