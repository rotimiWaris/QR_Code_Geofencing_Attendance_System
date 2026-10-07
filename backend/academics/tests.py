from django.db import IntegrityError, transaction
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import StudentProfile, User
from .models import AttendanceRecord, AttendanceSession, ClassGroup, Course, Enrollment, Venue

class AcademicApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email="admin2@example.edu", password="Pass!12345", first_name="Ada", last_name="Admin", role="admin")
        self.student_user = User.objects.create_user(email="nd1@example.edu", password="Pass!12345", first_name="Nia", last_name="Student", role="student")
        self.student = StudentProfile.objects.create(user=self.student_user, student_number="ND1001", department="Computer Science", level="ND1")
        self.venue = Venue.objects.create(name="Room Test")
        self.course = Course.objects.create(code="COM111", name="Introduction to Computing", level="ND1")
        self.group = ClassGroup.objects.create(course=self.course, name="ND1 Class", venue=self.venue)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.admin).access_token}")

    def test_admin_can_create_enrollment(self):
        response = self.client.post(reverse("enrollment-list"), {"studentId":"ND1001","classGroupId":str(self.group.id)}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_duplicate_enrollment_is_prevented(self):
        Enrollment.objects.create(student=self.student, class_group=self.group)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Enrollment.objects.create(student=self.student, class_group=self.group)

    def test_level_mismatch_is_rejected(self):
        course = Course.objects.create(code="SWD411", name="Project", level="HND2")
        group = ClassGroup.objects.create(course=course, name="HND2 Class")
        response = self.client.post(reverse("enrollment-list"), {"studentId":"ND1001","classGroupId":str(group.id)}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_only_sees_enrolled_courses(self):
        Enrollment.objects.create(student=self.student, class_group=self.group)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.student_user).access_token}")
        response = self.client.get(reverse("course-list"))
        self.assertEqual(response.data["count"], 1)

    def test_admin_can_only_assign_a_lecturer_to_course(self):
        lecturer = User.objects.create_user(email="lecturer@example.edu", password="Pass!12345", first_name="Lee", last_name="Tutor", role="lecturer")
        accepted = self.client.patch(reverse("course-detail", args=(self.course.id,)), {"lecturerId":str(lecturer.id)}, format="json")
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        rejected = self.client.patch(reverse("course-detail", args=(self.course.id,)), {"lecturerId":str(self.student_user.id)}, format="json")
        self.assertEqual(rejected.status_code, status.HTTP_400_BAD_REQUEST)


