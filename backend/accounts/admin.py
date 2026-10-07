from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import LecturerProfile, RegistrationToken, StudentProfile, User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    fieldsets = ((None,{"fields":("email","password")}), ("Identity",{"fields":("first_name","last_name","role")}), ("Permissions",{"fields":("is_active","is_staff","is_superuser","groups","user_permissions")}), ("Dates",{"fields":("last_login",)}))
    add_fieldsets = ((None,{"classes":("wide",),"fields":("email","first_name","last_name","role","password1","password2","is_active","is_staff")}),)

admin.site.register(StudentProfile)
admin.site.register(LecturerProfile)

@admin.register(RegistrationToken)
class RegistrationTokenAdmin(admin.ModelAdmin):
    list_display = ("code", "intended_role", "is_used", "created_by", "created_at", "used_by", "used_at")
    list_filter = ("intended_role", "is_used")
    search_fields = ("code", "used_by__email")
    readonly_fields = ("code", "created_by", "created_at", "is_used", "used_by", "used_at")
