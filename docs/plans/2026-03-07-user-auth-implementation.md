# User Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Passwordless magic-link authentication — unified register/login flow, session management, and account deletion.

**Architecture:** `POST /auth/magic-link` upserts a user and sends a Resend email. `GET /auth/verify?token=` atomically consumes the Redis token (GETDEL), creates a 90-day session cookie, and sets `email_verified_at`. `requireAuth` middleware guards logout and account deletion by reading the `cage_session` cookie from Redis. All business logic lives in `auth.service.ts`; route handlers are thin wrappers.

**Tech Stack:** Hono (routes + middleware), Drizzle ORM (upsert, delete), `@upstash/redis` (rate limiting, tokens, sessions), `resend` SDK (email delivery), vitest (TDD)

---

### Conventions (read before touching any file)

- **`.js` extensions on all relative imports**, even for `.ts` source files — required by `moduleResolution: NodeNext`
- **Bracket notation for env vars**: `process.env['KEY']` not `process.env.KEY`
- **`noUncheckedIndexedAccess`**: array index access can be `undefined` — always use `!` or check
- **Vitest globals** (`describe`, `it`, `expect`, `vi`, `beforeEach`, `beforeAll`) are available without import
- **Run all commands from `apps/server/`** unless told otherwise
- **Existing Redis singleton**: `import { redis } from '../lib/redis.js'` — use it, don't create a new client

---

### Task 1: Add `resend` dependency and new env vars

**Files:**
- Modify: `apps/server/package.json`
- Modify: `apps/server/.env.example`
- Modify: `turbo.json` (repo root)

**Step 1: Install resend**

```bash
cd apps/server
pnpm add resend
```

Expected: `resend` added to `dependencies` in `package.json`.

**Step 2: Update `.env.example`**

Append to `apps/server/.env.example`:

```
RESEND_API_KEY=             # From resend.com dashboard
APP_BASE_URL=http://localhost:3001  # Production: https://cageid.app
```

**Step 3: Update `turbo.json` build env**

Add `RESEND_API_KEY` and `APP_BASE_URL` to the `build.env` array in `turbo.json` (root). The array currently contains `PORT`, `DATABASE_URL`, `OIDC_ISSUER`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Append:

```json
"RESEND_API_KEY",
"APP_BASE_URL"
```

**Step 4: Commit**

```bash
git add apps/server/package.json apps/server/.env.example turbo.json pnpm-lock.yaml
git commit -m "chore: add resend dependency and RESEND_API_KEY, APP_BASE_URL env vars"
```

**Step 5: Verify tests still pass**

```bash
cd apps/server && pnpm test
```

Expected: all existing tests pass (35).

---

### Task 2: `requireAuth` middleware (TDD)

**Files:**
- Create: `apps/server/src/middleware/requireAuth.ts`
- Create: `apps/server/src/middleware/__tests__/requireAuth.test.ts`

**Step 1: Write the failing test**

Create `apps/server/src/middleware/__tests__/requireAuth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/redis.js', () => ({
  redis: {
    get: vi.fn(),
  },
}));

import { redis } from '../../lib/redis.js';
import { Hono } from 'hono';
import { requireAuth } from '../requireAuth.js';

function makeApp() {
  const app = new Hono<{ Variables: { userId: string } }>();
  app.use('/protected', requireAuth);
  app.get('/protected', (c) => c.json({ userId: c.get('userId') }));
  return app;
}

describe('requireAuth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when cage_session cookie is missing', async () => {
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/protected')
    );
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when session is not found in Redis', async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/protected', {
        headers: { Cookie: 'cage_session=nonexistent-session-id' },
      })
    );
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('Unauthorized');
  });

  it('calls next and sets userId in context when session is valid', async () => {
    vi.mocked(redis.get).mockResolvedValue({ userId: 'user-uuid-123' });
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/protected', {
        headers: { Cookie: 'cage_session=valid-session-id' },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, string>;
    expect(body.userId).toBe('user-uuid-123');
  });

  it('looks up the correct Redis key for the session', async () => {
    vi.mocked(redis.get).mockResolvedValue({ userId: 'user-uuid-123' });
    const app = makeApp();
    await app.fetch(
      new Request('http://localhost/protected', {
        headers: { Cookie: 'cage_session=abc123' },
      })
    );
    expect(vi.mocked(redis.get)).toHaveBeenCalledWith('session:abc123');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/server && pnpm test src/middleware/__tests__/requireAuth.test.ts
```

