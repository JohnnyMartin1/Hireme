import crypto from "crypto";

const PREFIX = "enc:v1:";

function getKeyMaterial() {
  const raw = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY || "";
  if (!raw) return null;
  // We derive a stable 32-byte key from whatever secret format is provided.
  return crypto.createHash("sha256").update(raw).digest();
}

/** Vercel (all envs) and local production builds must encrypt OAuth tokens at rest. */
function isProductionLikeCalendarDeploy() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

/**
 * Call before persisting access/refresh tokens. In production-like deploys, missing
 * CALENDAR_TOKEN_ENCRYPTION_KEY throws so tokens are never stored as plaintext by mistake.
 * After enabling the key, users may need to reconnect Google/Microsoft calendar once.
 */
export function assertCalendarEncryptionKeyForTokenWrites() {
  if (!isProductionLikeCalendarDeploy()) return;
  const raw = (process.env.CALENDAR_TOKEN_ENCRYPTION_KEY || "").trim();
  if (!raw) {
    throw new Error(
      "CALENDAR_TOKEN_ENCRYPTION_KEY is required in production to store calendar OAuth tokens. Set it in Vercel env, then redeploy."
    );
  }
}

export function isEncryptedToken(value: unknown) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptCalendarToken(value: string | null | undefined) {
  if (!value) return null;
  const key = getKeyMaterial();
  if (!key) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${encrypted.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptCalendarToken(value: string | null | undefined) {
  if (!value) return null;
  if (!isEncryptedToken(value)) return value;
  const key = getKeyMaterial();
  if (!key) return null;
  const encoded = value.slice(PREFIX.length);
  const [ivB64, encryptedB64, tagB64] = encoded.split(".");
  if (!ivB64 || !encryptedB64 || !tagB64) return null;
  try {
    const iv = Buffer.from(ivB64, "base64url");
    const encrypted = Buffer.from(encryptedB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

export function maybeEncryptTokenField(value: string | null | undefined) {
  if (!value) return null;
  if (isEncryptedToken(value)) return value;
  return encryptCalendarToken(value);
}