class AttendanceSessionApiTests(APITestCase):
    def setUp(self):
        self.lecturer = User.objects.create_user(
            email="session.lecturer@example.edu", password="Pass!12345",
            first_name="Tola", last_name="Teacher", role=User.Role.LECTURER,
        )
        self.other_lecturer = User.objects.create_user(
            email="other.lecturer@example.edu", password="Pass!12345",
            first_name="Other", last_name="Teacher", role=User.Role.LECTURER,
        )
        self.venue = Venue.objects.create(name="Session Room", default_radius=80, latitude=6.524379, longitude=3.379206)
        self.course = Course.objects.create(code="TST101", name="Session Testing", level="ND1", lecturer=self.lecturer)
        self.group = ClassGroup.objects.create(course=self.course, name="ND1 Session Class", venue=self.venue)
        self.student_user = User.objects.create_user(
            email="checkin.student@example.edu", password="Pass!12345",
            first_name="Check", last_name="Student", role=User.Role.STUDENT,
        )
        self.student = StudentProfile.objects.create(
            user=self.student_user, student_number="CHK001", department="Computer Science", level="ND1",
        )
        Enrollment.objects.create(class_group=self.group, student=self.student)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.lecturer).access_token}")

    def payload(self):
        start = timezone.now() + timedelta(minutes=10)
        return {
            "classGroupId":str(self.group.id), "venueId":str(self.venue.id),
            "radius":80, "qrType":"static", "startTime":start.isoformat(),
            "endTime":(start + timedelta(minutes=90)).isoformat(),
        }

    def test_lecturer_can_create_session_for_assigned_course(self):
        response = self.client.post(reverse("attendance-session-list"), self.payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["courseCode"], "TST101")
        self.assertTrue(response.data["qrToken"])
        self.assertEqual(response.data["status"], "scheduled")

    def test_lecturer_cannot_create_session_for_anothers_course(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.other_lecturer).access_token}")
        response = self.client.post(reverse("attendance-session-list"), self.payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lecturer_only_lists_own_sessions_and_can_close_one(self):
        start = timezone.now() - timedelta(minutes=5)
        session = AttendanceSession.objects.create(
            class_group=self.group, lecturer=self.lecturer, venue=self.venue,
            start_time=start, end_time=start + timedelta(minutes=90),
        )
        response = self.client.get(reverse("attendance-session-list"))
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["status"], "active")
        closed = self.client.post(reverse("attendance-session-close", args=(session.id,)), {}, format="json")
        self.assertEqual(closed.status_code, status.HTTP_200_OK)
        self.assertEqual(closed.data["status"], "closed")

    def active_session(self, **overrides):
        start = timezone.now() - timedelta(minutes=5)
        values = {
            "class_group":self.group, "lecturer":self.lecturer, "venue":self.venue,
            "latitude":self.venue.latitude, "longitude":self.venue.longitude,
            "radius":80, "start_time":start, "end_time":start + timedelta(minutes=90),
        }
        values.update(overrides)
        return AttendanceSession.objects.create(**values)

    def authenticate_student(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.student_user).access_token}")

    def test_student_can_resolve_and_check_in_within_geofence_once(self):
        session = self.active_session()
        self.authenticate_student()
        resolved = self.client.post(reverse("attendance-resolve"), {"qrToken":session.current_qr_token()}, format="json")
        self.assertEqual(resolved.status_code, status.HTTP_200_OK)
        payload = {
            "qrToken":session.current_qr_token(), "latitude":6.524379,
            "longitude":3.379206, "accuracy":12, "timestamp":timezone.now().isoformat(),
        }
        accepted = self.client.post(reverse("attendance-check-in"), payload, format="json")
        self.assertEqual(accepted.status_code, status.HTTP_201_CREATED)
        self.assertEqual(accepted.data["record"]["studentIdNumber"], "CHK001")
        duplicate = self.client.post(reverse("attendance-check-in"), payload, format="json")
        self.assertEqual(duplicate.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(duplicate.data["code"], "already_marked")

    def test_student_outside_geofence_is_rejected(self):
        session = self.active_session()
        self.authenticate_student()
        response = self.client.post(reverse("attendance-check-in"), {
            "qrToken":session.current_qr_token(), "latitude":6.534379,
            "longitude":3.389206, "accuracy":10,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "outside_area")

    def test_low_accuracy_and_tampered_rotating_qr_are_rejected(self):
        session = self.active_session(qr_type=AttendanceSession.QRType.ROTATING, qr_refresh_interval=60)
        self.authenticate_student()
        token = session.current_qr_token()
        bad_qr = self.client.post(reverse("attendance-resolve"), {"qrToken":token + "x"}, format="json")
        self.assertEqual(bad_qr.status_code, status.HTTP_400_BAD_REQUEST)
        low_accuracy = self.client.post(reverse("attendance-check-in"), {
            "qrToken":token, "latitude":6.524379, "longitude":3.379206, "accuracy":200,
        }, format="json")
        self.assertEqual(low_accuracy.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(low_accuracy.data["code"], "gps_low")
        self.assertIn("200.0 metres", low_accuracy.data["message"])
        self.assertIn("150 metres", low_accuracy.data["message"])

    def test_session_visibility_requires_qr_for_check_in(self):
        session = self.active_session()
        self.active_session(status=AttendanceSession.Status.CLOSED)
        other_course = Course.objects.create(code="OTHER101", name="Other course", level="ND1")
        other_group = ClassGroup.objects.create(course=other_course, name="Other class")
        hidden = self.active_session(class_group=other_group)
        self.authenticate_student()
        available = self.client.get(reverse("available-attendance-sessions"))
        self.assertEqual(len(available.data), 1)
        self.assertEqual(available.data[0]["id"], str(session.id))
        self.assertNotIn("qrToken", available.data[0])
        resolved = self.client.post(reverse("attendance-resolve"), {"sessionId":str(session.id)}, format="json")
        self.assertEqual(resolved.status_code, status.HTTP_400_BAD_REQUEST)
        denied = self.client.post(reverse("attendance-resolve"), {"qrToken":hidden.current_qr_token()}, format="json")
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)
        payload = {"sessionId":str(session.id), "latitude":6.524379, "longitude":3.379206, "accuracy":10}
        self.assertEqual(self.client.post(reverse("attendance-check-in"), payload, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        payload["qrToken"] = hidden.current_qr_token()
        self.assertEqual(self.client.post(reverse("attendance-check-in"), payload, format="json").data["code"], "invalid_qr")
        payload["qrToken"] = session.current_qr_token()
        self.assertEqual(self.client.post(reverse("attendance-check-in"), payload, format="json").status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.client.post(reverse("attendance-check-in"), payload, format="json").data["code"], "already_marked")
        self.assertTrue(self.client.get(reverse("available-attendance-sessions")).data[0]["alreadyMarked"])

    def test_qr_check_in_still_validates_location_and_status(self):
        session = self.active_session()
        self.authenticate_student()
        payload = {"sessionId":str(session.id), "latitude":6.534379, "longitude":3.389206, "accuracy":10}
        payload["qrToken"] = session.current_qr_token()
        self.assertEqual(self.client.post(reverse("attendance-check-in"), payload, format="json").data["code"], "outside_area")
        session.status = AttendanceSession.Status.CLOSED
        session.save()
        self.assertEqual(self.client.post(reverse("attendance-check-in"), payload, format="json").data["code"], "expired")

    def test_student_dashboard_uses_real_outcomes_and_todays_sessions(self):
        now = timezone.now()
        Enrollment.objects.filter(student=self.student).update(enrolled_at=now - timedelta(days=2))
        attended = self.active_session()
        self.active_session(status=AttendanceSession.Status.CLOSED)
        self.active_session()  # An open, unmarked session must not count as absent.
        self.active_session(start_time=now + timedelta(minutes=10), end_time=now + timedelta(minutes=60))
        self.active_session(start_time=now - timedelta(days=4), end_time=now - timedelta(days=3))  # Before enrollment.
        self.authenticate_student()
        self.client.post(reverse("attendance-check-in"), {
            "qrToken":attended.current_qr_token(), "latitude":6.524379, "longitude":3.379206, "accuracy":10,
        }, format="json")
        response = self.client.get(reverse("student-dashboard"), {
            "dayStart":(now - timedelta(hours=1)).isoformat(), "dayEnd":(now + timedelta(hours=2)).isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["presence"], {"present":1, "late":0, "absent":1, "total":2, "rate":50})
        self.assertEqual(len(response.data["todaySessions"]), 4)
        marked = next(item for item in response.data["todaySessions"] if item["id"] == str(attended.id))
        self.assertTrue(marked["alreadyMarked"])
        self.assertNotIn("qrToken", marked)
        AttendanceRecord.objects.filter(session=attended).update(status=AttendanceRecord.Status.LATE)
        self.assertEqual(self.client.get(reverse("student-dashboard")).data["presence"]["late"], 1)

    def test_student_dashboard_rejects_lecturer(self):
        self.assertEqual(self.client.get(reverse("student-dashboard")).status_code, status.HTTP_403_FORBIDDEN)

    def test_session_report_contains_roster_and_locks_exports(self):
        session = self.active_session()
        report_url = reverse("attendance-session-report", args=(session.id,))
        export_url = reverse("attendance-session-export-report", args=(session.id,))
        report = self.client.get(report_url)
        self.assertEqual(report.status_code, status.HTTP_200_OK)
        self.assertFalse(report.data["canExport"])
        self.assertEqual(report.data["students"][0]["email"], self.student_user.email)
        self.assertEqual(report.data["students"][0]["status"], "pending")
        self.assertEqual(self.client.get(export_url, {"fileType":"xlsx"}).status_code, status.HTTP_409_CONFLICT)
        session.status = AttendanceSession.Status.CLOSED
        session.save()
        report = self.client.get(report_url)
        self.assertTrue(report.data["canExport"])
        self.assertEqual(report.data["summary"]["absent"], 1)
        from io import BytesIO
        from openpyxl import load_workbook
        excel = self.client.get(export_url, {"fileType":"xlsx"})
        self.assertEqual(excel.status_code, status.HTTP_200_OK)
        workbook = load_workbook(BytesIO(excel.content))
        self.assertEqual(workbook.active["A8"].value, "CHK001")
        self.assertEqual(workbook.active["F8"].value, "Absent")
        pdf = self.client.get(export_url, {"fileType":"pdf"})
        self.assertEqual(pdf.status_code, status.HTTP_200_OK)
        self.assertTrue(pdf.content.startswith(b"%PDF"))
        self.assertEqual(self.client.get(export_url, {"fileType":"csv"}).status_code, status.HTTP_400_BAD_REQUEST)

    def test_other_lecturer_and_student_cannot_view_session_report(self):
        session = self.active_session()
        url = reverse("attendance-session-report", args=(session.id,))
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.other_lecturer).access_token}")
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
        self.authenticate_student()
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(reverse("attendance-session-export-report", args=(session.id,)), {"fileType":"pdf"}).status_code, status.HTTP_404_NOT_FOUND)

    def test_student_history_can_search_venue(self):
        session = self.active_session()
        self.authenticate_student()
        self.client.post(reverse("attendance-check-in"), {"qrToken":session.current_qr_token(), "latitude":6.524379, "longitude":3.379206, "accuracy":10}, format="json")
        url = reverse("my-attendance-history")
        self.assertEqual(self.client.get(url, {"search":"Session Room"}).data["count"], 1)
        self.assertEqual(self.client.get(url, {"search":"not-a-venue"}).data["count"], 0)
