/**
 * Usage: pnpm gen-hash
 * Then register the output via:
 *   wrangler secret put ADMIN_PASSWORD_HASH
 *   wrangler secret put ADMIN_PASSWORD_SALT
 */
import * as readline from "node:readline";

const ITERATIONS = 100_000;
const KEY_LENGTH = 32;

async function main() {
  // prompt → stderr so it always appears even when pnpm wraps stdout
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  const password = await new Promise<string>((resolve) => {
    rl.question("Enter admin password: ", (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });

  if (!password) {
    process.stderr.write("Error: Password cannot be empty\n");
    process.exit(1);
  }

  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltBase64 = btoa(String.fromCharCode(...saltBytes));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH * 8,
  );
  const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(bits)));

  console.log("\n--- Copy the following values ---");
  console.log(`ADMIN_PASSWORD_SALT=${saltBase64}`);
  console.log(`ADMIN_PASSWORD_HASH=${hashBase64}`);
  console.log("\nRegister via:");
  console.log("  wrangler secret put ADMIN_PASSWORD_SALT");
  console.log("  wrangler secret put ADMIN_PASSWORD_HASH");
}

main().catch((e) => {
  process.stderr.write(`Error: ${e}\n`);
  process.exit(1);
});
