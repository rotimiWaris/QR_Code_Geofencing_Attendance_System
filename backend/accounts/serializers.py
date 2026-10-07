from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import LecturerProfile, RegistrationToken, StudentProfile, User

class StudentProfileSerializer(serializers.ModelSerializer):
    studentId = serializers.CharField(source="student_number")
    class Meta:
        model = StudentProfile
        fields = ("studentId", "department", "level")

class LecturerProfileSerializer(serializers.ModelSerializer):
    staffId = serializers.CharField(source="staff_number")
    class Meta:
        model = LecturerProfile
        fields = ("staffId", "title", "department")

class UserSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(source="first_name")
    lastName = serializers.CharField(source="last_name")
    isActive = serializers.BooleanField(source="is_active")
    createdAt = serializers.DateTimeField(source="created_at")
    updatedAt = serializers.DateTimeField(source="updated_at")
    studentProfile = serializers.SerializerMethodField()
    lecturerProfile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "firstName", "lastName", "role", "isActive", "createdAt", "updatedAt", "studentProfile", "lecturerProfile")

    def get_studentProfile(self, obj):
        profile = getattr(obj, "student_profile", None)
        return StudentProfileSerializer(profile).data if profile else None

    def get_lecturerProfile(self, obj):
        profile = getattr(obj, "lecturer_profile", None)
        return LecturerProfileSerializer(profile).data if profile else None

class LoginSerializer(TokenObtainPairSerializer):
    role = serializers.ChoiceField(choices=User.Role.choices, required=False)

    def validate(self, attrs):
        requested_role = attrs.pop("role", None)
        data = super().validate(attrs)
        if requested_role and self.user.role != requested_role:
            raise serializers.ValidationError({"role":"This account does not have the selected role."})
        data["user"] = UserSerializer(self.user).data
        return data

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

class ChangePasswordSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(write_only=True)
    newPassword = serializers.CharField(write_only=True)

    def validate_currentPassword(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("The current password is incorrect.")
        return value

    def validate_newPassword(self, value):
        validate_password(value, self.context["request"].user)
        return value

class RegistrationTokenSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="intended_role")
    isUsed = serializers.BooleanField(source="is_used")
    createdAt = serializers.DateTimeField(source="created_at")
    usedAt = serializers.DateTimeField(source="used_at")
    usedBy = serializers.SerializerMethodField()

    class Meta:
        model = RegistrationToken
        fields = ("id", "code", "role", "isUsed", "createdAt", "usedAt", "usedBy")

    def get_usedBy(self, obj):
        return obj.used_by.email if obj.used_by else None

class GenerateRegistrationTokenSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=RegistrationToken.IntendedRole.choices)

class SignupSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=11)
    role = serializers.ChoiceField(choices=RegistrationToken.IntendedRole.choices)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    firstName = serializers.CharField(max_length=80)
    lastName = serializers.CharField(max_length=80)
    identificationNumber = serializers.CharField(max_length=40)
    department = serializers.CharField(max_length=120)
    level = serializers.ChoiceField(choices=StudentProfile.Level.choices, required=False)
    title = serializers.CharField(max_length=30, required=False, allow_blank=True)

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account already uses this email address.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["role"] == User.Role.STUDENT:
            if not attrs.get("level"):
                raise serializers.ValidationError({"level":"A student level is required."})
            if StudentProfile.objects.filter(student_number=attrs["identificationNumber"]).exists():
                raise serializers.ValidationError({"identificationNumber":"This student number is already registered."})
        elif LecturerProfile.objects.filter(staff_number=attrs["identificationNumber"]).exists():
            raise serializers.ValidationError({"identificationNumber":"This staff number is already registered."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        try:
            registration_token = RegistrationToken.objects.select_for_update().get(code=validated_data["token"].lower())
        except RegistrationToken.DoesNotExist:
            raise serializers.ValidationError({"token":"This registration token is invalid."})
        if registration_token.is_used:
            raise serializers.ValidationError({"token":"This registration token has already been used."})
        if registration_token.intended_role != validated_data["role"]:
            raise serializers.ValidationError({"token":"This token is not valid for the selected role."})

        user = User.objects.create_user(
            email=validated_data["email"], password=validated_data["password"],
            first_name=validated_data["firstName"], last_name=validated_data["lastName"], role=validated_data["role"],
        )
        if user.role == User.Role.STUDENT:
            student = StudentProfile.objects.create(user=user, student_number=validated_data["identificationNumber"], department=validated_data["department"], level=validated_data["level"])
            from academics.enrollment_service import enroll_student_for_level
            enroll_student_for_level(student)
        else:
            LecturerProfile.objects.create(user=user, staff_number=validated_data["identificationNumber"], department=validated_data["department"], title=validated_data.get("title", ""))
        registration_token.is_used = True
        registration_token.used_by = user
        registration_token.used_at = timezone.now()
        registration_token.save(update_fields=("is_used", "used_by", "used_at"))
        return user
