const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const DIGEST = 'SHA-256';

export async function hashPassword(
  password: string,
  saltBase64: string
): Promise<string> {
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: DIGEST },
    keyMaterial,
    KEY_LENGTH * 8
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export async function verifyPassword(
  password: string,
  saltBase64: string,
  expectedHashBase64: string
): Promise<boolean> {
  try {
    const actual = await hashPassword(password, saltBase64);
    const actualBytes = Uint8Array.from(atob(actual), (c) => c.charCodeAt(0));
    const expectedBytes = Uint8Array.from(atob(expectedHashBase64), (c) =>
      c.charCodeAt(0)
    );
    if (actualBytes.length !== expectedBytes.length) return false;
    // constant-time comparison
    let diff = 0;
    for (let i = 0; i < actualBytes.length; i++) {
      diff |= actualBytes[i] ^ expectedBytes[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}
