# OAuth 2.0 / OIDC Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the four OIDC endpoints completing the OAuth 2.0 Authorization Code Flow — `/oauth/authorize`, `/oauth/token`, `/oauth/.well-known/openid-configuration`, and `/oauth/.well-known/jwks.json`.

**Architecture:** Three new service files handle all business logic (`partner.service.ts`, `token.service.ts`) plus a Redis client (`lib/redis.ts`). Route handlers in `routes/oauth.ts` stay thin — validate inputs, call services, respond. Auth codes live in Redis with 60-second TTL and are deleted on first use (single-use enforcement). Consent state also uses Redis (5-minute TTL). RS256 JWT signing via `jose`, partner secret verification via `argon2`.

**Tech Stack:** Hono, Drizzle ORM + Neon (`drizzle-orm/neon-http`), `jose` (RS256 JWT + JWKS), `@upstash/redis`, `argon2`, `vitest` (tests)

---

## Prerequisite: Merge `claude/db-schema` before starting

The `claude/db-schema` branch contains the real Drizzle schema (4 tables: `users`, `verifications`, `partners`, `partner_subs`) plus the initial migration. Main currently has a stub. **Merge or rebase this branch into main before creating the OAuth worktree.** The OAuth feature depends on the real schema for DB queries.

After merging, verify `apps/server/src/db/schema.ts` exports `users`, `verifications`, `partners`, and `partnerSubs`. If `db/index.ts` still uses `drizzle-orm/postgres-js`, it also needs updating to `drizzle-orm/neon-http` (the db-schema branch did this).

---

## Session format (read-only in this feature)

The auth endpoints (built later) will create sessions. OAuth only reads them. The format:
- Cookie name: `cage_session` (value = session ID, a random UUID)
- Redis key: `session:{sessionId}` → JSON `{ userId: string }`
- This feature does NOT create sessions. It just reads them.

---

### Task 1: Install dependencies and set up test runner

**Files:**
- Modify: `apps/server/package.json`
- Create: `apps/server/vitest.config.ts`
- Modify: `apps/server/.env.example`

**Step 1: Install production dependencies**

```bash
cd apps/server
pnpm add jose @upstash/redis argon2
```

Expected: three packages installed, `pnpm-lock.yaml` updated at repo root.

**Step 2: Install vitest as dev dependency**

```bash
pnpm add -D vitest
```

**Step 3: Add test scripts to `package.json`**

In `apps/server/package.json`, add to the `"scripts"` block:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4: Create `vitest.config.ts`**

```typescript
// apps/server/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

**Step 5: Add env vars to `.env.example`**

Append to `apps/server/.env.example`:
```
UPSTASH_REDIS_REST_URL=      # From Upstash console: https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=    # From Upstash console
JWT_PRIVATE_KEY=             # RS256 private key PEM — generate: openssl genrsa 2048
JWT_PUBLIC_KEY=              # RS256 public key PEM — generate: openssl rsa -pubout
OIDC_ISSUER=https://cageid.app
```

**Step 6: Verify test runner works**

```bash
pnpm test
```

Expected: "No test files found" with exit 0, OR 0 tests passed. No errors.

**Step 7: Commit**

```bash
git add apps/server/package.json apps/server/vitest.config.ts apps/server/.env.example pnpm-lock.yaml
git commit -m "chore: add jose, argon2, upstash-redis deps and vitest test runner"
```

---

### Task 2: `lib/redis.ts` — Upstash Redis client

**Files:**
- Create: `apps/server/src/lib/redis.ts`

No dedicated test — this is a client singleton, tested implicitly via route tests.

**About `@upstash/redis`:** This is a REST-based Redis client that works in any Node.js environment. `Redis.fromEnv()` automatically reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from the environment.

**Step 1: Write the module**

```typescript
// apps/server/src/lib/redis.ts
import { Redis } from "@upstash/redis";

// Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
// These are set in Doppler for production. For local dev, set them in .env.
export const redis = Redis.fromEnv();
```

**Step 2: Commit**

```bash
git add apps/server/src/lib/redis.ts
git commit -m "feat(lib): add Upstash Redis client singleton"
```

---

### Task 3: `services/partner.service.ts` — Partner lookup and validation

**Files:**
- Create: `apps/server/src/services/partner.service.ts`
- Create: `apps/server/src/services/__tests__/partner.service.test.ts`

**What this service does:**
- `findActivePartner(clientId)` — queries `partners` table for an active partner with the given `id`
- `validateClientSecret(partner, secret)` — argon2 verifies the secret against `clientSecretHash`
- `validateRedirectUri(partner, uri)` — exact-match check against `redirectUris[]`

The `partners.id` column IS the OAuth `client_id`. Exact match on `redirectUris` — no prefix, wildcard, or trailing-slash tolerance. Unknown/inactive client IDs must show an error page (do NOT redirect — the redirect_uri can't be trusted).

**Step 1: Write failing tests**

```typescript
// apps/server/src/services/__tests__/partner.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findActivePartner, validateRedirectUri } from '../partner.service.js';

// Mock the database module
vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      partners: {
        findFirst: vi.fn(),
      },
    },
  },
}));

import { db } from '../../db/index.js';

const mockPartner = {
  id: 'test-partner-uuid',
  name: 'Test Partner',
  domain: 'testpartner.com',
  clientSecretHash: 'hash-placeholder',
  ageFloorRequired: 18,
  redirectUris: [
    'https://testpartner.com/callback',
    'https://testpartner.com/auth/return',
  ],
  active: true,
  createdAt: new Date(),
};

