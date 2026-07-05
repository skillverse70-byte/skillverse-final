# Skill Verse Frontend

This project now runs as a standalone Vite + React frontend with a built-in local demo data client.
It is also wired to grow toward the Django backend contract defined in the root `schema.yaml`.

## Prerequisites

1. Clone the repository using the project's Git URL.
2. Navigate to the project directory.
3. Install dependencies: `npm install`.

## Run Locally

Start the frontend from the project root:

```bash
npm run dev
```

Open the local URL printed by Vite. The app uses local browser storage plus seeded demo data, so no external backend is required.

## Environment

Create or update `.env` in the frontend root with:

```bash
VITE_APP_MODE=local-demo
VITE_APP_STORAGE_KEY=skillverse-local
VITE_APP_ID=skillverse-local
VITE_API_BASE_URL=http://localhost:8000
VITE_API_BASE_PATH=/api
VITE_WS_BASE_URL=ws://localhost:8000
VITE_WS_HEARTBEAT_MESSAGE=ping
VITE_MAX_UPLOAD_MB=25
VITE_DEMO_AUTO_LOGIN=true
VITE_DEMO_EMAIL=demo@skillverse.local
VITE_DEMO_PASSWORD=SkillVerse123!
VITE_DEMO_OTP=123456
```

## Notes

- `VITE_APP_MODE=local-demo` keeps the app on the built-in demo client today.
- Future backend-connected work should build against the root `schema.yaml` and use the shared runtime config in `src/lib/runtime-config.js`.
- Authentication, CRUD actions, and uploads are currently handled by the local mock client exposed through `src/api/appClient.js`.
- Existing logo/image assets under `public/logo` are still used by the UI.
- Demo login is enabled by default through the `.env` values above.
