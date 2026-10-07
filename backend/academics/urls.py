from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import AvailableAttendanceSessionsView, StudentDashboardView
from .views import StudentSessionActivityView
from .dashboard import AdminDashboardView, LecturerDashboardView
from .views import AttendanceCheckInView, AttendanceSessionViewSet, ClassGroupViewSet, CourseViewSet, EnrollmentViewSet, MyAttendanceHistoryView, ResolveAttendanceSessionView, VenueViewSet

router = DefaultRouter()
router.register("courses", CourseViewSet, basename="course")
router.register("class-groups", ClassGroupViewSet, basename="class-group")
router.register("enrollments", EnrollmentViewSet, basename="enrollment")
router.register("venues", VenueViewSet, basename="venue")
router.register("attendance/sessions", AttendanceSessionViewSet, basename="attendance-session")
urlpatterns = [
    path("dashboard/admin/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("dashboard/lecturer/", LecturerDashboardView.as_view(), name="lecturer-dashboard"),
    path("dashboard/student/", StudentDashboardView.as_view(), name="student-dashboard"),
    path("attendance/available/", AvailableAttendanceSessionsView.as_view(), name="available-attendance-sessions"),
    path('attendance/activity/', StudentSessionActivityView.as_view(), name='student-session-activity'),
    path("attendance/resolve/", ResolveAttendanceSessionView.as_view(), name="attendance-resolve"),
    path("attendance/check-in/", AttendanceCheckInView.as_view(), name="attendance-check-in"),
    path("attendance/my-history/", MyAttendanceHistoryView.as_view(), name="my-attendance-history"),
] + router.urls
