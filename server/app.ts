import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { migrate, pool, DbUser } from './db';
import { sendEmail } from './mailer';
import { sendSms } from './sms';
import { dispatchAuthorityIfConfigured } from './authority';
import './env';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

function now() {
  return Date.now();
}

function gen6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function tacticalId() {
  return `RSA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function issueToken(u: DbUser) {
  return jwt.sign(
    {
      sub: u.id,
      username: u.username,
      tacticalId: u.tactical_id,
    },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = String(req.headers.authorization || '');
  const m = auth.match(/^Bearer\s+(.*)$/i);
  if (!m) return res.status(401).json({ error: 'UNAUTHORIZED' });
  try {
    (req as any).user = jwt.verify(m[1], JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}

async function getUserByUsername(username: string): Promise<DbUser | undefined> {
  const r = await pool.query('SELECT * FROM users WHERE username = $1 LIMIT 1', [username.toLowerCase()]);
  const row = r.rows[0] as any;
  if (!row) return undefined;
  return {
    id: Number(row.id),
    username: String(row.username),
    email: String(row.email),
    password_hash: String(row.password_hash),
    verified: Boolean(row.verified),
    tactical_id: String(row.tactical_id),
    full_name: row.full_name ?? null,
    blood_type: row.blood_type ?? null,
    emergency_note: row.emergency_note ?? null,
    created_at: Number(row.created_at),
  } satisfies DbUser;
}

async function createCode(userId: number, kind: 'verify' | 'mfa' | 'recovery') {
  const code = gen6();
  const expires = now() + 5 * 60 * 1000; // 5 minutes
  await pool.query(
    'INSERT INTO codes (user_id, kind, code, expires_at, consumed, created_at) VALUES ($1, $2, $3, $4, false, $5)',
    [userId, kind, code, expires, now()],
  );
  return { code, expiresAt: expires };
}

async function consumeCode(userId: number, kind: 'verify' | 'mfa' | 'recovery', code: string) {
  const row = (
    await pool.query(
      'SELECT * FROM codes WHERE user_id = $1 AND kind = $2 AND code = $3 AND consumed = false ORDER BY id DESC LIMIT 1',
      [userId, kind, code],
    )
  ).rows[0] as any;
  if (!row) return { ok: false as const, reason: 'NOT_FOUND' as const };
  if (row.expires_at < now()) return { ok: false as const, reason: 'EXPIRED' as const };
  await pool.query('UPDATE codes SET consumed = true WHERE id = $1', [row.id]);
  return { ok: true as const };
}

const usernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_\-]+$/);

// --- AUTH ---

app.post('/api/auth/register', async (req, res) => {
  const body = z
    .object({
      username: usernameSchema,
      password: z.string().min(6),
      email: z.string().email(),
    })
    .safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const username = body.data.username.toLowerCase();

  const existing = await getUserByUsername(username);
  if (existing) return res.status(409).json({ error: 'USERNAME_TAKEN' });

  const hash = await bcrypt.hash(body.data.password, 12);
  const tId = tacticalId();
  const createdAt = now();

  const inserted = await pool.query(
    'INSERT INTO users (username, email, password_hash, verified, tactical_id, created_at) VALUES ($1, $2, $3, false, $4, $5) RETURNING id',
    [username, body.data.email, hash, tId, createdAt],
  );

  const userId = Number(inserted.rows[0]?.id);
  const { code } = await createCode(userId, 'verify');

  try {
    await sendEmail(body.data.email, 'AeroBantu Verification Code', `Your AeroBantu verification code is: ${code}`);
  } catch (e) {
    // Keep account created; user can retry verification later.
    console.error('EMAIL_SEND_FAILED', e);
  }

  return res.json({ ok: true, preview: `VERIFICATION TOKEN DISPATCHED\nNode Alias: ${username}\nAccess Token: ${code}` });
});

app.post('/api/auth/verify', async (req, res) => {
  const body = z
    .object({ username: usernameSchema, code: z.string().length(6) })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const username = body.data.username.toLowerCase();
  const u = await getUserByUsername(username);
  if (!u) return res.status(404).json({ error: 'NOT_FOUND' });

  const consumed = await consumeCode(u.id, 'verify', body.data.code);
  if (!consumed.ok) return res.status(401).json({ error: consumed.reason });

  await pool.query('UPDATE users SET verified = true WHERE id = $1', [u.id]);
  return res.json({ ok: true, preview: `WELCOME TO AEROBANTU\nNode Alias: ${username}\nTactical ID: ${u.tactical_id}\nStatus: GRID LINK ACTIVE` });
});

app.post('/api/auth/login', async (req, res) => {
  const body = z
    .object({ username: usernameSchema, password: z.string().min(1) })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const username = body.data.username.toLowerCase();
  const u = await getUserByUsername(username);
  if (!u) return res.status(404).json({ error: 'NOT_FOUND' });
  if (!u.verified) return res.status(403).json({ error: 'UNVERIFIED' });

  const ok = await bcrypt.compare(body.data.password, u.password_hash);
  if (!ok) return res.status(401).json({ error: 'BAD_PASSWORD' });

  const { code } = await createCode(u.id, 'mfa');
  try {
    await sendEmail(u.email, 'AeroBantu MFA Code', `Your AeroBantu MFA code is: ${code}`);
  } catch (e) {
    console.error('EMAIL_SEND_FAILED', e);
  }
  return res.json({ ok: true, requiresMfa: true, preview: `MFA UPLINK REQUIRED\nNode Alias: ${username}\nMFA Token: ${code}\nEnter within 300s.` });
});

app.post('/api/auth/mfa', async (req, res) => {
  const body = z
    .object({ username: usernameSchema, code: z.string().length(6) })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const username = body.data.username.toLowerCase();
  const u = await getUserByUsername(username);
  if (!u) return res.status(404).json({ error: 'NOT_FOUND' });

  const consumed = await consumeCode(u.id, 'mfa', body.data.code);
  if (!consumed.ok) return res.status(401).json({ error: consumed.reason });

  const token = issueToken(u);
  return res.json({
    ok: true,
    token,
    user: {
      username: u.username,
      tacticalId: u.tactical_id,
      email: u.email,
      fullName: u.full_name || '',
      bloodType: u.blood_type || 'N/A',
      emergencyNote: u.emergency_note || '',
    },
  });
});

app.post('/api/auth/recovery/start', async (req, res) => {
  const body = z.object({ username: usernameSchema }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const username = body.data.username.toLowerCase();
  const u = await getUserByUsername(username);
  if (!u) return res.status(404).json({ error: 'NOT_FOUND' });

  const { code } = await createCode(u.id, 'recovery');
  sendEmail(u.email, 'AeroBantu Recovery Code', `Your AeroBantu password reset code is: ${code}`).catch((e) =>
    console.error('EMAIL_SEND_FAILED', e),
  );
  return res.json({ ok: true, preview: `SECURITY OVERRIDE\nTarget: ${username}\nReset Token: ${code}` });
});

app.post('/api/auth/recovery/verify', async (req, res) => {
  const body = z
    .object({ username: usernameSchema, code: z.string().length(6) })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const username = body.data.username.toLowerCase();
  const u = await getUserByUsername(username);
  if (!u) return res.status(404).json({ error: 'NOT_FOUND' });
  const consumed = await consumeCode(u.id, 'recovery', body.data.code);
  if (!consumed.ok) return res.status(401).json({ error: consumed.reason });

  // short-lived reset token
  const resetToken = jwt.sign({ sub: u.id, kind: 'reset' }, JWT_SECRET, { expiresIn: '10m' });
  return res.json({ ok: true, resetToken });
});

app.post('/api/auth/recovery/reset', async (req, res) => {
  const body = z
    .object({ resetToken: z.string(), newPassword: z.string().min(6) })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  let decoded: any;
  try {
    decoded = jwt.verify(body.data.resetToken, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'BAD_TOKEN' });
  }
  if (decoded.kind !== 'reset') return res.status(401).json({ error: 'BAD_TOKEN' });

  const hash = await bcrypt.hash(body.data.newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, decoded.sub]);
  return res.json({ ok: true });
});

// --- EMERGENCY DISPATCH ---

app.post('/api/dispatch/alert', async (req, res) => {
  const body = z
    .object({
      message: z.string().min(1).max(2000),
      contacts: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            phone: z.string().optional(),
            email: z.string().optional(),
          }),
        )
        .min(1),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const results: Array<{ id: string; type: 'SMS' | 'EMAIL'; ok: boolean; error?: string }> = [];

  for (const c of body.data.contacts) {
    if (c.phone && c.phone.trim()) {
      try {
        await sendSms(c.phone.trim(), body.data.message);
        results.push({ id: c.id, type: 'SMS', ok: true });
      } catch (e: any) {
        results.push({ id: c.id, type: 'SMS', ok: false, error: e?.message || 'SEND_FAILED' });
      }
    }
    if (c.email && c.email.trim()) {
      try {
        await sendEmail(c.email.trim(), 'AeroBantu SOS Alert', body.data.message);
        results.push({ id: c.id, type: 'EMAIL', ok: true });
      } catch (e: any) {
        results.push({ id: c.id, type: 'EMAIL', ok: false, error: e?.message || 'SEND_FAILED' });
      }
    }
  }

  // Optional "authority" dispatch via provider webhook (configured server-side only).
  // This keeps UI unchanged; enable by setting AUTHORITY_WEBHOOK_URL.
  const authority = await dispatchAuthorityIfConfigured({
    message: body.data.message,
    contacts: body.data.contacts,
    meta: { ts: now() },
  });

  return res.json({ ok: true, results, authority });
});

// --- USER PROFILE ---

app.put('/api/user/profile', requireAuth, (req, res) => {
  const body = z
    .object({
      fullName: z.string().max(120).optional(),
      bloodType: z.string().max(8).optional(),
      emergencyNote: z.string().max(2000).optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const userId = Number((req as any).user?.sub);
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

  pool
    .query('UPDATE users SET full_name = $1, blood_type = $2, emergency_note = $3 WHERE id = $4', [
      body.data.fullName ?? null,
      body.data.bloodType ?? null,
      body.data.emergencyNote ?? null,
      userId,
    ])
    .then(() => res.json({ ok: true }))
    .catch((e) => {
      console.error('PROFILE_UPDATE_FAILED', e);
      res.status(500).json({ error: 'SERVER_ERROR' });
    });
});

// --- LIVE TRACKING (persistent latest-location store) ---

type TrackRow = {
  sessionId: string;
  lat: number;
  lng: number;
  accuracy: number;
  speedKmh: number;
  battery: number | null;
  network: string | null;
  createdAt: number;
  updatedAt: number;
};

const TRACKING_TTL_MS = Number(process.env.TRACKING_TTL_MS || 24 * 60 * 60 * 1000); // default 24h

async function cleanupTracking() {
  const cutoff = now() - TRACKING_TTL_MS;
  await pool.query('DELETE FROM tracking_latest WHERE updated_at < $1', [cutoff]);
}

app.post('/api/tracking/update', async (req, res) => {
  const body = z
    .object({
      sessionId: z.string().min(4).max(32),
      lat: z.number(),
      lng: z.number(),
      accuracy: z.number(),
      speedKmh: z.number(),
      battery: z.number().nullable().optional(),
      network: z.string().nullable().optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const sessionId = body.data.sessionId.toUpperCase();
  const ts = now();

  await pool.query(
    `INSERT INTO tracking_latest (session_id, lat, lng, accuracy, speed_kmh, battery, network, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     ON CONFLICT (session_id) DO UPDATE SET
       lat = EXCLUDED.lat,
       lng = EXCLUDED.lng,
       accuracy = EXCLUDED.accuracy,
       speed_kmh = EXCLUDED.speed_kmh,
       battery = EXCLUDED.battery,
       network = EXCLUDED.network,
       updated_at = EXCLUDED.updated_at`,
    [
      sessionId,
      body.data.lat,
      body.data.lng,
      body.data.accuracy,
      body.data.speedKmh,
      body.data.battery ?? null,
      body.data.network ?? null,
      ts,
    ],
  );

  // best-effort cleanup (keeps DB lean). In production you'd run this as a cron.
  if (Math.random() < 0.02) cleanupTracking().catch(() => undefined);

  return res.json({ ok: true });
});

app.get('/api/tracking/:sessionId', async (req, res) => {
  const id = String(req.params.sessionId || '').toUpperCase();
  const r = await pool.query('SELECT * FROM tracking_latest WHERE session_id = $1 LIMIT 1', [id]);
  const row = r.rows[0];
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' });

  const data: TrackRow = {
    sessionId: row.session_id,
    lat: Number(row.lat),
    lng: Number(row.lng),
    accuracy: Number(row.accuracy),
    speedKmh: Number(row.speed_kmh),
    battery: row.battery === null ? null : Number(row.battery),
    network: row.network ?? null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };

  if (data.updatedAt < now() - TRACKING_TTL_MS) return res.status(404).json({ error: 'NOT_FOUND' });
  return res.json({ ok: true, data });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- BOOTSTRAP ---
// Vercel serverless functions may cold start multiple times. We keep a single
// bootstrap promise per instance so migrations run once per warm container.
let boot: Promise<void> | null = null;

export function ensureBootstrapped() {
  if (!boot) {
    boot = (async () => {
      await migrate();
      // No setInterval() here: serverless functions can freeze between requests.
      // Cleanup happens opportunistically in request handlers.
    })();
  }
  return boot;
}

export { app };
