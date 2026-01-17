import Twilio from 'twilio';

let client: ReturnType<typeof Twilio> | null = null;

function getClient() {
  if (client) return client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  client = Twilio(sid, token);
  return client;
}

export async function sendSms(to: string, body: string) {
  const c = getClient();
  if (!c) {
    throw new Error('Twilio not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) {
    throw new Error('Missing TWILIO_FROM_NUMBER.');
  }
  await c.messages.create({ from, to, body });
}
