type AuthorityPayload = {
  message: string;
  contacts: Array<{ id: string; name: string; phone?: string; email?: string }>;
  meta?: Record<string, any>;
};

// "Authority" dispatch in South Africa is not centralized via a public API.
// The practical, real-world approach is to integrate with a dispatch network/provider.
// This implementation supports:
//  - AUTHORITY_WEBHOOK_URL: POST JSON to a provider (e.g., AURA / private security / monitoring room)
//  - AUTHORITY_WEBHOOK_TOKEN: optional Bearer token
//  - AUTHORITY_WEBHOOK_TIMEOUT_MS: optional

export async function dispatchAuthorityIfConfigured(payload: AuthorityPayload): Promise<
  | { enabled: false }
  | { enabled: true; ok: true; status: number }
  | { enabled: true; ok: false; error: string }
> {
  const url = process.env.AUTHORITY_WEBHOOK_URL;
  if (!url) return { enabled: false };

  const token = process.env.AUTHORITY_WEBHOOK_TOKEN;
  const timeoutMs = Number(process.env.AUTHORITY_WEBHOOK_TIMEOUT_MS || 5000);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return { enabled: true, ok: false, error: `HTTP_${r.status}${text ? `:${text.slice(0, 200)}` : ''}` };
    }
    return { enabled: true, ok: true, status: r.status };
  } catch (e: any) {
    clearTimeout(t);
    return { enabled: true, ok: false, error: e?.name === 'AbortError' ? 'TIMEOUT' : e?.message || 'FAILED' };
  }
}
