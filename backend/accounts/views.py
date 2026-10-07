from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .models import RegistrationToken, User
from .permissions import IsAdminRole
from .serializers import ChangePasswordSerializer, GenerateRegistrationTokenSerializer, LoginSerializer, LogoutSerializer, RegistrationTokenSerializer, SignupSerializer, UserSerializer

class LoginView(TokenObtainPairView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = LoginSerializer

class RefreshView(TokenRefreshView):
    permission_classes = (permissions.AllowAny,)

class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    def get_object(self):
        return self.request.user

class LogoutView(APIView):
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            return Response({"code":"invalid_refresh","detail":"Refresh token is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)

class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request":request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["newPassword"])
        request.user.save(update_fields=("password","updated_at"))
        from .directory import revoke_refresh_tokens
        revoke_refresh_tokens(request.user)
        return Response({"detail":"Password changed successfully."})

class SignupView(generics.CreateAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = SignupSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({"access":str(refresh.access_token), "refresh":str(refresh), "user":UserSerializer(user).data}, status=status.HTTP_201_CREATED)

class RegistrationTokenListCreateView(APIView):
    permission_classes = (IsAdminRole,)

    def get(self, request):
        tokens = RegistrationToken.objects.select_related("created_by", "used_by").all()
        return Response(RegistrationTokenSerializer(tokens, many=True).data)

    def post(self, request):
        serializer = GenerateRegistrationTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = RegistrationToken.issue(serializer.validated_data["role"], request.user)
        return Response(RegistrationTokenSerializer(token).data, status=status.HTTP_201_CREATED)


class LecturerListView(generics.ListAPIView):
    """Give administrators the lecturer directory used for course assignment."""

    serializer_class = UserSerializer
    permission_classes = (IsAdminRole,)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = (
        "first_name",
        "last_name",
        "email",
        "lecturer_profile__staff_number",
        "lecturer_profile__department",
    )
    ordering_fields = ("first_name", "last_name", "email", "created_at")
    ordering = ("last_name", "first_name")

    def get_queryset(self):
        return User.objects.filter(role=User.Role.LECTURER).select_related("lecturer_profile")
