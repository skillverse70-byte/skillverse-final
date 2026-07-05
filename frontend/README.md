# Skill Verse Frontend

This project now runs as a standalone Vite + React frontend with a built-in local demo data client.

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

Create or update `.env` in the project root with:

```bash
VITE_APP_STORAGE_KEY=skillverse-local
VITE_APP_ID=skillverse-local
VITE_APP_BASE_URL=http://localhost:5173
VITE_FUNCTIONS_VERSION=local
VITE_DEMO_AUTO_LOGIN=true
VITE_DEMO_EMAIL=demo@skillverse.local
VITE_DEMO_PASSWORD=SkillVerse123!
VITE_DEMO_OTP=123456
```

## Notes

- Authentication, CRUD actions, and uploads are handled by the local mock client in `src/api/appClient.js`.
- Existing logo/image assets under `public/logo` are still used by the UI.
- Demo login is enabled by default through the `.env` values above.
