import nodemailer from 'nodemailer';
import { requireEnv } from './env';

// Supports any SMTP provider (Gmail App Password, SendGrid SMTP, Mailgun SMTP, etc.)
const host = process.env.SMTP_HOST;

export const mailer = host
  ? nodemailer.createTransport({
      host: requireEnv('SMTP_HOST'),
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
      auth: {
        user: requireEnv('SMTP_USER'),
        pass: requireEnv('SMTP_PASS'),
      },
    })
  : null;

export async function sendEmail(to: string, subject: string, text: string) {
  if (!mailer) {
    throw new Error('SMTP not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS.');
  }
  const from = process.env.EMAIL_FROM || requireEnv('SMTP_USER');
  await mailer.sendMail({ from, to, subject, text });
}