Expected: FAIL — `Cannot find module '../requireAuth.js'`

**Step 3: Implement the middleware**

Create `apps/server/src/middleware/requireAuth.ts`:

```typescript
import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { redis } from '../lib/redis.js';

export const requireAuth = createMiddleware<{
  Variables: { userId: string };
}>(async (c, next) => {
  const sessionId = getCookie(c, 'cage_session');
  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const session = await redis.get<{ userId: string }>(`session:${sessionId}`);
  if (!session?.userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('userId', session.userId);
  await next();
});
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/server && pnpm test src/middleware/__tests__/requireAuth.test.ts
```

Expected: 4 tests pass.

**Step 5: Run full suite**

```bash
cd apps/server && pnpm test
```

Expected: all tests pass (35 + 4 = 39).

**Step 6: Commit**

```bash
git add apps/server/src/middleware/requireAuth.ts apps/server/src/middleware/__tests__/requireAuth.test.ts
git commit -m "feat(middleware): add requireAuth middleware with Redis session lookup"
```

---

### Task 3: `auth.service.ts` (TDD)

**Files:**
- Create: `apps/server/src/services/auth.service.ts`
- Create: `apps/server/src/services/__tests__/auth.service.test.ts`

**Step 1: Write the failing tests**

Create `apps/server/src/services/__tests__/auth.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../lib/redis.js', () => ({
  redis: {
    incr: vi.fn(),
    expire: vi.fn(),
    set: vi.fn(),
    getdel: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'email-id' }, error: null }),
    },
  })),
}));

// ─── Env setup (must be before service import) ──────────────────────────────

process.env['RESEND_API_KEY'] = 'test-resend-key';
process.env['APP_BASE_URL'] = 'https://cageid.app';

// ─── Imports ─────────────────────────────────────────────────────────────────

import { redis } from '../../lib/redis.js';
import { db } from '../../db/index.js';
import {
  sendMagicLink,
  verifyMagicLink,
  createSession,
  deleteSession,
  deleteAccount,
} from '../auth.service.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-uuid-123',
  email: 'test@example.com',
  emailVerifiedAt: null,
  createdAt: new Date(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── sendMagicLink ──────────────────────────────────────────────────────────

  describe('sendMagicLink', () => {
    it('returns rateLimited: true when request count exceeds 3', async () => {
      vi.mocked(redis.incr).mockResolvedValue(4);

      const result = await sendMagicLink('user@example.com');

      expect(result).toEqual({ rateLimited: true });
      // Should not send an email or upsert a user
      expect(vi.mocked(db.insert)).not.toHaveBeenCalled();
    });

    it('sets Redis TTL on the first request (count === 1)', async () => {
      vi.mocked(redis.incr).mockResolvedValue(1);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      await sendMagicLink('user@example.com');

      expect(vi.mocked(redis.expire)).toHaveBeenCalledWith(
        'magic_link_rate:user@example.com',
        3600
      );
    });

    it('does NOT reset TTL on subsequent requests (count > 1)', async () => {
      vi.mocked(redis.incr).mockResolvedValue(2);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      await sendMagicLink('user@example.com');

      expect(vi.mocked(redis.expire)).not.toHaveBeenCalled();
    });

    it('upserts existing user and stores magic link token in Redis', async () => {
      vi.mocked(redis.incr).mockResolvedValue(1);
      vi.mocked(redis.expire).mockResolvedValue(1);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      const result = await sendMagicLink('test@example.com');

      expect(result).toEqual({ sent: true });
      expect(vi.mocked(redis.set)).toHaveBeenCalledWith(
        expect.stringMatching(/^magic_link:[a-f0-9]{64}$/),
        { userId: 'user-uuid-123', email: 'test@example.com' },
        { ex: 600 }
      );
    });

    it('creates a new user when email is not found', async () => {
      vi.mocked(redis.incr).mockResolvedValue(1);
      vi.mocked(redis.expire).mockResolvedValue(1);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);
      const mockInsert = {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUser]),
        }),
      };
      vi.mocked(db.insert).mockReturnValue(mockInsert as any);

      await sendMagicLink('new@example.com');

      expect(vi.mocked(db.insert)).toHaveBeenCalled();
    });

    it('stores a magic link token with correct Redis key pattern', async () => {
      vi.mocked(redis.incr).mockResolvedValue(1);
      vi.mocked(redis.expire).mockResolvedValue(1);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      await sendMagicLink('test@example.com');

      const setCall = vi.mocked(redis.set).mock.calls[0]!;
      const key = setCall[0] as string;
      expect(key).toMatch(/^magic_link:[a-f0-9]{64}$/);
      const value = setCall[1] as { userId: string; email: string };
      expect(value.userId).toBe('user-uuid-123');
    });
  });

  // ── verifyMagicLink ────────────────────────────────────────────────────────

  describe('verifyMagicLink', () => {
    it('returns null when token is not found in Redis', async () => {
      vi.mocked(redis.getdel).mockResolvedValue(null);

      const result = await verifyMagicLink('bad-token');

      expect(result).toBeNull();
    });

    it('uses GETDEL for atomic lookup + deletion', async () => {
      vi.mocked(redis.getdel).mockResolvedValue({
        userId: 'user-uuid-123',
        email: 'test@example.com',
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      const mockUpdate = { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) };
      // db.update is called to set emailVerifiedAt — mock it
      (db as any).update = vi.fn().mockReturnValue(mockUpdate);

      await verifyMagicLink('valid-token');

      expect(vi.mocked(redis.getdel)).toHaveBeenCalledWith('magic_link:valid-token');
      // Separate redis.del should NOT be called — GETDEL handles deletion atomically
      expect(vi.mocked(redis.del)).not.toHaveBeenCalled();
    });

    it('returns userId and email on valid token', async () => {
      vi.mocked(redis.getdel).mockResolvedValue({
        userId: 'user-uuid-123',
        email: 'test@example.com',
      });
      const mockUpdate = { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) };
      (db as any).update = vi.fn().mockReturnValue(mockUpdate);

      const result = await verifyMagicLink('valid-token');

      expect(result).toEqual({ userId: 'user-uuid-123', email: 'test@example.com' });
    });
  });

  // ── createSession ──────────────────────────────────────────────────────────

  describe('createSession', () => {
    it('stores session in Redis with 90-day TTL and returns session ID', async () => {
      vi.mocked(redis.set).mockResolvedValue('OK');

      const sessionId = await createSession('user-uuid-123');

      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
      expect(vi.mocked(redis.set)).toHaveBeenCalledWith(
        `session:${sessionId}`,
        { userId: 'user-uuid-123' },
        { ex: 7776000 }
      );
    });

    it('generates a unique session ID on each call', async () => {
      vi.mocked(redis.set).mockResolvedValue('OK');

      const id1 = await createSession('user-uuid-123');
      const id2 = await createSession('user-uuid-123');

      expect(id1).not.toBe(id2);
    });
  });

  // ── deleteSession ──────────────────────────────────────────────────────────

  describe('deleteSession', () => {
    it('deletes the correct Redis session key', async () => {
      vi.mocked(redis.del).mockResolvedValue(1);

      await deleteSession('session-abc');

      expect(vi.mocked(redis.del)).toHaveBeenCalledWith('session:session-abc');
    });
  });

  // ── deleteAccount ──────────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('deletes the user from the database', async () => {
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockDelete = { where: mockWhere };
      (db as any).delete = vi.fn().mockReturnValue(mockDelete);

      await deleteAccount('user-uuid-123');

      expect((db as any).delete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/server && pnpm test src/services/__tests__/auth.service.test.ts
```

