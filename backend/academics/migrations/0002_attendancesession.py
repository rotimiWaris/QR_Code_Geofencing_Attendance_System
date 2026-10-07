import academics.models
import django.core.validators
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("academics", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AttendanceSession",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("latitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("longitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("radius", models.PositiveIntegerField(default=75, validators=[django.core.validators.MinValueValidator(10), django.core.validators.MaxValueValidator(500)])),
                ("qr_token", models.CharField(default=academics.models.generate_qr_token, editable=False, max_length=64, unique=True)),
                ("qr_type", models.CharField(choices=[("static", "Static"), ("rotating", "Rotating")], default="static", max_length=10)),
                ("qr_refresh_interval", models.PositiveIntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(15), django.core.validators.MaxValueValidator(600)])),
                ("start_time", models.DateTimeField(db_index=True)),
                ("end_time", models.DateTimeField(db_index=True)),
                ("status", models.CharField(choices=[("scheduled", "Scheduled"), ("active", "Active"), ("paused", "Paused"), ("closed", "Closed")], default="scheduled", max_length=12)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("class_group", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_sessions", to="academics.classgroup")),
                ("lecturer", models.ForeignKey(limit_choices_to={"role": "lecturer"}, on_delete=django.db.models.deletion.PROTECT, related_name="attendance_sessions", to=settings.AUTH_USER_MODEL)),
                ("venue", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="attendance_sessions", to="academics.venue")),
            ],
            options={"ordering": ("-start_time",)},
        ),
    ]
