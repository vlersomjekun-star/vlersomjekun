// Sesion admin me cookie të firmosur HMAC-SHA256 (Web Crypto — funksionon edhe në middleware/edge).
// Format: email|expiryMs|signatureHex

const COOKIE_NAME = "vm_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 orë

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET mungon në env");
  return s;
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(email: string): Promise<string> {
  const expiry = Date.now() + SESSION_TTL_MS;
  const payload = `${email}|${expiry}`;
  return `${payload}|${await hmac(payload)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const parts = token.split("|");
  if (parts.length !== 3) return null;
  const [email, expiry, sig] = parts;
  if (Number(expiry) < Date.now()) return null;
  const expected = await hmac(`${email}|${expiry}`);
  if (sig.length !== expected.length) return null;
  // krahasim me kohë konstante
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? email : null;
}

export const ADMIN_COOKIE = COOKIE_NAME;
