import math
from datetime import timedelta
from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import F, Q
from django.utils import timezone
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.models import StudentProfile, User
from .models import AttendanceRecord, AttendanceSession, ClassGroup, Course, Enrollment, Venue
from .permissions import IsAdminOrReadOnly
from .serializers import AttendanceCheckInSerializer, AttendanceSessionIdentifierSerializer, AttendanceRecordSerializer, AttendanceSessionPublicSerializer, AttendanceSessionSerializer, ClassGroupSerializer, CourseSerializer, EnrollmentSerializer, VenueSerializer


def find_session_for_token(token):
    queryset = AttendanceSession.objects.select_related("class_group__course", "lecturer", "venue")
    if token.startswith("rot."):
        parts = token.split(".")
        if len(parts) != 4:
            return None
        try:
            session = queryset.get(pk=parts[1], qr_type=AttendanceSession.QRType.ROTATING)
        except (AttendanceSession.DoesNotExist, ValueError, DjangoValidationError):
            return None
    else:
        try:
            session = queryset.get(qr_token=token, qr_type=AttendanceSession.QRType.STATIC)
        except AttendanceSession.DoesNotExist:
            return None
    return session if session.accepts_qr_token(token) else None


def distance_metres(latitude_a, longitude_a, latitude_b, longitude_b):
    radius = 6_371_000
    phi_a, phi_b = math.radians(latitude_a), math.radians(latitude_b)
    delta_phi = math.radians(latitude_b - latitude_a)
    delta_lambda = math.radians(longitude_b - longitude_a)
    value = math.sin(delta_phi / 2) ** 2 + math.cos(phi_a) * math.cos(phi_b) * math.sin(delta_lambda / 2) ** 2
    value = min(1, max(0, value))
    return radius * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def find_requested_session(data):
    session = find_session_for_token(data["qrToken"])
    if session and "sessionId" in data and session.id != data["sessionId"]:
        return None
    return session


class AvailableAttendanceSessionsView(APIView):
    def get(self, request):
        if request.user.role != User.Role.STUDENT:
            return attendance_error("student_required", "Only students can view available check-ins.", status.HTTP_403_FORBIDDEN)
        now = timezone.now()
        sessions = AttendanceSession.objects.filter(
            class_group__enrollments__student__user=request.user,
            class_group__enrollments__status=Enrollment.Status.ACTIVE,
            start_time__lte=now, end_time__gt=now,
            status__in=(AttendanceSession.Status.SCHEDULED, AttendanceSession.Status.ACTIVE),
        ).select_related("class_group__course", "lecturer", "venue").distinct().order_by("start_time")
        marked = set(AttendanceRecord.objects.filter(student__user=request.user).values_list("session_id", flat=True))
        result = []
        for session in sessions:
            item = dict(AttendanceSessionPublicSerializer(session).data)
            item["alreadyMarked"] = session.id in marked
            result.append(item)
        return Response(result)


class StudentSessionActivityView(APIView):
    def get(self, request):
        if request.user.role != User.Role.STUDENT:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only students can view this feed.')
        sessions = AttendanceSession.objects.filter(
            class_group__enrollments__student__user=request.user,
            class_group__enrollments__status=Enrollment.Status.ACTIVE,
            class_group__enrollments__enrolled_at__lte=F('end_time'),
        ).select_related('class_group__course', 'lecturer', 'venue').distinct().order_by('-created_at')[:20]
        return Response(AttendanceSessionPublicSerializer(sessions, many=True).data)


def attendance_error(code, message, response_status):
    return Response({"success":False, "code":code, "message":message}, status=response_status)

class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = (IsAdminOrReadOnly,)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("code", "name", "level", "lecturer__first_name", "lecturer__last_name")
    ordering_fields = ("code", "level", "name")

    def get_queryset(self):
        queryset = Course.objects.select_related("lecturer")
        user = self.request.user
        if user.role == User.Role.LECTURER:
            return queryset.filter(lecturer=user)
        if user.role == User.Role.STUDENT:
            return queryset.filter(class_groups__enrollments__student__user=user, class_groups__enrollments__status='active').distinct()
        return queryset

    def destroy(self, request, *args, **kwargs):
        if self.get_object().class_groups.filter(attendance_sessions__isnull=False).exists():
            return Response({'detail': 'This course has attendance history. Deactivate it instead.'}, status=409)
        return super().destroy(request, *args, **kwargs)

