from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from accounts.views import LecturerListView
from accounts.directory import UserDirectoryViewSet

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/users/", UserDirectoryViewSet.as_view({'get': 'list'}), name="user-list"),
    path("api/users/<uuid:pk>/", UserDirectoryViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'}), name="user-detail"),
    path("api/users/<uuid:pk>/reset-password/", UserDirectoryViewSet.as_view({'post': 'reset_password'}), name="user-reset-password"),
    path("api/lecturers/", UserDirectoryViewSet.as_view({'get': 'list'}), {'directory_role': 'lecturer'}, name="lecturer-list"),
    path("api/students/", UserDirectoryViewSet.as_view({'get': 'list'}), {'directory_role': 'student'}, name="student-list"),
    path("api/", include("academics.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
