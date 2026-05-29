import { cookies } from 'next/headers';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const VOTE_TOKEN_COOKIE_NAME = 'vote_token';
const VOTE_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function getCloudflareEnv() {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

function createRandomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export async function getVoteToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(VOTE_TOKEN_COOKIE_NAME)?.value;
}

export async function getOrCreateVoteToken(): Promise<string> {
  const existingToken = await getVoteToken();
  if (existingToken) {
    return existingToken;
  }

  const env = await getCloudflareEnv();
  const token = createRandomToken();

  const cookieStore = await cookies();
  cookieStore.set(VOTE_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.APP_ENV === 'production',
    sameSite: 'lax',
    maxAge: VOTE_TOKEN_MAX_AGE,
    path: '/',
  });

  return token;
}