describe('partner.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findActivePartner', () => {
    it('returns partner when found and active', async () => {
      vi.mocked(db.query.partners.findFirst).mockResolvedValue(mockPartner);

      const result = await findActivePartner('test-partner-uuid');

      expect(result).toEqual(mockPartner);
    });

    it('returns null when partner is not found', async () => {
      vi.mocked(db.query.partners.findFirst).mockResolvedValue(undefined);

      const result = await findActivePartner('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('validateRedirectUri', () => {
    it('returns true for an exact match in the allowed list', () => {
      expect(
        validateRedirectUri(mockPartner, 'https://testpartner.com/callback')
      ).toBe(true);
    });

    it('returns false for a URI not in the allowed list', () => {
      expect(
        validateRedirectUri(mockPartner, 'https://evil.com/steal')
      ).toBe(false);
    });

    it('returns false for a URI that is a path-prefix of an allowed URI', () => {
      expect(
        validateRedirectUri(mockPartner, 'https://testpartner.com/callback/extra')
      ).toBe(false);
    });

    it('returns false for a URI that is a subdomain of an allowed domain', () => {
      expect(
        validateRedirectUri(mockPartner, 'https://evil.testpartner.com/callback')
      ).toBe(false);
    });
  });
});
```

**Step 2: Run tests — verify they fail**

```bash
pnpm test
```

Expected: FAIL with "Cannot find module '../partner.service.js'"

**Step 3: Write the implementation**

```typescript
// apps/server/src/services/partner.service.ts
import { db } from "../db/index.js";
import { partners } from "../db/schema.js";
import * as argon2 from "argon2";
import { eq, and } from "drizzle-orm";

export type Partner = typeof partners.$inferSelect;

/**
 * Finds an active partner by client_id (= partner.id).
 * Returns null if not found OR if the partner is inactive.
 *
 * SECURITY: An inactive partner and an unknown partner look identical to callers.
 * Never reveal which condition was triggered.
 */
export async function findActivePartner(
  clientId: string
): Promise<Partner | null> {
  const partner = await db.query.partners.findFirst({
    where: (p, { eq, and }) => and(eq(p.id, clientId), eq(p.active, true)),
  });
  return partner ?? null;
}

/**
 * Verifies a plain-text client secret against the stored argon2id hash.
 * Returns false on any error (hash mismatch, malformed hash, etc.).
 */
export async function validateClientSecret(
  partner: Partner,
  secret: string
): Promise<boolean> {
  try {
    return await argon2.verify(partner.clientSecretHash, secret);
  } catch {
    return false;
  }
}

/**
 * Checks whether a redirect_uri is in the partner's allowed list.
 * EXACT match only — no prefix matching, no wildcard, no trailing-slash tolerance.
 */
export function validateRedirectUri(partner: Partner, uri: string): boolean {
  return partner.redirectUris.includes(uri);
}
```

**Step 4: Run tests — verify they pass**

```bash
pnpm test
```

Expected: 5 tests pass, 0 failed.

**Step 5: Commit**

```bash
git add src/services/partner.service.ts src/services/__tests__/partner.service.test.ts
git commit -m "feat(services): add partner service with credential and redirect URI validation"
```

---

### Task 4: `services/token.service.ts` — JWT signing, JWKS, auth code generation

**Files:**
- Create: `apps/server/src/services/token.service.ts`
- Create: `apps/server/src/services/__tests__/token.service.test.ts`

**What this service does:**
- `generateAuthCode()` — returns a 32-byte random hex string (64 chars)
- `getJwks()` — returns the JWKS JSON (public key for partner-side verification)
- `signIdToken({ sub, aud, ageFloor })` — returns a signed RS256 JWT

**Key design:** Keys are loaded lazily on first use (not at import time). This avoids startup failures when env vars aren't set and makes unit testing straightforward — set env vars in `beforeAll`, then call functions. Keys are cached after first load.

**Step 1: Write failing tests**

```typescript
// apps/server/src/services/__tests__/token.service.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPair, exportPKCS8, exportSPKI, importSPKI, jwtVerify } from 'jose';

// Set test env vars BEFORE importing the module.
// token.service.ts reads env vars lazily (on first call), so this works.
let publicKeyPem: string;

beforeAll(async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  process.env['JWT_PRIVATE_KEY'] = await exportPKCS8(privateKey);
  publicKeyPem = await exportSPKI(publicKey);
  process.env['JWT_PUBLIC_KEY'] = publicKeyPem;
  process.env['OIDC_ISSUER'] = 'https://cageid.app';
});

// Lazy import so it picks up the env vars set above
const getModule = () => import('../token.service.js');

