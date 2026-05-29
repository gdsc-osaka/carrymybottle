import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24h

async function getCloudflareEnv() {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verify(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  return crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    new TextEncoder().encode(payload)
  );
}

export async function createSession(): Promise<void> {
  const env = await getCloudflareEnv();
  const secret = env.SESSION_SECRET ?? '';
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }
  const payload = JSON.stringify({
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
  });
  const encoded = btoa(payload);
  const signature = await sign(encoded, secret);
  const token = `${encoded}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.APP_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function verifySession(): Promise<boolean> {
  const env = await getCloudflareEnv();
  const secret = env.SESSION_SECRET ?? '';
  if (!secret) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [encoded, signature] = parts;

  const valid = await verify(encoded, signature, secret).catch(() => false);
  if (!valid) return false;

  try {
    const payload = JSON.parse(atob(encoded)) as { role: string; iat: number };
    if (payload.role !== 'admin') return false;
    if (Math.floor(Date.now() / 1000) - payload.iat > SESSION_MAX_AGE)
      return false;
    return true;
  } catch {
    return false;
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireAdminSession(): Promise<void> {
  const valid = await verifySession();
  if (!valid) {
    redirect('/admin/login');
  }
}
