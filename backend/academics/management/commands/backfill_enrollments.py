from django.core.management.base import BaseCommand
from accounts.models import StudentProfile
from academics.enrollment_service import enroll_student_for_level, matching_classes


class Command(BaseCommand):
    help = 'Add missing active level-based enrollments without reseeding or changing existing enrollment statuses.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Preview missing enrollment totals without writing.')
        parser.add_argument('--student-number', help='Process only this student number.')

    def handle(self, *args, **options):
        students = StudentProfile.objects.filter(user__is_active=True, user__role='student').select_related('user')
        if options['student_number']:
            students = students.filter(student_number=options['student_number'])
        count = 0
        student_count = 0
        for student in students.iterator():
            student_count += 1
            if options['dry_run']:
                count += matching_classes(student).exclude(enrollments__student=student).count()
            else:
                count += enroll_student_for_level(student)
        action = 'Would create' if options['dry_run'] else 'Created'
        self.stdout.write(self.style.SUCCESS(f'{action} {count} missing enrollments across {student_count} active students. Existing statuses preserved.'))