describe('token.service', () => {
  describe('generateAuthCode', () => {
    it('generates a 64-character lowercase hex string', async () => {
      const { generateAuthCode } = await getModule();
      const code = generateAuthCode();
      expect(code).toMatch(/^[0-9a-f]{64}$/);
    });

    it('generates a unique code on every call', async () => {
      const { generateAuthCode } = await getModule();
      const a = generateAuthCode();
      const b = generateAuthCode();
      expect(a).not.toBe(b);
    });
  });

  describe('getJwks', () => {
    it('returns a JWKS object with one RS256 key', async () => {
      const { getJwks } = await getModule();
      const jwks = await getJwks();
      expect(jwks).toHaveProperty('keys');
      expect(jwks.keys).toHaveLength(1);
      expect(jwks.keys[0]).toMatchObject({
        kty: 'RSA',
        alg: 'RS256',
        use: 'sig',
        kid: 'cage-1',
      });
    });

    it('returns the same object on repeated calls (cached)', async () => {
      const { getJwks } = await getModule();
      const first = await getJwks();
      const second = await getJwks();
      expect(first).toBe(second); // same reference = cached
    });
  });

  describe('signIdToken', () => {
    it('returns a verifiable RS256 JWT with correct claims', async () => {
      const { signIdToken } = await getModule();

      const token = await signIdToken({
        sub: 'test-sub-hash',
        aud: 'test-client-id',
        ageFloor: 18,
      });

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // header.payload.signature

      // Verify with the corresponding public key
      const publicKey = await importSPKI(publicKeyPem, 'RS256');
      const { payload } = await jwtVerify(token, publicKey, {
        issuer: 'https://cageid.app',
        audience: 'test-client-id',
      });

      expect(payload.sub).toBe('test-sub-hash');
      expect(payload['age_verified']).toBe(true);
      expect(payload['age_floor']).toBe(18);

      // exp should be ~1 hour from now (within a 60-second margin for test runner speed)
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now + 3540);
      expect(payload.exp).toBeLessThan(now + 3660);
    });

    it('uses the partner client_id as the audience claim', async () => {
      const { signIdToken } = await getModule();
      const token = await signIdToken({ sub: 'sub', aud: 'my-partner-id', ageFloor: 21 });

      const publicKey = await importSPKI(publicKeyPem, 'RS256');
      const { payload } = await jwtVerify(token, publicKey, {
        issuer: 'https://cageid.app',
        audience: 'my-partner-id',
      });
      expect(payload['age_floor']).toBe(21);
    });
  });
});
```

**Step 2: Run tests — verify they fail**

```bash
pnpm test
```

Expected: FAIL with "Cannot find module '../token.service.js'"

**Step 3: Write the implementation**

```typescript
// apps/server/src/services/token.service.ts
import { importPKCS8, importSPKI, exportJWK, SignJWT } from "jose";
import { randomBytes } from "crypto";
import type { KeyLike } from "jose";

const ALG = "RS256";
const KID = "cage-1";

// Keys are loaded lazily on first use and cached.
// This avoids import-time failures and makes testing straightforward.
let _privateKey: KeyLike | null = null;
let _publicKey: KeyLike | null = null;
let _jwks: { keys: object[] } | null = null;

async function ensureKeys(): Promise<void> {
  if (_privateKey && _publicKey) return;

  const privateKeyPem = process.env["JWT_PRIVATE_KEY"];
  const publicKeyPem = process.env["JWT_PUBLIC_KEY"];

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
  sub: string;   // partner-scoped sub_hash from partner_subs
  aud: string;   // partner's client_id
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
```

**Step 4: Run tests — verify they pass**

```bash
pnpm test
```

Expected: 6 tests pass, 0 failed.

**Step 5: Commit**

```bash
git add src/services/token.service.ts src/services/__tests__/token.service.test.ts
git commit -m "feat(services): add token service with RS256 JWT signing, JWKS, and auth code generation"
```

---

### Task 5: Routes — Discovery and JWKS endpoints

**Files:**
- Create: `apps/server/src/routes/oauth.ts`
- Create: `apps/server/src/routes/__tests__/oauth.discovery.test.ts`

These two endpoints are stateless — no DB, no Redis, no session. Good warm-up before the complex endpoints.

**Discovery response fields** (OIDC Core spec minimum):
- `issuer` — must match `OIDC_ISSUER`
- `authorization_endpoint`, `token_endpoint`, `jwks_uri`
- `response_types_supported: ["code"]`
- `subject_types_supported: ["public"]`
- `id_token_signing_alg_values_supported: ["RS256"]`
- `claims_supported` — informational

**Step 1: Write failing tests**

```typescript
// apps/server/src/routes/__tests__/oauth.discovery.test.ts
import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock token.service so tests don't need real RSA keys
vi.mock('../../services/token.service.js', () => ({
  getJwks: vi.fn().mockResolvedValue({
    keys: [{ kty: 'RSA', alg: 'RS256', use: 'sig', kid: 'cage-1', n: 'abc', e: 'AQAB' }],
  }),
  signIdToken: vi.fn(),
  generateAuthCode: vi.fn(),
}));

// Mock partner.service
vi.mock('../../services/partner.service.js', () => ({
  findActivePartner: vi.fn(),
  validateClientSecret: vi.fn(),
  validateRedirectUri: vi.fn(),
}));

// Mock redis
vi.mock('../../lib/redis.js', () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
}));

process.env['OIDC_ISSUER'] = 'https://cageid.app';

const { oauthRoutes } = await import('../oauth.js');
import { Hono } from 'hono';

function makeApp() {
  const app = new Hono();
  app.route('/oauth', oauthRoutes);
  return app;
}

describe('GET /oauth/.well-known/openid-configuration', () => {
  it('returns 200 with a valid OIDC discovery document', async () => {
    const app = makeApp();
    const res = await app.request('/oauth/.well-known/openid-configuration');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body.issuer).toBe('https://cageid.app');
    expect(body.authorization_endpoint).toBe('https://cageid.app/oauth/authorize');
    expect(body.token_endpoint).toBe('https://cageid.app/oauth/token');
    expect(body.jwks_uri).toBe('https://cageid.app/oauth/.well-known/jwks.json');
    expect(body.response_types_supported).toContain('code');
    expect(body.id_token_signing_alg_values_supported).toContain('RS256');
  });
});

