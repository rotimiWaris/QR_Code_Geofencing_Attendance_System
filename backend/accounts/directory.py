from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import filters, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from .models import User
from .permissions import IsAdminRole
from .serializers import UserSerializer, StudentProfileSerializer, LecturerProfileSerializer


class ManagedUserSerializer(UserSerializer):
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    studentProfile = StudentProfileSerializer(source='student_profile', required=False)
    lecturerProfile = LecturerProfileSerializer(source='lecturer_profile', required=False)

    class Meta(UserSerializer.Meta):
        read_only_fields = ('id', 'role', 'createdAt', 'updatedAt')

    def validate(self, attrs):
        user = self.instance
        if user.pk == self.context['request'].user.pk and attrs.get('is_active') is False:
            raise serializers.ValidationError({'isActive': 'You cannot deactivate your own account.'})
        for field, role in [('student_profile', 'student'), ('lecturer_profile', 'lecturer')]:
            if field in attrs and user.role != role:
                raise serializers.ValidationError('Profile must match the account role.')
            if field in attrs and not getattr(user, field, None):
                raise serializers.ValidationError('This account has no matching profile.')
            if field in attrs:
                profile = getattr(user, field)
                id_field = 'student_number' if role == 'student' else 'staff_number'
                number = attrs[field].get(id_field)
                if number and type(profile).objects.filter(**{id_field: number}).exclude(pk=profile.pk).exists():
                    raise serializers.ValidationError('Identification number is already registered.')
        # Existing enrollments must still agree with a student's edited level.
        profile = attrs.get('student_profile', {})
        if 'level' in profile and user.student_profile.enrollments.filter(status='active').exclude(class_group__course__level=profile['level']).exists():
            raise serializers.ValidationError({'studentProfile': 'Drop incompatible enrollments before changing this level.'})
        return attrs

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('Email is already registered.')
        return value

    @transaction.atomic
    def update(self, instance, validated_data):
        for field in ('student_profile', 'lecturer_profile'):
            values = validated_data.pop(field, None)
            if values is not None:
                profile = getattr(instance, field)
                for key, value in values.items():
                    setattr(profile, key, value)
                profile.save()
        instance = super().update(instance, validated_data)
        if not instance.is_active:
            revoke_refresh_tokens(instance)
        return instance


def revoke_refresh_tokens(user):
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


class UserDirectoryViewSet(viewsets.GenericViewSet):
    permission_classes = (IsAdminRole,)
    serializer_class = ManagedUserSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('first_name', 'last_name', 'email', 'student_profile__student_number', 'lecturer_profile__staff_number', 'student_profile__department', 'lecturer_profile__department')
    ordering_fields = ('first_name', 'last_name', 'email', 'created_at')
    http_method_names = ('get', 'patch', 'post', 'head', 'options')

    def get_queryset(self):
        queryset = User.objects.select_related('student_profile', 'lecturer_profile')
        role = self.kwargs.get('directory_role') or self.request.query_params.get('role')
        if role:
            if role not in User.Role.values:
                raise serializers.ValidationError({'role': 'Invalid role.'})
            queryset = queryset.filter(role=role)
        if department := self.request.query_params.get('department'):
            from django.db.models import Q
            queryset = queryset.filter(Q(student_profile__department=department) | Q(lecturer_profile__department=department))
        return queryset

    def list(self, request, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    def retrieve(self, request, **kwargs):
        return Response(self.get_serializer(self.get_object()).data)

    def partial_update(self, request, **kwargs):
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, **kwargs):
        user = self.get_object()
        password = request.data.get('newPassword')
        if not isinstance(password, str):
            raise serializers.ValidationError({'newPassword': 'Supply a password.'})
        try:
            validate_password(password, user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'newPassword': error.messages})
        user.set_password(password)
        user.save(update_fields=['password', 'updated_at'])
        revoke_refresh_tokens(user)
        return Response({'detail': 'Password reset. Share it securely with the account owner.'})