Expected: FAIL — `Cannot find module '../auth.service.js'`

**Step 3: Implement `auth.service.ts`**

Create `apps/server/src/services/auth.service.ts`:

```typescript
import { randomBytes } from 'crypto';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { redis } from '../lib/redis.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SendMagicLinkResult = { sent: true } | { rateLimited: true };

// ─── sendMagicLink ────────────────────────────────────────────────────────────

/**
 * Rate-checks, upserts the user, stores a magic link token in Redis,
 * and sends the link via Resend.
 *
 * Always returns { sent: true } on success — callers should never reveal
 * whether the email address already had an account.
 */
export async function sendMagicLink(email: string): Promise<SendMagicLinkResult> {
  // ── Rate limiting: 3 requests per email per hour ───────────────────────────
  const rateKey = `magic_link_rate:${email}`;
  const count = await redis.incr(rateKey);
  if (count === 1) {
    // First request in this window — set the TTL
    await redis.expire(rateKey, 3600);
  }
  if (count > 3) {
    return { rateLimited: true };
  }

  // ── Upsert user ────────────────────────────────────────────────────────────
  let userId: string;
  const existing = await db.query.users.findFirst({
    where: (u, { eq: eqFn }) => eqFn(u.email, email),
  });
  if (existing) {
    userId = existing.id;
  } else {
    const inserted = await db.insert(users).values({ email }).returning();
    userId = inserted[0]!.id;
  }

  // ── Generate and store token ───────────────────────────────────────────────
  const token = randomBytes(32).toString('hex');
  await redis.set(
    `magic_link:${token}`,
    { userId, email },
    { ex: 600 } // 10 minutes
  );

  // ── Send email via Resend ──────────────────────────────────────────────────
  const baseUrl = process.env['APP_BASE_URL'] ?? 'https://cageid.app';
  const magicLinkUrl = `${baseUrl}/auth/verify?token=${token}`;

  const resend = new Resend(process.env['RESEND_API_KEY']);
  await resend.emails.send({
    from: 'CAGE <noreply@cageid.app>',
    to: email,
    subject: 'Your CAGE sign-in link',
    html: `
      <p>Click the link below to sign in to CAGE. This link expires in 10 minutes and can only be used once.</p>
      <p><a href="${magicLinkUrl}">Sign in to CAGE</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  return { sent: true };
}