describe('GET /oauth/.well-known/jwks.json', () => {
  it('returns 200 with the JWKS public key', async () => {
    const app = makeApp();
    const res = await app.request('/oauth/.well-known/jwks.json');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('keys');
    expect(Array.isArray(body.keys)).toBe(true);
  });
});
```

**Step 2: Run tests — verify they fail**

```bash
pnpm test
```

Expected: FAIL with "Cannot find module '../oauth.js'"

**Step 3: Write the initial `routes/oauth.ts` with only the two stateless endpoints**

```typescript
// apps/server/src/routes/oauth.ts
import { Hono } from "hono";
import { getJwks } from "../services/token.service.js";

export const oauthRoutes = new Hono();

const ISSUER = process.env["OIDC_ISSUER"] ?? "https://cageid.app";

// ─── OIDC Discovery ────────────────────────────────────────────────────────

oauthRoutes.get("/.well-known/openid-configuration", (c) => {
  return c.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/oauth/authorize`,
    token_endpoint: `${ISSUER}/oauth/token`,
    jwks_uri: `${ISSUER}/oauth/.well-known/jwks.json`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    claims_supported: [
      "sub",
      "iss",
      "aud",
      "exp",
      "iat",
      "age_verified",
      "age_floor",
    ],
  });
});

// ─── JWKS ──────────────────────────────────────────────────────────────────

oauthRoutes.get("/.well-known/jwks.json", async (c) => {
  const jwks = await getJwks();
  return c.json(jwks);
});
```

**Step 4: Run tests — verify they pass**

```bash
pnpm test
```

Expected: 3 tests pass, 0 failed.

**Step 5: Commit**

```bash
git add src/routes/oauth.ts src/routes/__tests__/oauth.discovery.test.ts
git commit -m "feat(routes): add OIDC discovery and JWKS endpoints"
```

---

### Task 6: Routes — `/oauth/authorize` endpoint

**Files:**
- Modify: `apps/server/src/routes/oauth.ts`
- Create: `apps/server/src/routes/__tests__/oauth.authorize.test.ts`

**Full flow for this endpoint (see design doc for the canonical source):**

```
GET /oauth/authorize?client_id=&redirect_uri=&state=&response_type=code
```

1. Validate `response_type=code`, `client_id`, `redirect_uri` are present
2. Look up partner with `findActivePartner(client_id)`
   - **Not found/inactive** → show error page, do NOT redirect (untrusted redirect_uri)
3. Check `redirect_uri` is in `partner.redirectUris`
   - **Not allowed** → show error page, do NOT redirect
4. Read `cage_session` cookie → look up `session:{id}` in Redis → get `{ userId }`
   - **No session** → redirect to `/login` (out of scope; auth feature adds this later)
5. Query `verifications` for most recent `approved` row where `expires_at > now()` for this user
   - **No valid verification** → store `{ client_id, redirect_uri, state }` in session under `pending_oauth`, redirect to `/verify`
6. Check `verification.age_floor >= partner.ageFloorRequired`
   - **Below required** → redirect to `redirect_uri?error=access_denied&state=...`
7. Query `partner_subs` for `(userId, partnerId)`
   - **Exists** → skip consent, jump to step 9
   - **Not found** → store consent state in Redis, render consent HTML page
8. (Consent submitted via `POST /oauth/consent`) — create `partner_subs` row, fall through to step 9
9. Generate auth code with `generateAuthCode()`, store in Redis:
   - Key: `oauth_code:{code}` → `{ userId, partnerId, redirectUri }`
   - TTL: 60 seconds
10. Redirect to `redirect_uri?code={code}&state={state}`

**Consent flow detail:**

When `partner_subs` doesn't exist:
- Generate a `consentToken` = `crypto.randomUUID()`
- Store in Redis: `oauth_consent:{consentToken}` → `{ userId, partnerId, redirectUri, state }`, TTL 300s
- Render an HTML page with a form that POSTs `/oauth/consent` with `consent_token` hidden field

When consent is submitted (`POST /oauth/consent`):
- Look up `oauth_consent:{consent_token}` in Redis
- If missing/expired → 400 error (consent expired, re-start flow)
- Delete the consent key (single-use)
- Insert `partner_subs` row with `subHash = crypto.randomUUID()`
- Generate auth code, redirect

**DB queries needed in this endpoint:**

```typescript
// Most recent approved verification where expires_at > now()
const verification = await db.query.verifications.findFirst({
  where: (v, { eq, gt, and }) =>
    and(eq(v.userId, userId), eq(v.status, 'approved'), gt(v.expiresAt, new Date())),
  orderBy: (v, { desc }) => [desc(v.createdAt)],
});

// Check for existing partner_subs row
const existingSub = await db.query.partnerSubs.findFirst({
  where: (ps, { eq, and }) =>
    and(eq(ps.userId, userId), eq(ps.partnerId, partner.id)),
});

// Insert new partner_subs row
await db.insert(partnerSubs).values({
  userId,
  partnerId: partner.id,
  subHash: crypto.randomUUID(),
});
```

**Step 1: Write failing tests**

```typescript
// apps/server/src/routes/__tests__/oauth.authorize.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// All external dependencies mocked
vi.mock('../../services/token.service.js', () => ({
  getJwks: vi.fn(),
  signIdToken: vi.fn(),
  generateAuthCode: vi.fn().mockReturnValue('a'.repeat(64)),
}));

vi.mock('../../services/partner.service.js', () => ({
  findActivePartner: vi.fn(),
  validateClientSecret: vi.fn(),
  validateRedirectUri: vi.fn(),
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      verifications: { findFirst: vi.fn() },
      partnerSubs: { findFirst: vi.fn() },
    },
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  },
}));

import { findActivePartner, validateRedirectUri } from '../../services/partner.service.js';
import { generateAuthCode } from '../../services/token.service.js';
import { redis } from '../../lib/redis.js';
import { db } from '../../db/index.js';

process.env['OIDC_ISSUER'] = 'https://cageid.app';

const { oauthRoutes } = await import('../oauth.js');
import { Hono } from 'hono';

function makeApp() {
  const app = new Hono();
  app.route('/oauth', oauthRoutes);
  return app;
}

const mockPartner = {
  id: 'partner-uuid',
  name: 'Test Partner',
  domain: 'testpartner.com',
  clientSecretHash: 'hash',
  ageFloorRequired: 18,
  redirectUris: ['https://testpartner.com/callback'],
  active: true,
  createdAt: new Date(),
};

const mockVerification = {
  id: 'verif-uuid',
  userId: 'user-uuid',
  status: 'approved',
  ageFloor: 18,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days from now
};

const mockPartnerSub = {
  id: 'sub-uuid',
  userId: 'user-uuid',
  partnerId: 'partner-uuid',
  subHash: 'stable-sub-hash',
  createdAt: new Date(),
};

describe('GET /oauth/authorize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when response_type is missing', async () => {
    const app = makeApp();
    const res = await app.request('/oauth/authorize?client_id=x&redirect_uri=y&state=z');
    expect(res.status).toBe(400);
  });

  it('shows an error page (not a redirect) when client_id is unknown', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(null);
    const app = makeApp();
    const res = await app.request(
      '/oauth/authorize?client_id=unknown&redirect_uri=https://evil.com&state=s&response_type=code'
    );
    // Must NOT redirect — untrusted redirect_uri
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain('Unknown or inactive client');
  });

  it('shows an error page (not a redirect) when redirect_uri is not allowed', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(mockPartner);
    vi.mocked(validateRedirectUri).mockReturnValue(false);
    const app = makeApp();
    const res = await app.request(
      '/oauth/authorize?client_id=partner-uuid&redirect_uri=https://evil.com/steal&state=s&response_type=code'
    );
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain('Invalid redirect URI');
  });

  it('redirects to /login when there is no session cookie', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(mockPartner);
    vi.mocked(validateRedirectUri).mockReturnValue(true);
    vi.mocked(redis.get).mockResolvedValue(null); // no session
    const app = makeApp();
    const res = await app.request(
      '/oauth/authorize?client_id=partner-uuid&redirect_uri=https://testpartner.com/callback&state=mystate&response_type=code',
      { headers: { Cookie: '' } }
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('redirects with error=access_denied when user age_floor is below requirement', async () => {
    vi.mocked(findActivePartner).mockResolvedValue({ ...mockPartner, ageFloorRequired: 21 });
    vi.mocked(validateRedirectUri).mockReturnValue(true);
    vi.mocked(redis.get).mockResolvedValue({ userId: 'user-uuid' }); // valid session
    vi.mocked(db.query.verifications.findFirst).mockResolvedValue({
      ...mockVerification,
      ageFloor: 18, // below required 21
    });
    const app = makeApp();
    const res = await app.request(
      '/oauth/authorize?client_id=partner-uuid&redirect_uri=https://testpartner.com/callback&state=mystate&response_type=code',
      { headers: { Cookie: 'cage_session=test-session-id' } }
    );
    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('error=access_denied');
    expect(location).toContain('state=mystate');
  });

  it('redirects with code and state on successful authorization (returning user)', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(mockPartner);
    vi.mocked(validateRedirectUri).mockReturnValue(true);
    vi.mocked(redis.get).mockResolvedValue({ userId: 'user-uuid' }); // valid session
    vi.mocked(db.query.verifications.findFirst).mockResolvedValue(mockVerification);
    vi.mocked(db.query.partnerSubs.findFirst).mockResolvedValue(mockPartnerSub); // existing sub
    vi.mocked(redis.set).mockResolvedValue('OK');
    const app = makeApp();
    const res = await app.request(
      '/oauth/authorize?client_id=partner-uuid&redirect_uri=https://testpartner.com/callback&state=mystate&response_type=code',
      { headers: { Cookie: 'cage_session=test-session-id' } }
    );
    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('https://testpartner.com/callback');
    expect(location).toContain('code=');
    expect(location).toContain('state=mystate');
  });
});
```

**Step 2: Run tests — verify they fail**

```bash
pnpm test
```

Expected: FAIL — authorize tests fail, discovery tests still pass.

**Step 3: Add the authorize and consent endpoints to `routes/oauth.ts`**

Add these imports at the top of `oauth.ts`:
```typescript
import { db } from "../db/index.js";
import { verifications, partnerSubs } from "../db/schema.js";
import { redis } from "../lib/redis.js";
import {
  findActivePartner,
  validateRedirectUri,
} from "../services/partner.service.js";
import { generateAuthCode } from "../services/token.service.js";
import { eq, and, gt, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
```

Add these routes to `oauth.ts` (after the JWKS route):

```typescript
// ─── Authorize ─────────────────────────────────────────────────────────────

oauthRoutes.get("/authorize", async (c) => {
  const { client_id, redirect_uri, state, response_type } = c.req.query();

  // 1. Basic param validation
  if (!client_id || !redirect_uri || !response_type) {
    return c.text("Missing required parameters: client_id, redirect_uri, response_type", 400);
  }
  if (response_type !== "code") {
    return c.text("Unsupported response_type. Only 'code' is supported.", 400);
  }

  // 2. Validate partner — show error page on failure, never redirect
  const partner = await findActivePartner(client_id);
  if (!partner) {
    return c.html("<h1>Error</h1><p>Unknown or inactive client</p>", 400);
  }
  if (!validateRedirectUri(partner, redirect_uri)) {
    return c.html("<h1>Error</h1><p>Invalid redirect URI</p>", 400);
  }

  // 3. Check session cookie
  const sessionId = getCookie(c, "cage_session");
  if (!sessionId) {
    return c.redirect(`/login?next=${encodeURIComponent(c.req.url)}`);
  }
  const session = await redis.get<{ userId: string }>(`session:${sessionId}`);
  if (!session?.userId) {
    return c.redirect(`/login?next=${encodeURIComponent(c.req.url)}`);
  }
  const userId = session.userId;

  // 4. Check verification status
  const verification = await db.query.verifications.findFirst({
    where: (v, { eq, and, gt }) =>
      and(
        eq(v.userId, userId),
        eq(v.status, "approved"),
        gt(v.expiresAt!, new Date())
      ),
    orderBy: (v, { desc }) => [desc(v.createdAt)],
  });

  if (!verification) {
    // Store OAuth params in session for flow resumption after verification
    await redis.set(
      `session:${sessionId}`,
      { userId, pending_oauth: { client_id, redirect_uri, state } },
      { keepTtl: true }
    );
    return c.redirect("/verify");
  }

  // 5. Age floor check — redirect with error (redirect_uri is trusted by now)
  if ((verification.ageFloor ?? 0) < partner.ageFloorRequired) {
    const url = new URL(redirect_uri);
    url.searchParams.set("error", "access_denied");
    if (state) url.searchParams.set("state", state);
    return c.redirect(url.toString());
  }

  // 6. Check for existing partner_subs (consent already granted)
  const existingSub = await db.query.partnerSubs.findFirst({
    where: (ps, { eq, and }) =>
      and(eq(ps.userId, userId), eq(ps.partnerId, partner.id)),
  });

  if (!existingSub) {
    // First visit — need consent. Store state in Redis, show consent page.
    const consentToken = randomUUID();
    await redis.set(
      `oauth_consent:${consentToken}`,
      { userId, partnerId: partner.id, redirectUri: redirect_uri, state },
      { ex: 300 } // 5-minute TTL
    );
    return c.html(consentPage(partner.name, consentToken));
  }

  // 7. Issue auth code
  return issueAuthCode(c, userId, partner.id, redirect_uri, state ?? "");
});

// ─── Consent POST ──────────────────────────────────────────────────────────

oauthRoutes.post("/consent", async (c) => {
  const body = await c.req.parseBody();
  const consentToken = body["consent_token"] as string;

  if (!consentToken) {
    return c.text("Missing consent_token", 400);
  }

  const stored = await redis.get<{
    userId: string;
    partnerId: string;
    redirectUri: string;
    state: string;
  }>(`oauth_consent:${consentToken}`);

  if (!stored) {
    return c.html("<h1>Error</h1><p>Consent session expired. Please return to the partner site and try again.</p>", 400);
  }

  // Single-use: delete the consent key immediately
  await redis.del(`oauth_consent:${consentToken}`);

  // Create partner_subs row — the permanent record of consent
  await db.insert(partnerSubs).values({
    userId: stored.userId,
    partnerId: stored.partnerId,
    subHash: randomUUID(),
  });

  return issueAuthCode(c, stored.userId, stored.partnerId, stored.redirectUri, stored.state ?? "");
});

// ─── Helpers ───────────────────────────────────────────────────────────────

async function issueAuthCode(
  c: Parameters<Parameters<typeof oauthRoutes.get>[1]>[0],
  userId: string,
  partnerId: string,
  redirectUri: string,
  state: string
) {
  const code = generateAuthCode();
  await redis.set(
    `oauth_code:${code}`,
    { userId, partnerId, redirectUri },
    { ex: 60 } // 60-second TTL
  );
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  return c.redirect(url.toString());
}

function consentPage(partnerName: string, consentToken: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>CAGE — Share Age Verification</title></head>
<body>
  <h1>Share your age verification</h1>
  <p><strong>${partnerName}</strong> is requesting confirmation of your age verification.</p>
  <p>CAGE will share only that you are age-verified and your age bracket. No other personal information is shared.</p>
  <form method="POST" action="/oauth/consent">
    <input type="hidden" name="consent_token" value="${consentToken}" />
    <button type="submit">Confirm — share age verification</button>
  </form>
  <p><a href="javascript:history.back()">Cancel</a></p>
</body>
</html>`;
}
```

Also add this import at the top of `oauth.ts` (Hono cookie helper):
```typescript
import { getCookie } from "hono/cookie";
```

**Step 4: Run tests — verify they pass**

```bash
pnpm test
```

Expected: all previous tests pass + the new authorize tests pass.

**Step 5: Commit**

```bash
git add src/routes/oauth.ts src/routes/__tests__/oauth.authorize.test.ts
git commit -m "feat(routes): add /oauth/authorize endpoint with consent flow"
```

---

### Task 7: Routes — `/oauth/token` endpoint

**Files:**
- Modify: `apps/server/src/routes/oauth.ts`
- Create: `apps/server/src/routes/__tests__/oauth.token.test.ts`

**Token exchange flow:**

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=...&client_id=...&client_secret=...
```

1. Validate `grant_type=authorization_code`, `code`, `client_id`, `client_secret` present
2. Look up partner with `findActivePartner(client_id)` → `401 { error: "invalid_client" }` if missing
3. Verify `client_secret` with `validateClientSecret(partner, secret)` → `401 { error: "invalid_client" }` if wrong
4. Fetch `oauth_code:{code}` from Redis → `400 { error: "invalid_grant" }` if missing/expired
5. **Delete the Redis key immediately** (single-use — do NOT wait)
6. Verify the `redirect_uri` in the stored code matches what's stored (replay protection)
7. Load verification for `userId`: most recent approved where `expires_at > now()`
8. Look up `partner_subs` for `(userId, partnerId)` → get `sub_hash`
9. Sign and return ID token

**Error responses follow OAuth 2.0 spec (RFC 6749):**
- Wrong secret or unknown client → `401 { "error": "invalid_client" }`
- Bad/expired code → `400 { "error": "invalid_grant" }`
- Wrong grant_type → `400 { "error": "unsupported_grant_type" }`

**Step 1: Write failing tests**

```typescript
// apps/server/src/routes/__tests__/oauth.token.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/token.service.js', () => ({
  getJwks: vi.fn(),
  signIdToken: vi.fn().mockResolvedValue('signed.jwt.token'),
  generateAuthCode: vi.fn(),
}));

vi.mock('../../services/partner.service.js', () => ({
  findActivePartner: vi.fn(),
  validateClientSecret: vi.fn(),
  validateRedirectUri: vi.fn(),
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      verifications: { findFirst: vi.fn() },
      partnerSubs: { findFirst: vi.fn() },
    },
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  },
}));

import { findActivePartner, validateClientSecret } from '../../services/partner.service.js';
import { signIdToken } from '../../services/token.service.js';
import { redis } from '../../lib/redis.js';
import { db } from '../../db/index.js';

process.env['OIDC_ISSUER'] = 'https://cageid.app';

const { oauthRoutes } = await import('../oauth.js');
import { Hono } from 'hono';

function makeApp() {
  const app = new Hono();
  app.route('/oauth', oauthRoutes);
  return app;
}

function tokenRequest(body: Record<string, string>) {
  return new Request('http://localhost/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
}

const mockPartner = {
  id: 'partner-uuid',
  name: 'Test Partner',
  domain: 'testpartner.com',
  clientSecretHash: 'hash',
  ageFloorRequired: 18,
  redirectUris: ['https://testpartner.com/callback'],
  active: true,
  createdAt: new Date(),
};

const storedCode = {
  userId: 'user-uuid',
  partnerId: 'partner-uuid',
  redirectUri: 'https://testpartner.com/callback',
};

describe('POST /oauth/token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 with unsupported_grant_type for wrong grant type', async () => {
    const app = makeApp();
    const res = await app.fetch(tokenRequest({
      grant_type: 'client_credentials',
      client_id: 'partner-uuid',
      client_secret: 'secret',
      code: 'abc',
    }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('unsupported_grant_type');
  });

  it('returns 401 with invalid_client when partner not found', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(null);
    const app = makeApp();
    const res = await app.fetch(tokenRequest({
      grant_type: 'authorization_code',
      client_id: 'bad-id',
      client_secret: 'bad-secret',
      code: 'somecode',
    }));
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('invalid_client');
  });

  it('returns 401 with invalid_client when client_secret is wrong', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(mockPartner);
    vi.mocked(validateClientSecret).mockResolvedValue(false);
    const app = makeApp();
    const res = await app.fetch(tokenRequest({
      grant_type: 'authorization_code',
      client_id: 'partner-uuid',
      client_secret: 'wrong-secret',
      code: 'somecode',
    }));
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('invalid_client');
  });

  it('returns 400 with invalid_grant when auth code is not in Redis', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(mockPartner);
    vi.mocked(validateClientSecret).mockResolvedValue(true);
    vi.mocked(redis.get).mockResolvedValue(null); // no code found
    const app = makeApp();
    const res = await app.fetch(tokenRequest({
      grant_type: 'authorization_code',
      client_id: 'partner-uuid',
      client_secret: 'correct-secret',
      code: 'expired-or-missing-code',
    }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('invalid_grant');
  });

  it('returns the ID token on a valid exchange and deletes the auth code', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(mockPartner);
    vi.mocked(validateClientSecret).mockResolvedValue(true);
    vi.mocked(redis.get).mockResolvedValue(storedCode);
    vi.mocked(redis.del).mockResolvedValue(1);
    vi.mocked(db.query.verifications.findFirst).mockResolvedValue({
      id: 'verif-uuid',
      userId: 'user-uuid',
      status: 'approved',
      ageFloor: 18,
      expiresAt: new Date(Date.now() + 86400000),
    });
    vi.mocked(db.query.partnerSubs.findFirst).mockResolvedValue({
      id: 'sub-uuid',
      userId: 'user-uuid',
      partnerId: 'partner-uuid',
      subHash: 'stable-sub-hash',
      createdAt: new Date(),
    });

    const app = makeApp();
    const res = await app.fetch(tokenRequest({
      grant_type: 'authorization_code',
      client_id: 'partner-uuid',
      client_secret: 'correct-secret',
      code: 'valid-auth-code',
    }));

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.id_token).toBe('signed.jwt.token');
    expect(body.token_type).toBe('Bearer');

    // Single-use enforcement: code must be deleted
    expect(vi.mocked(redis.del)).toHaveBeenCalledWith('oauth_code:valid-auth-code');

    // Verify signIdToken was called with correct args
    expect(vi.mocked(signIdToken)).toHaveBeenCalledWith({
      sub: 'stable-sub-hash',
      aud: 'partner-uuid',
      ageFloor: 18,
    });
  });
});
```

**Step 2: Run tests — verify they fail**

```bash
pnpm test
```

Expected: the new token tests fail; all previous tests still pass.

**Step 3: Add the token endpoint to `routes/oauth.ts`**

Append to `oauth.ts`:

```typescript
// ─── Token Exchange ────────────────────────────────────────────────────────

oauthRoutes.post("/token", async (c) => {
  const body = await c.req.parseBody();
  const grantType = body["grant_type"] as string;
  const code = body["code"] as string;
  const clientId = body["client_id"] as string;
  const clientSecret = body["client_secret"] as string;

  // 1. grant_type check
  if (grantType !== "authorization_code") {
    return c.json({ error: "unsupported_grant_type" }, 400);
  }
  if (!code || !clientId || !clientSecret) {
    return c.json({ error: "invalid_request" }, 400);
  }

  // 2. Validate partner identity
  const partner = await findActivePartner(clientId);
  if (!partner) {
    return c.json({ error: "invalid_client" }, 401);
  }

  // 3. Validate client secret (argon2 verify)
  const secretOk = await validateClientSecret(partner, clientSecret);
  if (!secretOk) {
    return c.json({ error: "invalid_client" }, 401);
  }

  // 4. Look up auth code in Redis
  const stored = await redis.get<{
    userId: string;
    partnerId: string;
    redirectUri: string;
  }>(`oauth_code:${code}`);

  if (!stored) {
    return c.json({ error: "invalid_grant" }, 400);
  }

  // 5. Delete immediately — single-use enforcement
  await redis.del(`oauth_code:${code}`);

  // 6. Load the user's current verification (must still be valid at exchange time)
  const verification = await db.query.verifications.findFirst({
    where: (v, { eq, and, gt }) =>
      and(
        eq(v.userId, stored.userId),
        eq(v.status, "approved"),
        gt(v.expiresAt!, new Date())
      ),
    orderBy: (v, { desc }) => [desc(v.createdAt)],
  });

  if (!verification) {
    return c.json({ error: "invalid_grant" }, 400);
  }

  // 7. Get the partner-scoped sub_hash
  const partnerSub = await db.query.partnerSubs.findFirst({
    where: (ps, { eq, and }) =>
      and(
        eq(ps.userId, stored.userId),
        eq(ps.partnerId, stored.partnerId)
      ),
  });

  if (!partnerSub) {
    // Should not happen — consent created the row — but guard defensively
    return c.json({ error: "invalid_grant" }, 400);
  }

  // 8. Sign and return the ID token
  const idToken = await signIdToken({
    sub: partnerSub.subHash,
    aud: partner.id,
    ageFloor: verification.ageFloor ?? 18,
  });

  return c.json({
    id_token: idToken,
    token_type: "Bearer",
    expires_in: 3600,
  });
});
```

Also add `validateClientSecret` to the import from `partner.service.js`, and `signIdToken` to the import from `token.service.js`.

**Step 4: Run all tests — verify everything passes**

```bash
pnpm test
```

Expected: all tests pass across all test files.

**Step 5: Commit**

```bash
git add src/routes/oauth.ts src/routes/__tests__/oauth.token.test.ts
git commit -m "feat(routes): add /oauth/token endpoint with single-use auth code enforcement"
```

---

### Task 8: Register OAuth routes in `index.ts`

**Files:**
- Modify: `apps/server/src/index.ts`

**Step 1: Update `index.ts`**

```typescript
// apps/server/src/index.ts
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { oauthRoutes } from './routes/oauth.js';

const app = new Hono();

app.get('/', (c) => {
  return c.json({ name: 'CAGE', status: 'ok' });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// OAuth 2.0 / OIDC endpoints
app.route('/oauth', oauthRoutes);

const port = Number(process.env['PORT'] ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`CAGE server running at http://localhost:${info.port}`);
});
```

**Step 2: Run all tests — confirm nothing is broken**

```bash
pnpm test
```

Expected: all tests pass.

**Step 3: Run the type checker**

```bash
pnpm check-types
```

Expected: 0 errors.

**Step 4: Run the linter**

```bash
pnpm lint
```

Expected: 0 warnings, 0 errors.

**Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: register OAuth routes in app entry point"
```

---

## Done

All four OIDC endpoints are implemented and tested. The feature is ready for the finishing-a-development-branch workflow.

**Manual smoke test (optional, needs real env vars):**

```bash
# Start server with real env vars
pnpm dev

# Discovery document
curl http://localhost:3001/oauth/.well-known/openid-configuration | jq .

# JWKS
curl http://localhost:3001/oauth/.well-known/jwks.json | jq .

# Authorize (replace with real client_id + redirect_uri from DB)
curl -v "http://localhost:3001/oauth/authorize?client_id=...&redirect_uri=...&state=test&response_type=code"
```
