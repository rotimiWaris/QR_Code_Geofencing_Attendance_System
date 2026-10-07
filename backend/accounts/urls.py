from django.urls import path
from .views import ChangePasswordView, CurrentUserView, LoginView, LogoutView, RefreshView, RegistrationTokenListCreateView, SignupView
from .recovery import PasswordResetRequestView, PasswordResetConfirmView

urlpatterns = [
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", RefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("signup/", SignupView.as_view(), name="signup"),
    path("registration-tokens/", RegistrationTokenListCreateView.as_view(), name="registration-tokens"),
]
