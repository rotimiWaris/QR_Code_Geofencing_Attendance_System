import uuid
import secrets
import hashlib
import hmac
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from accounts.models import StudentProfile

class Level(models.TextChoices):
    ND1 = "ND1", "ND1"
    ND2 = "ND2", "ND2"
    HND1 = "HND1", "HND1"
    HND2 = "HND2", "HND2"

class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=12, unique=True)
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    department = models.CharField(max_length=120, default="Computer Science")
    level = models.CharField(max_length=4, choices=Level.choices, db_index=True)
    semester = models.CharField(max_length=20, default="First")
    credit_units = models.PositiveSmallIntegerField(default=3, validators=[MinValueValidator(1), MaxValueValidator(10)])
    lecturer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="courses_taught", limit_choices_to={"role":"lecturer"})
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("level", "code")

    def save(self, *args, **kwargs):
        self.code = self.code.upper().strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} — {self.name}"

class Venue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80, unique=True)
    building = models.CharField(max_length=100, blank=True)
    floor = models.CharField(max_length=40, blank=True)
    room_number = models.CharField(max_length=40, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    default_radius = models.PositiveIntegerField(default=75, validators=[MinValueValidator(10), MaxValueValidator(500)])
    capacity = models.PositiveIntegerField(default=50)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name

class ClassGroup(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="class_groups")
    name = models.CharField(max_length=80)
    venue = models.ForeignKey(Venue, on_delete=models.SET_NULL, null=True, blank=True, related_name="class_groups")
    academic_year = models.CharField(max_length=9, default="2026/2027")
    semester = models.CharField(max_length=20, default="First")
    schedule = models.CharField(max_length=160, blank=True)
    capacity = models.PositiveIntegerField(default=50)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("course__code", "name")
        constraints = [models.UniqueConstraint(fields=("course", "name", "academic_year", "semester"), name="unique_course_class_period")]

    def __str__(self):
        return f"{self.course.code} / {self.name}"

class Enrollment(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DROPPED = "dropped", "Dropped"
        COMPLETED = "completed", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_group = models.ForeignKey(ClassGroup, on_delete=models.CASCADE, related_name="enrollments")
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="enrollments")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("class_group__course__code", "student__student_number")
        constraints = [models.UniqueConstraint(fields=("class_group", "student"), name="unique_student_class_enrollment")]

    def __str__(self):
        return f"{self.student.student_number} / {self.class_group}"


def generate_qr_token():
    return secrets.token_urlsafe(32)


class AttendanceSession(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        CLOSED = "closed", "Closed"

    class QRType(models.TextChoices):
        STATIC = "static", "Static"
        ROTATING = "rotating", "Rotating"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_group = models.ForeignKey(ClassGroup, on_delete=models.CASCADE, related_name="attendance_sessions")
    lecturer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="attendance_sessions", limit_choices_to={"role":"lecturer"})
    venue = models.ForeignKey(Venue, on_delete=models.PROTECT, related_name="attendance_sessions")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    radius = models.PositiveIntegerField(default=75, validators=[MinValueValidator(10), MaxValueValidator(500)])
    qr_token = models.CharField(max_length=64, unique=True, default=generate_qr_token, editable=False)
    qr_type = models.CharField(max_length=10, choices=QRType.choices, default=QRType.STATIC)
    qr_refresh_interval = models.PositiveIntegerField(null=True, blank=True, validators=[MinValueValidator(15), MaxValueValidator(600)])
    start_time = models.DateTimeField(db_index=True)
    end_time = models.DateTimeField(db_index=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.SCHEDULED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-start_time",)

    @property
    def effective_status(self):
        if self.status in {self.Status.CLOSED, self.Status.PAUSED}:
            return self.status
        now = timezone.now()
        if now >= self.end_time:
            return "expired"
        if self.start_time <= now:
            return self.Status.ACTIVE
        return self.Status.SCHEDULED

    def current_qr_token(self, at=None):
        if self.qr_type == self.QRType.STATIC:
            return self.qr_token
        at = at or timezone.now()
        interval = self.qr_refresh_interval or 60
        window = int(at.timestamp()) // interval
        payload = f"{self.id}.{window}"
        signature = hmac.new(self.qr_token.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
        return f"rot.{payload}.{signature}"

    def accepts_qr_token(self, token, at=None):
        if self.qr_type == self.QRType.STATIC:
            return hmac.compare_digest(self.qr_token, token)
        parts = token.split(".")
        if len(parts) != 4 or parts[0] != "rot" or parts[1] != str(self.id):
            return False
        try:
            supplied_window = int(parts[2])
        except ValueError:
            return False
        at = at or timezone.now()
        interval = self.qr_refresh_interval or 60
        current_window = int(at.timestamp()) // interval
        if supplied_window not in {current_window, current_window - 1}:
            return False
        payload = f"{self.id}.{supplied_window}"
        expected = hmac.new(self.qr_token.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
        return hmac.compare_digest(expected, parts[3])

    def __str__(self):
        return f"{self.class_group.course.code} / {self.start_time:%Y-%m-%d %H:%M}"


class AttendanceRecord(models.Model):
    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        LATE = "late", "Late"
        EXCUSED = "excused", "Excused"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name="records")
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="attendance_records")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PRESENT)
    check_in_time = models.DateTimeField(auto_now_add=True)
    check_in_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    check_in_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    distance_from_venue = models.DecimalField(max_digits=8, decimal_places=2)
    gps_accuracy = models.DecimalField(max_digits=7, decimal_places=2)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    manual_override = models.BooleanField(default=False)
    override_reason = models.CharField(max_length=300, blank=True)
    overridden_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="attendance_overrides")

    class Meta:
        ordering = ("-check_in_time",)
        constraints = [models.UniqueConstraint(fields=("session", "student"), name="unique_student_session_attendance")]

    def __str__(self):
        return f"{self.student.student_number} / {self.session}"
