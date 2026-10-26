export const SESSION_COOKIE = "samai_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

export interface Session {
  role: "viewer";
  expiresAt: number;
}

const encoder = new TextEncoder();
const DEV_SECRET = "samai-dev-only-session-secret";

let cachedKey: Promise<CryptoKey> | null = null;

function signingKey() {
  if (!cachedKey) {
    const secret = process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : DEV_SECRET);
    if (secret.length < 16) throw new Error("SESSION_SECRET must be set (16+ chars) in production.");
    cachedKey = crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  }
  return cachedKey;
}

const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function fromBase64Url(value: string) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function createSessionToken(now = Date.now()) {
  const session: Session = { role: "viewer", expiresAt: now + SESSION_TTL_SECONDS * 1000 };
  const body = toBase64Url(encoder.encode(JSON.stringify(session)));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(body)));
  return `${body}.${toBase64Url(signature)}`;
}

export async function readSessionToken(token: string | undefined, now = Date.now()): Promise<Session | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC", await signingKey(), fromBase64Url(signature), encoder.encode(body));
    if (!valid) return null;
    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as Session;
    return session.role === "viewer" && session.expiresAt > now ? session : null;
  } catch {
    return null;
  }
}
