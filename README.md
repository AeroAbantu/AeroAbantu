<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ig0dOkDXj_-oCI8BAfOJnlzQDyECgjDL

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Make it real (Auth + SMS/Email)

This repo now includes a small local backend in `server/`.

1) Create a `.env` file (for the backend) and set at least:

```
JWT_SECRET=change-me
DATABASE_URL=postgres://postgres:postgres@localhost:5432/aerobantu
# If your managed Postgres requires TLS:
# PGSSL=1
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=AeroBantu <no-reply@example.com>

TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+27...

# Optional: "Authority" dispatch integration (provider webhook)
# In SA there is no single public SAPS/EMS dispatch API, so this is how you connect to a dispatch provider
# (e.g. AURA / private security / monitoring room) without changing the UI.
# AUTHORITY_WEBHOOK_URL=https://... (provider endpoint)
# AUTHORITY_WEBHOOK_TOKEN=...      (optional bearer token)
# AUTHORITY_WEBHOOK_TIMEOUT_MS=5000

# Optional: tracking retention (ms)
# TRACKING_TTL_MS=86400000
```

2) Run both frontend + backend:

```
npm run dev:full
```

The frontend proxies `/api/*` to the backend on `http://localhost:3001` during development.

### Local Postgres (recommended)

If you want a one-command local database, add Postgres via Docker:

```bash
docker run --name aerobantu-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=aerobantu \
  -p 5432:5432 \
  -d postgres:16
```

Then use the `DATABASE_URL` shown above.

## Deploy to Vercel (no UI changes)

This repo is already structured for Vercel:

- Frontend builds to `dist/` with `npm run build`.
- Backend routes are served by a Vercel Serverless Function at `api/[...path].ts`.
- `vercel.json` configures SPA rewrites so React Router works on refresh.

### Steps

1) Push this repo to GitHub.
2) In Vercel: **New Project** -> import the repo.
3) Set Environment Variables in Vercel (Project Settings):
   - `JWT_SECRET`
   - `DATABASE_URL`
   - If required by your DB provider: `PGSSL=1`
   - Optional: SMTP + Twilio + Authority webhook vars (see `.env.example`).
4) Deploy.

After deploy, the app will call the backend via same-origin `/api/*`.
