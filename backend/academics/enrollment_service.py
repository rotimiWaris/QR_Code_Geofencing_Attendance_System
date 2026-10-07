from django.db import transaction
from accounts.models import User
from .models import ClassGroup, Enrollment


def matching_classes(student):
    """Follow the level-based cohort rule used by the academic seed data."""
    return ClassGroup.objects.filter(is_active=True, course__is_active=True, course__level=student.level)


@transaction.atomic
def enroll_student_for_level(student):
    if not student.user.is_active or student.user.role != User.Role.STUDENT:
        return 0
    created_count = 0
    for group in matching_classes(student):
        # Never reactivate dropped/completed enrollments or rewrite their dates.
        _, created = Enrollment.objects.get_or_create(student=student, class_group=group)
        created_count += int(created)
    return created_count
