# Campus Presence backend

Django REST Framework API for the QR geofencing attendance project.

## Local setup

```powershell
cd "C:\Users\hp\Documents\PJ\QR Code Geofencing\backend"
Copy-Item .env.example .env
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_academics
.\.venv\Scripts\python.exe manage.py runserver
```

The API runs at `http://127.0.0.1:8000`. Swagger documentation is at `http://127.0.0.1:8000/api/docs/`.

The backend uses SQLite through `db.sqlite3`. SQLite is included with Python, so there is no database server, account, password, or connection configuration to manage.

## Authentication

- `POST /api/auth/login/` — body: `email`, `password`, optional `role`
- `POST /api/auth/token/refresh/` — body: `refresh`
- `POST /api/auth/logout/` — body: `refresh`
- `GET /api/auth/me/` — requires `Authorization: Bearer <access>`
- `POST /api/auth/change-password/` — body: `currentPassword`, `newPassword`
- `POST /api/auth/signup/` — public student/lecturer signup with a single-use token
- `GET/POST /api/auth/registration-tokens/` — admin-only token register and generation

`seed_academics` safely creates or updates the configured ND1, ND2, HND1, and HND2 courses, one class per course, six venues, and enrolls existing students into classes matching their level.

## Verification

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test
```
