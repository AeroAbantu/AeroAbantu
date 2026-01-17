# AeroBantu: Code Context for Google AI Studio

This repository is a **Vite + React** front-end with a **Node/Express** backend deployed via **Vercel Serverless Functions**.
The UI and visual design are unchanged; only simulated logic was replaced with real implementations.

## How the API is deployed on Vercel

- The Express app is defined in `server/app.ts` and exports `app` and `ensureBootstrapped()`.
- Vercel routes all requests under `/api/*` to the catch-all function `api/[...path].ts`.
- On cold start, `ensureBootstrapped()` runs the Postgres migrations once per warm container.

## Database (Postgres)

Tables are created idempotently on startup in `server/db.ts`:
- `users` (auth + profile)
- `codes` (verify/mfa/recovery 6-digit codes)
- `tracking_latest` (latest location per session code; survives restarts)

## Key API endpoints

Auth:
- `POST /api/auth/register` { username, password, email }
- `POST /api/auth/verify` { username, code }
- `POST /api/auth/login` { username, password } -> returns MFA step
- `POST /api/auth/mfa` { username, code } -> returns JWT + user
- `POST /api/auth/recovery/start` { username }
- `POST /api/auth/recovery/verify` { username, code }
- `POST /api/auth/recovery/reset` { username, code, newPassword }

User profile:
- `PUT /api/user/profile` (Bearer JWT)

Dispatch:
- `POST /api/dispatch/alert` (Bearer JWT)
  - Sends SMS via Twilio (if configured)
  - Sends email via SMTP (if configured)
  - Optionally forwards the alert to an authority/monitoring-room webhook (if configured)

Live tracking:
- `POST /api/tracking/update` { sessionId, lat, lng, accuracy, speedKmh, battery?, network? }
- `GET /api/tracking/:sessionId`

Health:
- `GET /api/health`

## Environment variables

See `.env.example` for all variables. Required:
- `JWT_SECRET`
- `DATABASE_URL`
Optional:
- SMTP vars (email)
- Twilio vars (SMS)
- Authority webhook vars

