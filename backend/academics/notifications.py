"""Best-effort session announcements after a successful database commit."""
import logging
from zoneinfo import ZoneInfo
from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template.loader import render_to_string
from django.utils import timezone
from accounts.models import User
from .models import Enrollment

logger = logging.getLogger(__name__)


def notify_enrolled_students(session):
    """Never include QR credentials or expose other students' email addresses."""
    try:
        recipients = list(User.objects.filter(
            role=User.Role.STUDENT, is_active=True,
            student_profile__enrollments__class_group_id=session.class_group_id,
            student_profile__enrollments__status=Enrollment.Status.ACTIVE,
            student_profile__enrollments__enrolled_at__lte=session.end_time,
        ).distinct().order_by('email'))
        if not recipients:
            return
        zone = ZoneInfo(settings.ATTENDANCE_EMAIL_TIME_ZONE)
        local_start = timezone.localtime(session.start_time, zone)
        local_end = timezone.localtime(session.end_time, zone)
        context = {
            'course_code': session.class_group.course.code,
            'course_name': session.class_group.course.name,
            'class_name': session.class_group.name,
            'lecturer_name': session.lecturer.full_name,
            'venue_name': session.venue.name,
            'start_time': local_start.strftime('%d %b %Y, %I:%M %p %Z'),
            'end_time': local_end.strftime('%d %b %Y, %I:%M %p %Z'),
            'dashboard_url': settings.PUBLIC_FRONTEND_URL.rstrip('/') + '/student/dashboard',
        }
        # Reuse one SMTP connection; send separate messages for recipient privacy.
        with get_connection() as connection:
            for student in recipients:
                try:
                    personal = dict(context, student_name=student.full_name)
                    message = EmailMultiAlternatives(
                        subject=f"Attendance session: {context['course_code']} - {local_start:%Y-%m-%d}",
                        body=render_to_string('academics/session_email.txt', personal),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        to=[student.email], connection=connection,
                    )
                    message.attach_alternative(render_to_string('academics/session_email.html', personal), 'text/html')
                    if message.send() != 1:
                        logger.warning('Attendance announcement was not delivered for session %s, student %s.', session.pk, student.pk)
                except Exception:
                    logger.exception('Attendance announcement failed for session %s, student %s.', session.pk, student.pk)
    except Exception:
        # A mail outage must not turn a saved session into an API error/retry.
        logger.exception('Attendance announcements failed for session %s.', session.pk)
