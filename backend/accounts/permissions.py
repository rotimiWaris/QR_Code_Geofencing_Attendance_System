from rest_framework.permissions import BasePermission
from .models import User

class IsAdminRole(BasePermission):
    message = "Only administrators can perform this action."
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.role == User.Role.ADMIN)
