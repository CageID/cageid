import { importPKCS8, importSPKI, exportJWK, SignJWT } from "jose";
import type { CryptoKey } from "jose";
import { randomBytes } from "crypto";

const ALG = "RS256";
const KID = "cage-1";

// Keys are loaded lazily on first use and cached.
// Reading env vars inside ensureKeys() (not at module level) means:
// 1. No startup failure if env vars are missing
// 2. Tests can set env vars in beforeAll before any function is called
let _privateKey: CryptoKey | null = null;
let _publicKey: CryptoKey | null = null;
let _jwks: { keys: object[] } | null = null;

async function ensureKeys(): Promise<void> {
  if (_privateKey && _publicKey) return;

  // Railway/Doppler may store PEM keys with literal '\n' instead of real newlines
  const privateKeyPem = process.env["JWT_PRIVATE_KEY"]?.replace(/\\n/g, "\n");
  const publicKeyPem = process.env["JWT_PUBLIC_KEY"]?.replace(/\\n/g, "\n");

  if (!privateKeyPem || !publicKeyPem) {
    throw new Error(
      "JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables are required"
    );
  }

  _privateKey = await importPKCS8(privateKeyPem, ALG);
  _publicKey = await importSPKI(publicKeyPem, ALG);

  const jwk = await exportJWK(_publicKey);
  _jwks = { keys: [{ ...jwk, kid: KID, alg: ALG, use: "sig" }] };
}

/**
 * Returns the JWKS document (public key) for the /.well-known/jwks.json endpoint.
 * Partners use this to verify ID tokens offline.
 * Cached after first call.
 */
export async function getJwks(): Promise<{ keys: object[] }> {
  await ensureKeys();
  return _jwks!;
}

/**
 * Signs and returns an OIDC ID token.
 * - Algorithm: RS256
 * - Expiry: 1 hour
 * - Custom claims: age_verified (always true), age_floor (from verification row)
 */
export async function signIdToken(payload: {
  sub: string;      // partner-scoped sub_hash from partner_subs
  aud: string;      // partner's client_id
  ageFloor: number; // from verifications.age_floor
}): Promise<string> {
  await ensureKeys();

  const issuer = process.env["OIDC_ISSUER"] ?? "https://cageid.app";

  return new SignJWT({
    age_verified: true,
    age_floor: payload.ageFloor,
  })
    .setProtectedHeader({ alg: ALG, kid: KID })
    .setIssuer(issuer)
    .setSubject(payload.sub)
    .setAudience(payload.aud)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(_privateKey!);
}

/**
 * Generates a cryptographically random 32-byte authorization code (64-char hex).
 * Stored in Redis with a 60-second TTL. Single-use — deleted on exchange.
 */
export function generateAuthCode(): string {
  return randomBytes(32).toString("hex");
}
