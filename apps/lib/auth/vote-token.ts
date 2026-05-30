import { cookies } from 'next/headers';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const VOTE_TOKEN_COOKIE_NAME = 'vote_token';
const VOTE_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function createRandomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
}

export async function getVoteToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(VOTE_TOKEN_COOKIE_NAME)?.value;
}

export async function getOrCreateVoteToken(): Promise<string> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(VOTE_TOKEN_COOKIE_NAME)?.value;
  if (existingToken) {
    return existingToken;
  }

  const { env } = await getCloudflareContext({ async: true });
  const token = createRandomToken();

  cookieStore.set(VOTE_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.APP_ENV === 'production',
    sameSite: 'lax',
    maxAge: VOTE_TOKEN_MAX_AGE,
    path: '/',
  });

  return token;
}

export async function hashVoteToken(token: string): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  const secret = env.VOTE_TOKEN_SECRET ?? '';
  if (!secret) {
    throw new Error('VOTE_TOKEN_SECRET is not configured');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(token)
  );
  return encodeBase64Url(new Uint8Array(signature));
}

export async function getOrCreateVoteTokenHash(): Promise<string> {
  const token = await getOrCreateVoteToken();
  return hashVoteToken(token);
}
