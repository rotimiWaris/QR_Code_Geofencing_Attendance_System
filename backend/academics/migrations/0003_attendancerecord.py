import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("academics", "0002_attendancesession"),
        ("accounts", "0003_remove_studentprofile_programme_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AttendanceRecord",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(choices=[("present", "Present"), ("late", "Late"), ("excused", "Excused")], default="present", max_length=12)),
                ("check_in_time", models.DateTimeField(auto_now_add=True)),
                ("check_in_latitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("check_in_longitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("distance_from_venue", models.DecimalField(decimal_places=2, max_digits=8)),
                ("gps_accuracy", models.DecimalField(decimal_places=2, max_digits=7)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.CharField(blank=True, max_length=300)),
                ("manual_override", models.BooleanField(default=False)),
                ("override_reason", models.CharField(blank=True, max_length=300)),
                ("overridden_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="attendance_overrides", to=settings.AUTH_USER_MODEL)),
                ("session", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="records", to="academics.attendancesession")),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_records", to="accounts.studentprofile")),
            ],
            options={
                "ordering": ("-check_in_time",),
                "constraints": [models.UniqueConstraint(fields=("session", "student"), name="unique_student_session_attendance")],
            },
        ),
    ]
