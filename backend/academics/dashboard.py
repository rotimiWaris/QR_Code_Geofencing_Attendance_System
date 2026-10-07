"""Read-only institutional dashboard, with bounded queries and no QR secrets."""
from datetime import timedelta
from django.db.models import Prefetch
from django.utils import timezone
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.models import RegistrationToken, User
from .models import AttendanceSession, ClassGroup, Course, Enrollment, Venue
from .serializers import CourseSerializer, AttendanceSessionSerializer


class IsDashboardAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.ADMIN


class AdminDashboardView(APIView):
    permission_classes = [IsDashboardAdmin]

    def get(self, request):
        now = timezone.now()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        if 'dayStart' in request.query_params or 'dayEnd' in request.query_params:
            if not all(key in request.query_params for key in ('dayStart', 'dayEnd')):
                raise serializers.ValidationError('Supply both dayStart and dayEnd.')
            field = serializers.DateTimeField()
            start = field.run_validation(request.query_params['dayStart'])
            end = field.run_validation(request.query_params['dayEnd'])
            if not timedelta(hours=23) <= end - start <= timedelta(hours=25):
                raise serializers.ValidationError('Day boundaries must span one day.')
        first = start - timedelta(days=6)
        sessions = AttendanceSession.objects.filter(start_time__gte=first, start_time__lt=end).select_related(
            'class_group__course', 'lecturer', 'venue',
        ).prefetch_related('records', Prefetch('class_group__enrollments', queryset=Enrollment.objects.filter(status=Enrollment.Status.ACTIVE)))
        trends = [{ 'date': (first + timedelta(days=i)).isoformat(), 'present': 0, 'late': 0, 'absent': 0, 'excused': 0, 'pending': 0, 'total': 0 } for i in range(7)]
        courses = {}
        today_sessions = []
        for session in sessions:
            index = min(6, int((session.start_time - first).total_seconds() // 86400))
            records = {r.student_id: r.status for r in session.records.all()}
            roster = {e.student_id for e in session.class_group.enrollments.all() if e.enrolled_at <= session.end_time} | set(records)
            finished = session.start_time <= now and (session.status == AttendanceSession.Status.CLOSED or session.end_time <= now)
            counts = dict(present=0, late=0, absent=0, excused=0, pending=0, total=len(roster))
            for student_id in roster:
                counts[records.get(student_id, 'absent' if finished else 'pending')] += 1
            # Scheduled sessions are visible, but don't affect attendance totals yet.
            if session.start_time <= now:
                for key in counts:
                    trends[index][key] += counts[key]
            if finished:
                course = session.class_group.course
                entry = courses.setdefault(str(course.pk), dict(courseId=str(course.pk), courseCode=course.code, courseName=course.name, sessions=0, present=0, late=0, absent=0, excused=0, total=0))
                entry['sessions'] += 1
                for key in ('present', 'late', 'absent', 'excused', 'total'):
                    entry[key] += counts[key]
            if start <= session.start_time < end:
                today_sessions.append(dict(id=str(session.pk), courseCode=session.class_group.course.code,
                    classGroupName=session.class_group.name, lecturerName=session.lecturer.full_name,
                    venueName=session.venue.name, startTime=session.start_time.isoformat(), endTime=session.end_time.isoformat(),
                    status=session.effective_status, checkedInCount=counts['present'] + counts['late'], totalEnrolled=len(roster)))
        # Include ongoing sessions that began before today's boundary in the live count.
        live = AttendanceSession.objects.filter(start_time__lte=now, end_time__gt=now,
            status__in=(AttendanceSession.Status.ACTIVE, AttendanceSession.Status.SCHEDULED)).count()
        def rate(counts):
            denominator = counts['present'] + counts['late'] + counts['absent']
            return round(100 * (counts['present'] + counts['late']) / denominator, 1) if denominator else None
        for entry in courses.values():
            entry['attendanceRate'] = rate(entry)
        for entry in trends:
            entry['attendanceRate'] = rate(entry)
        today = trends[-1]
        return Response(dict(generatedAt=now.isoformat(), dayStart=start.isoformat(), dayEnd=end.isoformat(),
            summary=dict(totalStudents=User.objects.filter(role='student', is_active=True).count(),
                totalLecturers=User.objects.filter(role='lecturer', is_active=True).count(),
                totalCourses=Course.objects.filter(is_active=True).count(), totalClasses=ClassGroup.objects.filter(is_active=True).count(),
                totalVenues=Venue.objects.filter(is_active=True).count(), activeEnrollments=Enrollment.objects.filter(status='active').count(),
                unusedTokens=RegistrationToken.objects.filter(is_used=False).count(), usedTokens=RegistrationToken.objects.filter(is_used=True).count(),
                activeSessions=live, sessionsToday=len(today_sessions), presentToday=today['present'], lateToday=today['late'],
                absentToday=today['absent'], pendingToday=today['pending'], excusedToday=today['excused'], attendancePercentage=rate(today)),
            trends=trends, courseStats=sorted(courses.values(), key=lambda c: (c['attendanceRate'] is None, c['attendanceRate'] or 0, c['courseCode'])),
            todaySessions=sorted(today_sessions, key=lambda s: s['startTime'])))


class LecturerDashboardView(APIView):
    def get(self, request):
        if request.user.role != User.Role.LECTURER:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only lecturers can view this dashboard.')
        now = timezone.now()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        if 'dayStart' in request.query_params or 'dayEnd' in request.query_params:
            if not all(key in request.query_params for key in ('dayStart', 'dayEnd')):
                raise serializers.ValidationError('Supply both day boundaries.')
            field = serializers.DateTimeField()
            start = field.run_validation(request.query_params['dayStart'])
            end = field.run_validation(request.query_params['dayEnd'])
            if not timedelta(hours=23) <= end - start <= timedelta(hours=25):
                raise serializers.ValidationError('Day boundaries must span one day.')
        courses = Course.objects.filter(lecturer=request.user).select_related('lecturer')
        sessions = AttendanceSession.objects.filter(lecturer=request.user, start_time__gte=start, start_time__lt=end).select_related('class_group__course', 'lecturer', 'venue').prefetch_related('records', 'class_group__enrollments').order_by('start_time')
        return Response({'generatedAt': now.isoformat(), 'courses': CourseSerializer(courses, many=True).data,
            'todaySessions': AttendanceSessionSerializer(sessions, many=True, context={'request': request}).data})
