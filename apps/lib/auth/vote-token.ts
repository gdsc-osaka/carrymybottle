import { cookies } from 'next/headers';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ResultAsync, errAsync } from 'neverthrow';

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

export function hashVoteToken(token: string): ResultAsync<string, Error> {
  return ResultAsync.fromPromise(
    getCloudflareContext({ async: true }),
    (error) => new Error(`failed to load Cloudflare context: ${String(error)}`)
  ).andThen(({ env }) => {
    const secret = env.VOTE_TOKEN_SECRET;
    if (!secret) {
      return errAsync(new Error('VOTE_TOKEN_SECRET is not configured'));
    }

    const encoder = new TextEncoder();
    return ResultAsync.fromPromise(
      crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ),
      (error) => new Error(`failed to import HMAC key: ${String(error)}`)
    ).andThen((key) =>
      ResultAsync.fromPromise(
        crypto.subtle.sign('HMAC', key, encoder.encode(token)),
        (error) => new Error(`failed to sign vote token: ${String(error)}`)
      ).map((signature) => encodeBase64Url(new Uint8Array(signature)))
    );
  });
}

export function getOrCreateVoteTokenHash(): ResultAsync<string, Error> {
  return ResultAsync.fromPromise(
    getOrCreateVoteToken(),
    (error) => new Error(`failed to get or create vote token: ${String(error)}`)
  ).andThen((token) => hashVoteToken(token));
}