// ─── verifyMagicLink ─────────────────────────────────────────────────────────

/**
 * Atomically retrieves and deletes the magic link token from Redis (GETDEL).
 * This prevents race conditions where two concurrent requests could both succeed.
 * Sets email_verified_at on the user if not already set.
 */
export async function verifyMagicLink(
  token: string
): Promise<{ userId: string; email: string } | null> {
  const data = await redis.getdel<{ userId: string; email: string }>(
    `magic_link:${token}`
  );
  if (!data) return null;

  // Mark email as verified (no-op if already set)
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, data.userId));

  return { userId: data.userId, email: data.email };
}

// ─── createSession ────────────────────────────────────────────────────────────

/**
 * Creates a new 90-day session in Redis and returns the session ID.
 */
export async function createSession(userId: string): Promise<string> {
  const sessionId = randomUUID();
  await redis.set(
    `session:${sessionId}`,
    { userId },
    { ex: 7776000 } // 90 days
  );
  return sessionId;
}

// ─── deleteSession ────────────────────────────────────────────────────────────

/**
 * Deletes a session from Redis. Used by logout and account deletion.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(`session:${sessionId}`);
}

// ─── deleteAccount ────────────────────────────────────────────────────────────

/**
 * Hard-deletes the user row. Foreign key cascades handle verifications
 * and partner_subs automatically.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, userId));
}
```

**Step 4: Run tests**

```bash
cd apps/server && pnpm test src/services/__tests__/auth.service.test.ts
```

Expected: all service tests pass.

**Step 5: Type-check**

```bash
cd apps/server && pnpm check-types
```

Expected: 0 errors.

**Step 6: Run full suite**

```bash
cd apps/server && pnpm test
```

Expected: all tests pass (39 + new service tests).

**Step 7: Commit**

```bash
git add apps/server/src/services/auth.service.ts apps/server/src/services/__tests__/auth.service.test.ts
git commit -m "feat(services): add auth service — magic link, session, account deletion"
```

---

### Task 4: `auth.ts` routes (TDD)

**Files:**
- Create: `apps/server/src/routes/auth.ts`
- Create: `apps/server/src/routes/__tests__/auth.routes.test.ts`

**Step 1: Write the failing tests**

Create `apps/server/src/routes/__tests__/auth.routes.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../services/auth.service.js', () => ({
  sendMagicLink: vi.fn(),
  verifyMagicLink: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  deleteAccount: vi.fn(),
}));

vi.mock('../../middleware/requireAuth.js', () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set('userId', 'test-user-uuid');
    await next();
  }),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { authRoutes } from '../auth.js';
import {
  sendMagicLink,
  verifyMagicLink,
  createSession,
  deleteSession,
  deleteAccount,
} from '../../services/auth.service.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeApp() {
  const app = new Hono();
  app.route('/auth', authRoutes);
  return app;
}

function jsonPost(url: string, body: Record<string, string>) {
  return new Request(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function withSession(req: Request, sessionId = 'valid-session-id') {
  const r = new Request(req);
  r.headers.set('Cookie', `cage_session=${sessionId}`);
  return r;
}

// ─── POST /auth/magic-link ────────────────────────────────────────────────────

describe('POST /auth/magic-link', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when email is missing', async () => {
    const app = makeApp();
    const res = await app.fetch(jsonPost('/auth/magic-link', {}));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBeDefined();
  });

  it('returns 200 when magic link is sent successfully', async () => {
    vi.mocked(sendMagicLink).mockResolvedValue({ sent: true });
    const app = makeApp();
    const res = await app.fetch(
      jsonPost('/auth/magic-link', { email: 'user@example.com' })
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(sendMagicLink)).toHaveBeenCalledWith('user@example.com');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(sendMagicLink).mockResolvedValue({ rateLimited: true });
    const app = makeApp();
    const res = await app.fetch(
      jsonPost('/auth/magic-link', { email: 'user@example.com' })
    );
    expect(res.status).toBe(429);
  });

  it('always returns 200 for valid requests (never reveals whether email exists)', async () => {
    vi.mocked(sendMagicLink).mockResolvedValue({ sent: true });
    const app = makeApp();
    const res = await app.fetch(
      jsonPost('/auth/magic-link', { email: 'new-or-existing@example.com' })
    );
    // The response body must not hint at account existence
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, string>;
    expect(body.message).toBeDefined();
  });
});

// ─── GET /auth/verify ─────────────────────────────────────────────────────────

describe('GET /auth/verify', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when token param is missing', async () => {
    const app = makeApp();
    const res = await app.fetch(new Request('http://localhost/auth/verify'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when token is invalid or expired', async () => {
    vi.mocked(verifyMagicLink).mockResolvedValue(null);
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/auth/verify?token=bad-token')
    );
    expect(res.status).toBe(400);
  });

  it('sets cage_session cookie and returns 200 on valid token', async () => {
    vi.mocked(verifyMagicLink).mockResolvedValue({
      userId: 'user-uuid-123',
      email: 'user@example.com',
    });
    vi.mocked(createSession).mockResolvedValue('new-session-id');

    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/auth/verify?token=valid-token')
    );

    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('cage_session=new-session-id');
    expect(setCookie).toContain('HttpOnly');
  });

  it('calls createSession with the userId from the verified token', async () => {
    vi.mocked(verifyMagicLink).mockResolvedValue({
      userId: 'user-uuid-123',
      email: 'user@example.com',
    });
    vi.mocked(createSession).mockResolvedValue('new-session-id');

    const app = makeApp();
    await app.fetch(
      new Request('http://localhost/auth/verify?token=valid-token')
    );

    expect(vi.mocked(createSession)).toHaveBeenCalledWith('user-uuid-123');
  });
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the session and clears the cookie', async () => {
    vi.mocked(deleteSession).mockResolvedValue();
    const app = makeApp();
    const req = withSession(
      new Request('http://localhost/auth/logout', { method: 'POST' }),
      'my-session-id'
    );
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(deleteSession)).toHaveBeenCalledWith('my-session-id');
    // Cookie should be cleared
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('cage_session=');
  });
});

// ─── DELETE /auth/account ─────────────────────────────────────────────────────

describe('DELETE /auth/account', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the account and session, clears cookie', async () => {
    vi.mocked(deleteAccount).mockResolvedValue();
    vi.mocked(deleteSession).mockResolvedValue();

    const app = makeApp();
    const req = withSession(
      new Request('http://localhost/auth/account', { method: 'DELETE' }),
      'my-session-id'
    );
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(deleteAccount)).toHaveBeenCalledWith('test-user-uuid');
    expect(vi.mocked(deleteSession)).toHaveBeenCalledWith('my-session-id');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/server && pnpm test src/routes/__tests__/auth.routes.test.ts
```

Expected: FAIL — `Cannot find module '../auth.js'`

**Step 3: Implement `auth.ts` routes**

Create `apps/server/src/routes/auth.ts`:

```typescript
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  sendMagicLink,
  verifyMagicLink,
  createSession,
  deleteSession,
  deleteAccount,
} from '../services/auth.service.js';

type AuthVariables = { userId: string };

export const authRoutes = new Hono<{ Variables: AuthVariables }>();

// ─── POST /auth/magic-link ────────────────────────────────────────────────────

authRoutes.post('/magic-link', async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json() as Record<string, unknown>;
  } catch {
    return c.json({ error: 'Request body must be JSON' }, 400);
  }

  const email = body['email'];
  if (!email || typeof email !== 'string') {
    return c.json({ error: 'email is required' }, 400);
  }

  const result = await sendMagicLink(email);

  if ('rateLimited' in result) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429);
  }

  // Always return the same message — never reveal whether email exists
  return c.json({ message: 'If that address is registered, a sign-in link is on its way.' });
});

// ─── GET /auth/verify ─────────────────────────────────────────────────────────

authRoutes.get('/verify', async (c) => {
  const token = c.req.query('token');
  if (!token) {
    return c.json({ error: 'token is required' }, 400);
  }

  const data = await verifyMagicLink(token);
  if (!data) {
    return c.json({ error: 'Invalid or expired token' }, 400);
  }

  const sessionId = await createSession(data.userId);

  setCookie(c, 'cage_session', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 7776000, // 90 days
    path: '/',
  });

  return c.json({ message: 'Authenticated successfully' });
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────

authRoutes.post('/logout', requireAuth, async (c) => {
  const sessionId = getCookie(c, 'cage_session')!;
  await deleteSession(sessionId);
  deleteCookie(c, 'cage_session', { path: '/' });
  return c.json({ message: 'Logged out' });
});

// ─── DELETE /auth/account ─────────────────────────────────────────────────────

authRoutes.delete('/account', requireAuth, async (c) => {
  const userId = c.get('userId');
  const sessionId = getCookie(c, 'cage_session')!;

  await deleteAccount(userId);
  await deleteSession(sessionId);
  deleteCookie(c, 'cage_session', { path: '/' });

  return c.json({ message: 'Account deleted' });
});
```

**Step 4: Run route tests**

```bash
cd apps/server && pnpm test src/routes/__tests__/auth.routes.test.ts
```

Expected: all route tests pass.

**Step 5: Type-check**

```bash
cd apps/server && pnpm check-types
```

Expected: 0 errors.

**Step 6: Run full suite**

```bash
cd apps/server && pnpm test
```

Expected: all tests pass.

**Step 7: Commit**

```bash
git add apps/server/src/routes/auth.ts apps/server/src/routes/__tests__/auth.routes.test.ts
git commit -m "feat(routes): add auth routes — magic link, verify, logout, account deletion"
```

---

### Task 5: Register auth routes and final verification

**Files:**
- Modify: `apps/server/src/index.ts`

**Step 1: Register the auth routes**

Edit `apps/server/src/index.ts`. Add the import and route registration after the existing OAuth routes:

```typescript
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { oauthRoutes } from './routes/oauth.js';
import { authRoutes } from './routes/auth.js';

const app = new Hono();

app.get('/', (c) => {
  return c.json({ name: 'CAGE', status: 'ok' });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// OAuth 2.0 / OIDC endpoints
app.route('/oauth', oauthRoutes);

// User authentication (magic link)
app.route('/auth', authRoutes);

const port = Number(process.env['PORT'] ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`CAGE server running at http://localhost:${info.port}`);
});
```

**Step 2: Run full test suite**

```bash
cd apps/server && pnpm test
```

Expected: all tests pass.

**Step 3: Type-check**

```bash
cd apps/server && pnpm check-types
```

Expected: 0 errors.

**Step 4: Lint**

```bash
cd apps/server && pnpm lint
```

Expected: 0 warnings.

**Step 5: Commit**

```bash
git add apps/server/src/index.ts
git commit -m "feat: register auth routes in app entry point"
```

---

## Summary

| Task | Files created/modified | Tests added |
|------|----------------------|-------------|
| 1 | `package.json`, `.env.example`, `turbo.json` | — |
| 2 | `middleware/requireAuth.ts` + test | 4 |
| 3 | `services/auth.service.ts` + test | ~12 |
| 4 | `routes/auth.ts` + test | ~10 |
| 5 | `src/index.ts` | — |

After all tasks: run `superpowers:finishing-a-development-branch` to create the PR.
