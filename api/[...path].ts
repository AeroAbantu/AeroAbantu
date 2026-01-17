import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app, ensureBootstrapped } from '../server/app';

// Ensure DB migrations run once per warm serverless container.
let ready: Promise<void> | null = null;
function ensureReady() {
  if (!ready) ready = ensureBootstrapped();
  return ready;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureReady();
  // Express apps are valid (req, res) handlers.
  return (app as any)(req, res);
}
