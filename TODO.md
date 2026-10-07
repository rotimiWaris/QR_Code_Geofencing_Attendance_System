## Backend milestones

- [x] Django setup with configuration-free SQLite database
- [x] Custom users and JWT authentication
- [x] Admin-issued, single-use student and lecturer signup tokens
- [x] Courses, class groups, venues, and enrollments
  - [x] Signup automatically enrolls students in active level-matched classes; safe, repeatable backfill preserves existing statuses
- [x] Admin course-to-lecturer assignment
- [x] Attendance sessions and secure QR tokens
- [x] Geofence check-in and duplicate prevention
- [x] Automatic enrolled-session visibility with mandatory QR scanning before GPS check-in
- [x] Dashboard APIs
  - [x] Student presence standing and today's class-line sessions
  - [x] Admin institutional totals, seven-day trends, course rates, and today's sessions (real data, admin-only)
  - [x] Lecturer assigned modules and complete browser-local teaching schedule
- [x] Lecturer session reports with student information and PDF/Excel exports after session ends
- [x] Frontend integration
  - [x] Admin People: real account directory, profile edits, activation, secure password resets, signup-token invitations
  - [x] Admin Courses, Venues, Classes and Enrollments: connected CRUD/status forms, search and pagination
  - [x] Admin session reports with PDF/Excel exports locked until attendance ends
  - [x] Lecturer/student modules, sessions, dashboards, registry and mandatory QR + GPS check-in
  - [x] Shared profile/password changes, real session activity and persistent JWT refresh
  - [x] Password recovery/reset flow (console email locally; SMTP needed for inbox delivery)
  - [x] Backend permission/workflow tests, frontend rendering/regression checks and production/PWA build
- [x] Email active enrolled students after lecturer session creation (private messages, commit-safe, console/SMTP backend)

See [INTEGRATION.md](INTEGRATION.md) for the workflow, testing commands and email setup notes. Venue capture remains deferred for on-site testing.
