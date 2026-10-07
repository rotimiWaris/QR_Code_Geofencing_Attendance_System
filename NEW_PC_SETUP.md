# Setting up the project on a new Windows PC

## Before moving to the new PC: publish the current folder

The current project copy does not contain Git repository metadata. On the
current PC, create an empty repository on GitHub (without adding a README), then
run these commands from the project root:

```powershell
git init
git add .
git status
git commit -m "Initial QR attendance system"
git branch -M main
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

Before committing, confirm that `backend/.env`, `backend/db.sqlite3`, `.venv`,
`node_modules`, `dist`, `PROJECT_SOURCE_CODE`, and the generated ZIP are absent
from `git status`. The `.env.example` files should be present.

## 1. Install the required software

Install:

- Git
- Python (include Python in `PATH` during installation)
- Node.js with npm

Confirm that PowerShell can find them:

```powershell
git --version
python --version
node --version
npm --version
```

## 2. Get the project

Clone the repository and enter it:

```powershell
git clone YOUR_REPOSITORY_URL
cd "QR Code Geofencing"
```

If the project was transferred as a ZIP instead, extract it and open PowerShell
in the extracted project directory.

## 3. Configure and prepare Django

```powershell
cd backend
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py seed_academics
python manage.py createsuperuser
python manage.py check
```

The copied `.env` is suitable for local development and console email. To send
real email, privately add the Brevo SMTP login, SMTP key, verified sender, and
SMTP backend settings to `backend/.env`. Never commit that file.

Start Django from the `backend` directory:

```powershell
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

## 4. Configure and prepare React

Open a second PowerShell terminal in the project directory:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173` in a browser. Vite proxies `/api` requests to the
Django server on port 8000.

## 5. Sign in and prepare application data

1. Sign in with the Django superuser created above.
2. Generate student and lecturer registration tokens from the admin dashboard.
3. Register lecturer and student accounts with those tokens.
4. Assign courses to lecturers and confirm student enrolments.
5. Create venues and save accurate venue coordinates before attendance tests.

The `seed_academics` command supplies the configured courses, class groups, and
venues. Running it again is safe.

## 6. Optional phone testing with ngrok

After configuring ngrok, keep Django and Vite running, then start:

```powershell
ngrok http http://127.0.0.1:5173
```

Open the HTTPS ngrok URL on the phone. Allow camera and precise-location access.
See `PHONE_TESTING.md` for the complete testing notes.

## Existing data versus a fresh installation

`backend/db.sqlite3` is intentionally ignored by Git because it contains local
users and application data. A normal clone therefore starts with a new database
after `migrate`. If existing records are required on the new PC, transfer the
database separately and securely while both Django servers are stopped.
