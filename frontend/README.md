# QR Code Geofencing Attendance System

A complete, modern React frontend for a university attendance system using QR codes and GPS geofencing.

## Tech Stack

- React 18 + Vite
- TypeScript
- Tailwind CSS
- React Router
- TanStack Query
- React Hook Form + Zod
- Recharts
- Axios
- PWA-ready (vite-plugin-pwa)

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@university.edu | any |
| Lecturer | dr.smith@university.edu | any |
| Student | alice.brown@student.university.edu | any |

## Project Structure

```
src/
  api/           # API client and endpoints
  components/    # Reusable components
    common/      # GlassCard, Button, DataTable, Modal, etc.
    layout/      # AppShell, Sidebar, TopBar, MobileNavigation
    attendance/  # QRDisplay, CountdownTimer, GeofenceIndicator, etc.
    forms/       # FormInput, FormSelect, PasswordField
    dashboard/   # Dashboard-specific components
  contexts/      # AuthContext, ToastContext, ThemeContext
  mocks/         # Mock data and API handlers
  pages/         # Page components by role
    auth/        # Landing, Login, ForgotPassword, 404
    admin/       # Dashboard, Users, Courses, Venues
    lecturer/    # Dashboard, Courses, Sessions
    student/     # Dashboard, Courses, CheckIn, History
  schemas/       # Zod validation schemas
  types/         # TypeScript interfaces
  utils/         # Utility functions
```

## Environment Variables

Copy `.env.example` to `.env`:

```
VITE_API_BASE_URL=http://localhost:8000/api
```

## Build

```bash
npm run build
```

## Integration with Django

All API calls currently use mock handlers. To connect to Django REST Framework:

1. Implement the backend endpoints defined in `src/api/endpoints.ts`
2. Replace mock handler imports with real API calls
3. The auth layer already supports Django Token Authentication
4. All TypeScript interfaces match typical DRF response shapes

## Features

- **Dark glossy theme** with glassmorphism design
- **Role-based routing** (Admin, Lecturer, Student)
- **Responsive design** from 360px mobile to large desktop
- **QR Code display** with rotating tokens and fullscreen mode
- **Geofence verification** with distance calculation and GPS accuracy
- **Real-time charts** using Recharts
- **Data tables** with search, sorting, pagination
- **Form validation** with React Hook Form + Zod
- **Toast notifications** and confirmation dialogs
- **PWA ready** with service worker support
