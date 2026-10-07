from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from accounts.models import StudentProfile, User
from .models import AttendanceRecord, AttendanceSession, ClassGroup, Course, Enrollment, Venue

class CourseSerializer(serializers.ModelSerializer):
    creditHours = serializers.IntegerField(source="credit_units", min_value=1, max_value=10)
    lecturerId = serializers.PrimaryKeyRelatedField(source="lecturer", queryset=User.objects.filter(role=User.Role.LECTURER, is_active=True), allow_null=True, required=False)
    lecturerName = serializers.SerializerMethodField()
    isActive = serializers.BooleanField(source="is_active")
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Course
        fields = ("id","code","name","description","department","level","creditHours","semester","lecturerId","lecturerName","isActive","createdAt")

    def get_lecturerName(self, obj):
        return obj.lecturer.full_name if obj.lecturer else None

    def validate_code(self, value):
        value = value.upper().strip()
        queryset = Course.objects.filter(code=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('This course code already exists.')
        return value

    def validate(self, attrs):
        if self.instance and 'level' in attrs and attrs['level'] != self.instance.level:
            if self.instance.class_groups.filter(enrollments__status='active').exists() or self.instance.class_groups.filter(attendance_sessions__isnull=False).exists():
                raise serializers.ValidationError('A course with active enrollments or attendance history cannot change level.')
        return attrs

class VenueSerializer(serializers.ModelSerializer):
    roomNumber = serializers.CharField(source="room_number", allow_blank=True, required=False)
    radius = serializers.IntegerField(source="default_radius", min_value=10, max_value=500)
    isActive = serializers.BooleanField(source="is_active")
    latitude = serializers.FloatField(allow_null=True, required=False, min_value=-90, max_value=90)
    longitude = serializers.FloatField(allow_null=True, required=False, min_value=-180, max_value=180)

    class Meta:
        model = Venue
        fields = ("id","name","building","floor","roomNumber","latitude","longitude","radius","capacity","isActive")

    def validate(self, attrs):
        lat = attrs.get('latitude', getattr(self.instance, 'latitude', None))
        lng = attrs.get('longitude', getattr(self.instance, 'longitude', None))
        if (lat is None) != (lng is None):
            raise serializers.ValidationError('Supply both coordinates or leave both empty.')
        return attrs

class ClassGroupSerializer(serializers.ModelSerializer):
    courseId = serializers.PrimaryKeyRelatedField(source="course", queryset=Course.objects.all())
    courseName = serializers.CharField(source="course.name", read_only=True)
    courseCode = serializers.CharField(source="course.code", read_only=True)
    venue = serializers.CharField(source="venue.name", read_only=True, allow_null=True)
    venueId = serializers.PrimaryKeyRelatedField(source="venue", queryset=Venue.objects.all(), allow_null=True, required=False)
    academicYear = serializers.CharField(source="academic_year")
    enrolledCount = serializers.IntegerField(source="enrollments.count", read_only=True)
    isActive = serializers.BooleanField(source="is_active")

    class Meta:
        model = ClassGroup
        fields = ("id","courseId","courseName","courseCode","name","schedule","venue","venueId","capacity","enrolledCount","academicYear","semester","isActive")

    def validate(self, attrs):
        if self.instance and 'course' in attrs and attrs['course'].pk != self.instance.course_id:
            if self.instance.enrollments.exists() or self.instance.attendance_sessions.exists():
                raise serializers.ValidationError('A class with enrollments or sessions cannot change course.')
        keys = ('course', 'name', 'academic_year', 'semester')
        values = {key: attrs.get(key, getattr(self.instance, key, None)) for key in keys}
        if all(values.values()):
            queryset = ClassGroup.objects.filter(**values)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError('This class already exists in the selected course and academic period.')
        return attrs

class EnrollmentSerializer(serializers.ModelSerializer):
    studentId = serializers.CharField(required=False, write_only=True)
    classGroupId = serializers.UUIDField(required=False, write_only=True)
    studentName = serializers.CharField(source="student.user.full_name", read_only=True)
    studentIdNumber = serializers.CharField(source="student.student_number", read_only=True)
    classGroupName = serializers.CharField(source="class_group.name", read_only=True)
    courseCode = serializers.CharField(source="class_group.course.code", read_only=True)
    courseName = serializers.CharField(source="class_group.course.name", read_only=True)
    enrolledAt = serializers.DateTimeField(source="enrolled_at", read_only=True)

    class Meta:
        model = Enrollment
        fields = ("id","studentId","studentIdNumber","studentName","classGroupId","classGroupName","courseCode","courseName","enrolledAt","status")

    def create(self, validated_data):
        if not all(key in validated_data for key in ('studentId', 'classGroupId')):
            raise serializers.ValidationError('Student and class group are required.')
        student_value = validated_data.pop("studentId")
        class_group_id = validated_data.pop("classGroupId")
        try:
            student = StudentProfile.objects.get(student_number=student_value)
        except StudentProfile.DoesNotExist:
            try:
                student = StudentProfile.objects.get(user_id=student_value)
            except (StudentProfile.DoesNotExist, ValueError, DjangoValidationError):
                raise serializers.ValidationError({"studentId":"Student was not found."})
        try:
            class_group = ClassGroup.objects.get(pk=class_group_id)
        except ClassGroup.DoesNotExist:
            raise serializers.ValidationError({"classGroupId":"Class group was not found."})
        if student.level != class_group.course.level:
            raise serializers.ValidationError({"studentId":"Student level must match the course level."})
        if not student.user.is_active or not class_group.is_active or not class_group.course.is_active:
            raise serializers.ValidationError('Student, course and class must be active.')
        if Enrollment.objects.filter(student=student, class_group=class_group).exists():
            raise serializers.ValidationError('This student already has an enrollment for this class. Update its status instead.')
        return Enrollment.objects.create(student=student, class_group=class_group, **validated_data)

    def update(self, instance, validated_data):
        if 'studentId' in validated_data or 'classGroupId' in validated_data:
            raise serializers.ValidationError('Enrollment student and class cannot be changed.')
        if validated_data.get('status') == 'active' and instance.student.level != instance.class_group.course.level:
            raise serializers.ValidationError('Student level must match the course level.')
        if validated_data.get('status') == 'active' and (not instance.student.user.is_active or not instance.class_group.is_active or not instance.class_group.course.is_active):
            raise serializers.ValidationError('Student, course and class must be active.')
        return super().update(instance, validated_data)


class AttendanceSessionSerializer(serializers.ModelSerializer):
    courseId = serializers.UUIDField(source="class_group.course_id", read_only=True)
    courseCode = serializers.CharField(source="class_group.course.code", read_only=True)
    courseName = serializers.CharField(source="class_group.course.name", read_only=True)
    classGroupId = serializers.PrimaryKeyRelatedField(source="class_group", queryset=ClassGroup.objects.all())
    classGroupName = serializers.CharField(source="class_group.name", read_only=True)
    lecturerId = serializers.UUIDField(source="lecturer_id", read_only=True)
    lecturerName = serializers.CharField(source="lecturer.full_name", read_only=True)
    venueId = serializers.PrimaryKeyRelatedField(source="venue", queryset=Venue.objects.filter(is_active=True))
    venueName = serializers.CharField(source="venue.name", read_only=True)
    latitude = serializers.FloatField(allow_null=True, required=False)
    longitude = serializers.FloatField(allow_null=True, required=False)
    qrToken = serializers.SerializerMethodField()
    qrType = serializers.ChoiceField(source="qr_type", choices=AttendanceSession.QRType.choices)
    qrRefreshInterval = serializers.IntegerField(source="qr_refresh_interval", allow_null=True, required=False)
    startTime = serializers.DateTimeField(source="start_time")
    endTime = serializers.DateTimeField(source="end_time")
    status = serializers.CharField(source="effective_status", read_only=True)
    checkedInCount = serializers.SerializerMethodField()
    totalEnrolled = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = AttendanceSession
        fields = (
            "id", "courseId", "courseCode", "courseName", "classGroupId", "classGroupName",
            "lecturerId", "lecturerName", "venueId", "venueName", "latitude", "longitude",
            "radius", "qrToken", "qrType", "qrRefreshInterval", "startTime", "endTime",
            "status", "checkedInCount", "totalEnrolled", "createdAt", "updatedAt",
        )

    def validate(self, attrs):
        class_group = attrs.get("class_group") or getattr(self.instance, "class_group", None)
        if not class_group.is_active or not class_group.course.is_active:
            raise serializers.ValidationError({'classGroupId': 'Course and class must be active.'})
        request = self.context["request"]
        if request.user.role == User.Role.LECTURER and class_group.course.lecturer_id != request.user.id:
            raise serializers.ValidationError({"classGroupId":"You can only create sessions for courses assigned to you."})
        start_time = attrs.get("start_time") or getattr(self.instance, "start_time", None)
        end_time = attrs.get("end_time") or getattr(self.instance, "end_time", None)
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({"endTime":"End time must be later than start time."})
        venue = attrs.get("venue") or getattr(self.instance, "venue", None)
        latitude = attrs.get("latitude", venue.latitude if venue else None)
        longitude = attrs.get("longitude", venue.longitude if venue else None)
        if latitude is None or longitude is None:
            raise serializers.ValidationError({"latitude":"Capture the venue centre or configure coordinates for this venue first."})
        qr_type = attrs.get("qr_type", getattr(self.instance, "qr_type", AttendanceSession.QRType.STATIC))
        refresh = attrs.get("qr_refresh_interval")
        if qr_type == AttendanceSession.QRType.ROTATING and not refresh:
            raise serializers.ValidationError({"qrRefreshInterval":"A refresh interval is required for rotating QR codes."})
        return attrs

    def create(self, validated_data):
        venue = validated_data["venue"]
        validated_data.setdefault("latitude", venue.latitude)
        validated_data.setdefault("longitude", venue.longitude)
        validated_data.setdefault("radius", venue.default_radius)
        return super().create(validated_data)

    def get_checkedInCount(self, obj):
        return sum(record.status in {'present', 'late'} for record in obj.records.all())

    def get_totalEnrolled(self, obj):
        return sum(enrollment.status == Enrollment.Status.ACTIVE for enrollment in obj.class_group.enrollments.all())

    def get_qrToken(self, obj):
        request = self.context.get("request")
        if request and request.user.role == User.Role.STUDENT:
            return ""
        return obj.current_qr_token()


class AttendanceSessionPublicSerializer(serializers.ModelSerializer):
    courseCode = serializers.CharField(source="class_group.course.code", read_only=True)
    courseName = serializers.CharField(source="class_group.course.name", read_only=True)
    classGroupName = serializers.CharField(source="class_group.name", read_only=True)
    lecturerName = serializers.CharField(source="lecturer.full_name", read_only=True)
    venueName = serializers.CharField(source="venue.name", read_only=True)
    startTime = serializers.DateTimeField(source="start_time", read_only=True)
    endTime = serializers.DateTimeField(source="end_time", read_only=True)
    status = serializers.CharField(source="effective_status", read_only=True)

    class Meta:
        model = AttendanceSession
        fields = ("id", "courseCode", "courseName", "classGroupName", "lecturerName", "venueName", "radius", "startTime", "endTime", "status")


class AttendanceRecordSerializer(serializers.ModelSerializer):
    sessionId = serializers.UUIDField(source="session_id", read_only=True)
    courseCode = serializers.CharField(source="session.class_group.course.code", read_only=True)
    courseName = serializers.CharField(source="session.class_group.course.name", read_only=True)
    venueName = serializers.CharField(source="session.venue.name", read_only=True)
    studentId = serializers.UUIDField(source="student.user_id", read_only=True)
    studentName = serializers.CharField(source="student.user.full_name", read_only=True)
    studentIdNumber = serializers.CharField(source="student.student_number", read_only=True)
    checkInTime = serializers.DateTimeField(source="check_in_time", read_only=True)
    checkInLatitude = serializers.FloatField(source="check_in_latitude", read_only=True)
    checkInLongitude = serializers.FloatField(source="check_in_longitude", read_only=True)
    distanceFromVenue = serializers.FloatField(source="distance_from_venue", read_only=True)
    gpsAccuracy = serializers.FloatField(source="gps_accuracy", read_only=True)
    manualOverride = serializers.BooleanField(source="manual_override", read_only=True)
    overrideReason = serializers.CharField(source="override_reason", read_only=True)
    overriddenBy = serializers.UUIDField(source="overridden_by_id", read_only=True, allow_null=True)

    class Meta:
        model = AttendanceRecord
        fields = (
            "id", "sessionId", "courseCode", "courseName", "venueName", "studentId",
            "studentName", "studentIdNumber", "status", "checkInTime", "checkInLatitude",
            "checkInLongitude", "distanceFromVenue", "gpsAccuracy", "manualOverride",
            "overrideReason", "overriddenBy",
        )


class AttendanceSessionIdentifierSerializer(serializers.Serializer):
    qrToken = serializers.CharField(max_length=200)
    sessionId = serializers.UUIDField(required=False)

    def validate(self, attrs):
        return attrs


class AttendanceCheckInSerializer(AttendanceSessionIdentifierSerializer):
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    accuracy = serializers.FloatField(min_value=0, max_value=10000)
    timestamp = serializers.DateTimeField(required=False)
