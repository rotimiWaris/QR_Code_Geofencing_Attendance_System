from django.contrib import admin
from .models import AttendanceRecord, AttendanceSession, ClassGroup, Course, Enrollment, Venue

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "level", "lecturer", "is_active")
    list_filter = ("level", "is_active")
    search_fields = ("code", "name")

@admin.register(ClassGroup)
class ClassGroupAdmin(admin.ModelAdmin):
    list_display = ("course", "name", "venue", "academic_year", "semester", "is_active")
    list_filter = ("academic_year", "semester", "is_active")

@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ("name", "capacity", "default_radius", "is_active")

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("student", "class_group", "status", "enrolled_at")
    list_filter = ("status", "class_group__course__level")

@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ("class_group", "lecturer", "venue", "start_time", "end_time", "status")
    list_filter = ("status", "qr_type", "start_time")
    search_fields = ("class_group__course__code", "lecturer__email", "venue__name")

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("student", "session", "status", "check_in_time", "distance_from_venue", "gps_accuracy")
    list_filter = ("status", "manual_override", "check_in_time")
    search_fields = ("student__student_number", "student__user__email", "session__class_group__course__code")
