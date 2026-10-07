import uuid
import secrets
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from .managers import UserManager

class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrator"
        LECTURER = "lecturer", "Lecturer"
        STUDENT = "student", "Student"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    role = models.CharField(max_length=16, choices=Role.choices)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]
    objects = UserManager()

    class Meta:
        ordering = ("last_name", "first_name")

    def save(self, *args, **kwargs):
        self.email = self.email.lower().strip()
        super().save(*args, **kwargs)

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return f"{self.full_name} ({self.email})"

class StudentProfile(models.Model):
    class Level(models.TextChoices):
        ND1 = "ND1", "ND1"
        ND2 = "ND2", "ND2"
        HND1 = "HND1", "HND1"
        HND2 = "HND2", "HND2"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile", limit_choices_to={"role":User.Role.STUDENT})
    student_number = models.CharField(max_length=40, unique=True)
    department = models.CharField(max_length=120)
    level = models.CharField(max_length=4, choices=Level.choices)

    def __str__(self):
        return f"{self.student_number} — {self.user.full_name}"

class LecturerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="lecturer_profile", limit_choices_to={"role":User.Role.LECTURER})
    staff_number = models.CharField(max_length=40, unique=True)
    title = models.CharField(max_length=30, blank=True)
    department = models.CharField(max_length=120)

    def __str__(self):
        return f"{self.staff_number} — {self.user.full_name}"

class RegistrationToken(models.Model):
    class IntendedRole(models.TextChoices):
        LECTURER = User.Role.LECTURER, "Lecturer"
        STUDENT = User.Role.STUDENT, "Student"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=11, unique=True, editable=False)
    intended_role = models.CharField(max_length=16, choices=IntendedRole.choices)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="registration_tokens_created")
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    used_by = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="registration_token_used")

    class Meta:
        ordering = ("-created_at",)

    @classmethod
    def issue(cls, intended_role, created_by):
        prefix = "lec" if intended_role == cls.IntendedRole.LECTURER else "stu"
        for _ in range(20):
            code = f"{prefix}{secrets.randbelow(100_000_000):08d}"
            if not cls.objects.filter(code=code).exists():
                return cls.objects.create(code=code, intended_role=intended_role, created_by=created_by)
        raise RuntimeError("Unable to generate a unique registration token.")

    def __str__(self):
        return self.code
