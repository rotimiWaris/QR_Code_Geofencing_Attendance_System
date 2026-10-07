import os
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from .models import User
from .directory import revoke_refresh_tokens


class RecoveryThrottle(AnonRateThrottle):
    rate = '5/hour'


class PasswordResetRequestView(APIView):
    authentication_classes = ()
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (RecoveryThrottle,)

    def post(self, request):
        email = serializers.EmailField().run_validation(request.data.get('email'))
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            base = os.getenv('PUBLIC_FRONTEND_URL', 'http://localhost:5173').rstrip('/')
            link = f'{base}/reset-password?uid={uid}&token={token}'
            send_mail('Campus Presence password reset', f'Reset your password: {link}\nIf you did not request this, ignore this message.', settings.DEFAULT_FROM_EMAIL, [user.email])
        return Response({'detail': 'If an active account exists, a reset link has been issued.'})


class PasswordResetConfirmView(APIView):
    authentication_classes = ()
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (RecoveryThrottle,)

    def post(self, request):
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(request.data.get('uid', ''))), is_active=True)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError, DjangoValidationError):
            raise serializers.ValidationError('Reset link is invalid or expired.')
        token = request.data.get('token', '')
        if not isinstance(token, str) or not default_token_generator.check_token(user, token):
            raise serializers.ValidationError('Reset link is invalid or expired.')
        password = request.data.get('newPassword')
        if not isinstance(password, str):
            raise serializers.ValidationError('Supply a new password.')
        try:
            validate_password(password, user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'newPassword': error.messages})
        user.set_password(password)
        user.save(update_fields=['password', 'updated_at'])
        revoke_refresh_tokens(user)
        return Response({'detail': 'Password reset successfully. Sign in with your new password.'})