class VenueViewSet(viewsets.ModelViewSet):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer
    permission_classes = (IsAdminOrReadOnly,)
    filter_backends = (filters.SearchFilter,)
    search_fields = ("name", "building", "room_number")

    def destroy(self, request, *args, **kwargs):
        if self.get_object().attendance_sessions.exists():
            return Response({'detail': 'This venue has attendance history. Deactivate it instead.'}, status=409)
        return super().destroy(request, *args, **kwargs)

class ClassGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ClassGroupSerializer
    permission_classes = (IsAdminOrReadOnly,)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('name', 'course__code', 'course__name', 'venue__name')
    ordering_fields = ('name', 'course__code', 'academic_year')

    def get_queryset(self):
        queryset = ClassGroup.objects.select_related("course", "venue")
        user = self.request.user
        if user.role == User.Role.LECTURER:
            queryset = queryset.filter(course__lecturer=user)
        elif user.role == User.Role.STUDENT:
            queryset = queryset.filter(enrollments__student__user=user, enrollments__status='active')
        course = self.request.query_params.get("course")
        return queryset.filter(course_id=course).distinct() if course else queryset.distinct()

    def destroy(self, request, *args, **kwargs):
        if self.get_object().attendance_sessions.exists():
            return Response({'detail': 'This class has attendance history. Deactivate it instead.'}, status=409)
        return super().destroy(request, *args, **kwargs)

class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = (IsAdminOrReadOnly,)
    http_method_names = ("get", "post", "patch", "delete", "head", "options")
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('student__user__first_name', 'student__user__last_name', 'student__student_number', 'class_group__name', 'class_group__course__code')
    ordering_fields = ('enrolled_at', 'class_group__course__code', 'student__student_number')

    def get_queryset(self):
        queryset = Enrollment.objects.select_related("student__user", "class_group__course")
        user = self.request.user
        if user.role == User.Role.STUDENT:
            queryset = queryset.filter(student__user=user)
        elif user.role == User.Role.LECTURER:
            queryset = queryset.filter(class_group__course__lecturer=user)
        if student := self.request.query_params.get("student"):
            queryset = queryset.filter(student__user_id=student)
        if group := self.request.query_params.get("classGroup"):
            queryset = queryset.filter(class_group_id=group)
        return queryset

    def destroy(self, request, *args, **kwargs):
        enrollment = self.get_object()
        if AttendanceRecord.objects.filter(student=enrollment.student, session__class_group=enrollment.class_group).exists():
            return Response({'detail': 'This enrollment has attendance records. Change its status to dropped instead.'}, status=409)
        return super().destroy(request, *args, **kwargs)


class AttendanceSessionViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSessionSerializer
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ("get", "post", "patch", "head", "options")
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("class_group__course__code", "class_group__course__name", "class_group__name", "venue__name")
    ordering_fields = ("start_time", "end_time", "created_at")

    def get_queryset(self):
        queryset = AttendanceSession.objects.select_related("class_group__course", "lecturer", "venue")
        queryset = queryset.prefetch_related('records', 'class_group__enrollments')
        user = self.request.user
        if user.role == User.Role.LECTURER:
            queryset = queryset.filter(lecturer=user)
        elif user.role == User.Role.STUDENT:
            queryset = queryset.none()
        if course := self.request.query_params.get("course"):
            queryset = queryset.filter(class_group__course_id=course)
        if date := self.request.query_params.get("date"):
            queryset = queryset.filter(start_time__date=date)
        if selected := self.request.query_params.get('status'):
            now = timezone.now()
            if selected == 'active':
                queryset = queryset.filter(start_time__lte=now, end_time__gt=now, status__in=('scheduled', 'active'))
            elif selected == 'expired':
                queryset = queryset.filter(end_time__lte=now).exclude(status__in=('paused', 'closed'))
            elif selected == 'scheduled':
                queryset = queryset.filter(start_time__gt=now).exclude(status__in=('paused', 'closed'))
            elif selected in ('paused', 'closed'):
                queryset = queryset.filter(status=selected)
            else:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'status': 'Invalid session status.'})
        return queryset

    def perform_create(self, serializer):
        if self.request.user.role != User.Role.LECTURER:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only lecturers can create attendance sessions.")
        session = serializer.save(lecturer=self.request.user)
        from .notifications import notify_enrolled_students
        transaction.on_commit(lambda: notify_enrolled_students(session))

    @action(detail=True, methods=("post",))
    def close(self, request, pk=None):
        session = self.get_object()
        if request.user.role != User.Role.LECTURER:
            return Response({"detail":"Only lecturers can close sessions."}, status=status.HTTP_403_FORBIDDEN)
        session.status = AttendanceSession.Status.CLOSED
        session.save(update_fields=("status", "updated_at"))
        return Response(self.get_serializer(session).data)

    @action(detail=True, methods=("get",))
    def records(self, request, pk=None):
        session = self.get_object()
        records = session.records.select_related("student__user", "session__class_group__course", "session__venue")
        page = self.paginate_queryset(records)
        serializer = AttendanceRecordSerializer(page if page is not None else records, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    @action(detail=True, methods=("get",))
    def report(self, request, pk=None):
        from .reports import session_report
        return Response(session_report(self.get_object(), request))

    @action(detail=True, methods=("get",), url_path="report-export")
    def export_report(self, request, pk=None):
        from .reports import export_report, session_report
        session = self.get_object()
        report = session_report(session, request)
        if not report["canExport"]:
            return attendance_error("session_open", "Reports can only be exported after attendance closes or expires.", status.HTTP_409_CONFLICT)
        file_type = request.query_params.get("fileType", "")
        if file_type not in {"xlsx", "pdf"}:
            return attendance_error("invalid_format", "Choose PDF or Excel (xlsx).", status.HTTP_400_BAD_REQUEST)
        return export_report(report, file_type)


class ResolveAttendanceSessionView(APIView):
    def post(self, request):
        if request.user.role != User.Role.STUDENT:
            return attendance_error("student_required", "Only students can verify attendance QR codes.", status.HTTP_403_FORBIDDEN)
        identifier = AttendanceSessionIdentifierSerializer(data=request.data)
        identifier.is_valid(raise_exception=True)
        session = find_requested_session(identifier.validated_data)
        if not session:
            return attendance_error("invalid_qr", "The QR code is invalid or no longer current.", status.HTTP_400_BAD_REQUEST)
        try:
            student = request.user.student_profile
        except StudentProfile.DoesNotExist:
            return attendance_error("student_profile_missing", "Your student profile is incomplete.", status.HTTP_403_FORBIDDEN)
        if not Enrollment.objects.filter(class_group=session.class_group, student=student, status=Enrollment.Status.ACTIVE).exists():
            return attendance_error("not_enrolled", "You are not enrolled in this class.", status.HTTP_403_FORBIDDEN)
        if AttendanceRecord.objects.filter(session=session, student=student).exists():
            return attendance_error("already_marked", "Attendance has already been recorded for this session.", status.HTTP_409_CONFLICT)
        if session.effective_status != AttendanceSession.Status.ACTIVE:
            code = "expired" if session.effective_status in {"expired", AttendanceSession.Status.CLOSED} else "not_active"
            return attendance_error(code, "This attendance session is not active.", status.HTTP_409_CONFLICT)
        return Response({"success":True, "session":AttendanceSessionPublicSerializer(session).data})


class AttendanceCheckInView(APIView):
    def post(self, request):
        if request.user.role != User.Role.STUDENT:
            return attendance_error("student_required", "Only students can check in.", status.HTTP_403_FORBIDDEN)
        serializer = AttendanceCheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        session = find_requested_session(data)
        if not session:
            return attendance_error("invalid_qr", "The QR code is invalid or no longer current.", status.HTTP_400_BAD_REQUEST)
        try:
            student = request.user.student_profile
        except StudentProfile.DoesNotExist:
            return attendance_error("student_profile_missing", "Your student profile is incomplete.", status.HTTP_403_FORBIDDEN)
        if not Enrollment.objects.filter(class_group=session.class_group, student=student, status=Enrollment.Status.ACTIVE).exists():
            return attendance_error("not_enrolled", "You are not enrolled in this class.", status.HTTP_403_FORBIDDEN)
        if AttendanceRecord.objects.filter(session=session, student=student).exists():
            return attendance_error("already_marked", "Attendance has already been recorded for this session.", status.HTTP_409_CONFLICT)
        if session.effective_status != AttendanceSession.Status.ACTIVE:
            code = "expired" if session.effective_status in {"expired", AttendanceSession.Status.CLOSED} else "not_active"
            return attendance_error(code, "This attendance session is not active.", status.HTTP_409_CONFLICT)
        if session.latitude is None or session.longitude is None:
            return attendance_error("venue_unconfigured", "The session venue has no geofence coordinates.", status.HTTP_409_CONFLICT)
        max_accuracy = getattr(settings, "MAX_GPS_ACCURACY_METERS", 150)
        if data["accuracy"] > max_accuracy:
            return attendance_error("gps_low", f"Your device reported location uncertainty of {data['accuracy']:.1f} metres. Check-in requires {max_accuracy} metres or better. Retry in an area with a clearer GPS signal.", status.HTTP_400_BAD_REQUEST)
        distance = distance_metres(
            float(session.latitude), float(session.longitude), data["latitude"], data["longitude"],
        )
        if distance > session.radius:
            return Response({
                "success":False, "code":"outside_area", "message":"You are outside the attendance area.",
                "distance":round(distance, 2), "radius":session.radius,
            }, status=status.HTTP_403_FORBIDDEN)
        try:
            with transaction.atomic():
                record = AttendanceRecord.objects.create(
                    session=session, student=student, check_in_latitude=data["latitude"],
                    check_in_longitude=data["longitude"], distance_from_venue=distance,
                    gps_accuracy=data["accuracy"], ip_address=request.META.get("REMOTE_ADDR"),
                    user_agent=request.META.get("HTTP_USER_AGENT", "")[:300],
                )
        except IntegrityError:
            return attendance_error("already_marked", "Attendance has already been recorded for this session.", status.HTTP_409_CONFLICT)
        return Response({
            "success":True, "message":"Attendance recorded successfully.",
            "record":AttendanceRecordSerializer(record).data,
        }, status=status.HTTP_201_CREATED)


class MyAttendanceHistoryView(APIView):
    def get(self, request):
        if request.user.role != User.Role.STUDENT:
            return attendance_error("student_required", "Only students have personal attendance history.", status.HTTP_403_FORBIDDEN)
        records = AttendanceRecord.objects.filter(student__user=request.user).select_related(
            "student__user", "session__class_group__course", "session__venue",
        )
        if course := request.query_params.get("course"):
            records = records.filter(session__class_group__course_id=course)
        if search := request.query_params.get("search", "").strip():
            records = records.filter(Q(session__class_group__course__code__icontains=search) | Q(session__class_group__course__name__icontains=search) | Q(session__venue__name__icontains=search) | Q(status__icontains=search))
        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        page = paginator.paginate_queryset(records, request)
        return paginator.get_paginated_response(AttendanceRecordSerializer(page, many=True).data)


class StudentDashboardView(APIView):
    def get(self, request):
        if request.user.role != User.Role.STUDENT:
            return attendance_error("student_required", "Only students can view this dashboard.", status.HTTP_403_FORBIDDEN)
        now = timezone.now()
        sessions = AttendanceSession.objects.filter(
            class_group__enrollments__student__user=request.user,
            class_group__enrollments__status=Enrollment.Status.ACTIVE,
            class_group__enrollments__enrolled_at__lte=F("end_time"),
        ).distinct()
        records = AttendanceRecord.objects.filter(student__user=request.user, session__start_time__lte=now)
        marked = set(records.values_list("session_id", flat=True))
        completed = set(sessions.filter(start_time__lte=now).filter(
            Q(end_time__lte=now) | Q(status=AttendanceSession.Status.CLOSED),
        ).values_list("id", flat=True))
        present = records.filter(status=AttendanceRecord.Status.PRESENT).count()
        late = records.filter(status=AttendanceRecord.Status.LATE).count()
        absent = len(completed - marked)
        total = present + late + absent
        # Browser-local day boundaries keep Today correct across time zones.
        from rest_framework import serializers
        field = serializers.DateTimeField()
        day_start = field.run_validation(request.query_params["dayStart"]) if "dayStart" in request.query_params else timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = field.run_validation(request.query_params["dayEnd"]) if "dayEnd" in request.query_params else day_start + timedelta(days=1)
        if day_end <= day_start or day_end - day_start > timedelta(days=2):
            raise serializers.ValidationError("Invalid dashboard day boundaries.")
        today = sessions.filter(start_time__lt=day_end, end_time__gt=day_start).select_related("class_group__course", "lecturer", "venue").order_by("start_time")
        timeline = []
        for session in today:
            item = dict(AttendanceSessionPublicSerializer(session).data)
            item["alreadyMarked"] = session.id in marked
            timeline.append(item)
        return Response({
            "presence": {"present":present, "late":late, "absent":absent, "total":total,
                         "rate":round((present + late) / total * 100) if total else 0},
            "todaySessions":timeline,
        })
