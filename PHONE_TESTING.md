# Phone testing with ngrok

The Vite development server proxies `/api` to Django. Only one HTTPS tunnel is needed.
This is temporary development access, not production hosting. Use strong account passwords,
keep the link private, and stop the tunnel after testing.

## One-time setup

Install the official agent: `winget install ngrok -s msstore`.
Open a new PowerShell terminal after installation if `ngrok` is not recognised.
Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
and configure it locally (do not paste your token into chat or commit it):

```powershell
ngrok config add-authtoken "YOUR_AUTHTOKEN"
```

## Start the services

Run each command in its own terminal, from the project root.

Django:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

React:

```powershell
cd frontend
npm.cmd run dev -- --host 127.0.0.1
```

ngrok (third terminal):

```powershell
ngrok http http://127.0.0.1:5173
```

Open the HTTPS Forwarding URL on your phone. If ngrok displays a warning page, choose
Visit Site. Allow camera and location permissions. Open the same HTTPS URL on the
lecturer device so the displayed QR links point to the public site, not localhost.

Keep the laptop online and all three processes running. Stop each with Ctrl+C when finished.
If you have a `frontend/.env` or `.env.local` with `VITE_API_BASE_URL`, set it to `/api`
and restart Vite. Do not use `http://localhost:8000/api` on a phone.

No Django wildcard allowed-host setting or second ngrok API tunnel is required:
Vite rewrites the upstream host to `127.0.0.1:8000`.
