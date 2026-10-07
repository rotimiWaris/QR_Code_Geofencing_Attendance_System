# Admin dashboard

`GET /api/dashboard/admin/` requires an authenticated admin. Students and lecturers receive 403; anonymous requests receive 401.

Optional `dayStart` and `dayEnd` must both be ISO timestamps spanning one day (23–25 hours to accommodate daylight saving). Without these parameters, today's UTC boundaries are used. The frontend supplies browser-local boundaries.

The response contains:

- `generatedAt`, `dayStart`, `dayEnd`: snapshot time and selected day.
- `summary`: active student/lecturer/course/class/venue totals, active enrollments, used/unused registration-token totals, currently live sessions, today's session count, attendance counts and rate.
- `trends`: seven daily attendance buckets ending on the selected day, including zero-activity days.
- `courseStats`: ended-session course totals over the same seven-day period, ordered by attendance rate ascending, with unrated courses last.
- `todaySessions`: sessions starting on the selected day, including course/class, lecturer, venue, times, effective status and verified/enrolled counts. No QR credentials are included.

Attendance is counted per student per session, not as unique daily students. Present and late are verified. Unmarked students remain pending until a session closes or reaches its end time; they then count as absent. Future sessions do not affect attendance totals. Rate is `(present + late) / (present + late + absent) * 100`; pending/excused are excluded and no eligible entries yields `null` rather than a fabricated rate.

Roster eligibility follows active class enrollments created before the session end, plus students with an existing record. Historical changes to enrollment status are not snapshotted by the current enrollment model.

The overview polls every 30 seconds and offers manual refresh, loading/error feedback and empty states. No database migration is needed.
