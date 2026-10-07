from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import LecturerProfile, RegistrationToken, StudentProfile, User

class AuthenticationTests(APITestCase):
    def setUp(self):
        self.password = "SafeSchoolPass!482"
        self.user = User.objects.create_user(email="student@example.edu", password=self.password, first_name="Ada", last_name="Okafor", role=User.Role.STUDENT)

    def login(self, **overrides):
        payload = {"email":self.user.email,"password":self.password,"role":"student"}|overrides
        return self.client.post(reverse("login"), payload, format="json")

    def test_login_returns_tokens_and_user(self):
        response = self.login()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["role"], "student")

    def test_login_rejects_wrong_selected_role(self):
        self.assertEqual(self.login(role="lecturer").status_code, status.HTTP_400_BAD_REQUEST)

    def test_current_user_requires_authentication(self):
        self.assertEqual(self.client.get(reverse("current-user")).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_current_user_with_jwt(self):
        token = self.login().data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(self.client.get(reverse("current-user")).data["email"], self.user.email)

    def test_inactive_user_cannot_login(self):
        self.user.is_active = False
        self.user.save(update_fields=("is_active",))
        self.assertEqual(self.login().status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_rotates_tokens_and_rejects_reuse(self):
        login = self.login().data
        response = self.client.post(reverse("token-refresh"), {"refresh":login["refresh"]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertNotEqual(login["refresh"], response.data["refresh"])
        self.assertEqual(self.client.post(reverse("token-refresh"), {"refresh":login["refresh"]}, format="json").status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        self.assertEqual(self.client.get(reverse("current-user")).status_code, status.HTTP_200_OK)

class RegistrationTokenTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email="admin@example.edu", password="AdminPass!482", first_name="System", last_name="Admin", role=User.Role.ADMIN)
        self.student_payload = {"role":"student","email":"new.student@example.edu","password":"NewStudentPass!482","firstName":"Nia","lastName":"Cole","identificationNumber":"STU00921","department":"Computer Science","level":"ND1"}

    def authenticate_admin(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.admin).access_token}")

    def test_only_admin_can_generate_token(self):
        response = self.client.post(reverse("registration-tokens"), {"role":"student"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.authenticate_admin()
        response = self.client.post(reverse("registration-tokens"), {"role":"student"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertRegex(response.data["code"], r"^stu\d{8}$")

    def test_lecturer_token_has_required_prefix(self):
        self.authenticate_admin()
        response = self.client.post(reverse("registration-tokens"), {"role":"lecturer"}, format="json")
        self.assertRegex(response.data["code"], r"^lec\d{8}$")

    def test_signup_consumes_token_once(self):
        token = RegistrationToken.issue("student", self.admin)
        payload = self.student_payload | {"token":token.code}
        self.client.credentials()
        response = self.client.post(reverse("signup"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(StudentProfile.objects.filter(student_number="STU00921").exists())
        token.refresh_from_db()
        self.assertTrue(token.is_used)
        payload["email"] = "another@example.edu"
        payload["identificationNumber"] = "STU00922"
        self.assertEqual(self.client.post(reverse("signup"), payload, format="json").status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_cannot_register_wrong_role(self):
        token = RegistrationToken.issue("student", self.admin)
        payload = self.student_payload | {"token":token.code,"role":"lecturer"}
        self.assertEqual(self.client.post(reverse("signup"), payload, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        token.refresh_from_db()
        self.assertFalse(token.is_used)


class LecturerDirectoryTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="directory.admin@example.edu", password="AdminPass!482",
            first_name="System", last_name="Admin", role=User.Role.ADMIN,
        )
        self.lecturer = User.objects.create_user(
            email="listed.lecturer@example.edu", password="LecturerPass!482",
            first_name="Ife", last_name="Adebayo", role=User.Role.LECTURER,
        )
        LecturerProfile.objects.create(
            user=self.lecturer, staff_number="LEC001", title="Dr.",
            department="Computer Science",
        )
        self.student = User.objects.create_user(
            email="hidden.student@example.edu", password="StudentPass!482",
            first_name="Hidden", last_name="Student", role=User.Role.STUDENT,
        )

    def authenticate(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")

    def test_admin_can_list_lecturers_only(self):
        self.authenticate(self.admin)
        response = self.client.get(reverse("lecturer-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.lecturer.id))
        self.assertEqual(response.data["results"][0]["lecturerProfile"]["staffId"], "LEC001")

    def test_non_admin_cannot_list_lecturers(self):
        self.authenticate(self.student)
        self.assertEqual(self.client.get(reverse("lecturer-list")).status_code, status.HTTP_403_FORBIDDEN)
