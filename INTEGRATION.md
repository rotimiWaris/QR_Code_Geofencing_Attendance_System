# Integrated school-project workflow

All dashboard and application screens use Django APIs. No mock data is imported by the application pages or shared controls.

## Admin tabs

- Overview: institutional totals, seven-day trends, course rates, today's sessions and single-use signup tokens.
- People: real accounts, search by name/email/student or staff ID, role filtering, profile edits, deactivation/reactivation and password resets. New students/lecturers join using admin-issued signup tokens; administrators are created with Django's `createsuperuser` command. Roles and privilege flags cannot be changed through the account editor.
- Courses: create/edit/remove courses, level/semester/units, activation and lecturer assignment.
- Venues: create/edit/remove rooms, optional coordinate pairs, radius and capacity. Venue capture remains deferred; blank coordinates are supported.
- Classes: course, room, timetable text, capacity and academic period.
- Enrollments: assign matching-level students to classes, update active/dropped/completed status, or remove unused enrollments.
- Reports: institution-wide session reports, student roster and PDF/Excel downloads after the session closes or expires. Lecturers see only their own sessions.

All list tables support pagination and search that stays visible with no results. Forms show server validation errors. Destructive removal requires confirmation; courses/classes/venues with attendance history cannot be deleted. Enrollments with recorded attendance cannot be deleted; use the dropped status instead. Historical changes to enrollment status are not snapshotted by the current enrollment model.

## Lecturer and student integration

Student signup automatically creates missing enrollments in active classes belonging to active courses matching the student's ND1/ND2/HND1/HND2 level. This follows the seed data's level-based cohort rule. It uses currently active classes; administrators should deactivate past academic-period classes to exclude them. It does not automatically create classes for courses without one, and multiple active classes for the same course are all included under this cohort rule.

For existing students, run `.\.venv\Scripts\python.exe manage.py backfill_enrollments --dry-run` from `backend` to preview, then run the same command without `--dry-run`. Use `--student-number NUMBER` to target one student. Inactive accounts are skipped, and existing active/dropped/completed enrollments and their dates remain unchanged. New enrollments receive today's creation timestamp rather than a retroactive date. This command does not reseed or alter courses, classes, venues or lecturer assignments.

`GET /api/dashboard/lecturer/` returns the signed-in lecturer's complete assigned-course list and today's sessions, with browser-local day boundaries. The teaching dashboard polls every 15 seconds. Session management uses server-side search/pagination; course, class and venue selectors retrieve all pages instead of silently stopping at 50 entries.

The student dashboard uses `/api/dashboard/student/`; modules reflect active enrollments, class line shows available sessions, and registry supports course/venue/status search. Course module lists poll every 30 seconds. Mandatory QR verification still precedes GPS check-in and duplicate attendance remains blocked.

The shared profile screen shows real account details and supports authenticated password changes. The bell shows real session activity, not a fabricated unread-notification badge. Authentication automatically refreshes expired access tokens; invalid/revoked sessions require signing in again.

## Password recovery

Forgot Password and Reset Password are connected to Django's single-use reset-token flow. Reset requests are anonymous, throttled and return the same response for known/unknown accounts. Password resets and account deactivation revoke outstanding refresh tokens. Already-issued access tokens may remain valid until their normal expiry after a password reset.

For configuration-free local testing, Django prints reset emails to its server console. This does not deliver email to an inbox. Open the printed reset URL, or use the admin People password-reset action and share the password securely.

For phone testing, set `PUBLIC_FRONTEND_URL` in `backend/.env` to your current HTTPS ngrok URL so generated links point to the accessible site. For actual inbox delivery, configure `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, and `DEFAULT_FROM_EMAIL`. Do not commit credentials.

## Verification

From `backend`: `.\.venv\Scripts\python.exe manage.py test`.

From `frontend`: `node scripts/test-regressions.mjs`, `node scripts/test-admin-render.mjs`, and `npm.cmd run build`.

Manual acceptance check: invite/register a lecturer and student, add a course and assign the lecturer, add a venue and class, enroll the student, create attendance as the lecturer, check in as the student with QR + GPS, close the session, and download both report formats. Check desktop and phone layouts through the existing testing setup. Automated rendering checks are not a substitute for live browser/GPS testing.

No database migration is required for these integration changes. Restart Django and refresh the frontend after updating.

## New-session email announcements

When a lecturer creates a session through the API, each active student with an active enrollment in that session's class receives an individual plain-text/HTML email with course, class, lecturer, venue, start/end times and a student-dashboard link. Dropped/completed enrollments, inactive accounts and other classes are excluded. Updating or closing a session does not resend the announcement. QR credentials are never emailed, and the normal QR/GPS checks still apply.

Mail is attempted after the database commit, using one connection with separate messages to keep student addresses private. Delivery errors are logged without failing attendance creation; this school-project implementation is best-effort and has no automatic retry queue or delivery guarantee. For larger classes, move delivery into a background job.

The existing console email backend prints announcements to Django's terminal only. To receive actual inbox notifications, privately configure the SMTP fields listed above in `backend/.env`, set `DEFAULT_FROM_EMAIL` to a sender allowed by your provider, and restart Django. Set `PUBLIC_FRONTEND_URL` to the accessible site/ngrok URL. `ATTENDANCE_EMAIL_TIME_ZONE` defaults to `Africa/Lagos`; `EMAIL_TIMEOUT` defaults to 10 seconds per network operation.

Test announcement selection/failures with `.\.venv\Scripts\python.exe manage.py test academics.test_notifications`. Automated tests use an in-memory mail backend and do not send real emails.

The bell polls session notifications every 15 seconds, including future scheduled sessions for enrolled students. Its count reflects unseen session IDs, not a fabricated unread indicator. Clicking a notification or using "Mark all as read" clears the corresponding badges. Read state persists per account in this browser's local storage and synchronizes across its tabs, but not across different devices. A session's start-time status change does not create another notification for an already-read session. Emails are attempted only when a lecturer creates/schedules a session, never again automatically at its start time.
