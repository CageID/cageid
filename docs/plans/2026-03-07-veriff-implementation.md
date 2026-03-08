# Veriff Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the full Veriff age verification flow: create a Veriff session on demand, receive and verify HMAC-signed webhook decisions, compute age floor from DOB, and resume the OAuth flow automatically once approved.

**Architecture:** Four endpoints (`GET /verify/start`, `POST /verify/webhook`, `GET /verify/callback`, `GET /verify/status`) backed by `verify.service.ts`. Route handlers are thin — all logic lives in the service. The callback page is static HTML with a 2-second polling loop; on approval it does `window.location.href = '/oauth/authorize'` and the authorize handler reads `pending_oauth` from the Redis session to resume the flow. The webhook reads the raw request body before any JSON parsing and verifies the HMAC-SHA256 signature using `crypto.timingSafeEqual`.

**Tech Stack:** Hono, Drizzle ORM, `@upstash/redis`, Node.js built-in `crypto` — no new npm dependencies.

**Run all tests from `apps/server`:**
```bash
cd apps/server && pnpm test
```

---

### Task 1: Environment variables

**Files:**
- Modify: `apps/server/.env.example`
- Modify: `turbo.json`

**Step 1: Add Veriff env vars to `.env.example`**

Append to `apps/server/.env.example`:
```
VERIFF_API_KEY=             # From Veriff dashboard → API keys
VERIFF_WEBHOOK_SECRET=      # From Veriff dashboard → Webhooks → signing secret
VERIFF_BASE_URL=https://stationapi.veriff.com  # Veriff REST API base URL
```

**Step 2: Add to `turbo.json` build env**

In `turbo.json`, find the `"env"` array inside `"build"` and add the three new vars:
```json
"env": [
  "PORT", "DATABASE_URL", "OIDC_ISSUER",
  "JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY",
  "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
  "RESEND_API_KEY", "APP_BASE_URL",
  "VERIFF_API_KEY", "VERIFF_WEBHOOK_SECRET", "VERIFF_BASE_URL"
]
```

**Step 3: Commit**
```bash
git add apps/server/.env.example turbo.json
git commit -m "chore: add Veriff env vars to config"
```

---

### Task 2: `computeAgeFloor` — pure function, TDD

**Files:**
- Create: `apps/server/src/services/verify.service.ts`
- Create: `apps/server/src/services/__tests__/verify.service.test.ts`

**Step 1: Create the test file with failing tests**

Create `apps/server/src/services/__tests__/verify.service.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

// ── Imports ──────────────────────────────────────────────────────────────────
// (mocks come before imports in later tasks; computeAgeFloor has no deps)

import { computeAgeFloor } from '../verify.service.js';

// Fixed reference date for deterministic tests
const TODAY = new Date('2026-03-07');

describe('computeAgeFloor', () => {
  it('returns 21 for someone aged 21 or older', () => {
    expect(computeAgeFloor('2005-01-01', TODAY)).toBe(21); // birthday passed
  });

  it('returns 18 for someone aged exactly 18 (birthday already passed this year)', () => {
    expect(computeAgeFloor('2008-01-01', TODAY)).toBe(18);
  });

  it('returns null for someone whose 18th birthday is later this year', () => {
    expect(computeAgeFloor('2008-12-31', TODAY)).toBeNull();
  });

  it('returns null for someone under 18', () => {
    expect(computeAgeFloor('2015-06-15', TODAY)).toBeNull();
  });

  it('returns 18 (not 21) for someone aged 20 (birthday already passed this year)', () => {
    expect(computeAgeFloor('2006-01-01', TODAY)).toBe(18);
  });

  it('returns 18 for someone who just turned 21 but birthday not yet this year — still 20', () => {
    // DOB 2005-12-31: born Dec 31 2005. By March 7 2026, age is 20 (birthday not yet).
    expect(computeAgeFloor('2005-12-31', TODAY)).toBe(18);
  });

  it('returns 21 for someone who turned 21 this year (birthday already passed)', () => {
    // DOB 2005-01-01: born Jan 1 2005. By March 7 2026, birthday has passed, age is 21.
    expect(computeAgeFloor('2005-01-01', TODAY)).toBe(21);
  });

  it('defaults today to current date when not provided', () => {
    // Just verify it doesn't throw and returns a number or null
    const result = computeAgeFloor('1990-01-01');
    expect(result === 21 || result === 18 || result === null).toBe(true);
  });
});
```

**Step 2: Run tests — expect FAIL (module not found)**
```bash
cd apps/server && pnpm test --reporter=verbose 2>&1 | head -30
```
Expected: `Cannot find module '../verify.service.js'`

**Step 3: Create `verify.service.ts` with `computeAgeFloor`**

Create `apps/server/src/services/verify.service.ts`:

```typescript
import { createHmac, timingSafeEqual } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { verifications } from '../db/schema.js';

// ─── computeAgeFloor ─────────────────────────────────────────────────────────

/**
 * Computes the CAGE age floor (18 or 21) from a date of birth string.
 * Returns null if the person is under 18.
 *
 * Age is computed by calendar year subtraction, adjusted if the birthday
 * hasn't occurred yet this year. Do NOT use millisecond arithmetic — it
 * drifts with leap years.
 *
 * @param dateOfBirth - ISO date string 'YYYY-MM-DD'
 * @param today       - Reference date (defaults to now; injectable for tests)
 */
export function computeAgeFloor(dateOfBirth: string, today = new Date()): number | null {
  const [birthYearStr, birthMonthStr, birthDayStr] = dateOfBirth.split('-');
  const birthYear  = parseInt(birthYearStr!,  10);
  const birthMonth = parseInt(birthMonthStr!, 10);
  const birthDay   = parseInt(birthDayStr!,   10);

  let age = today.getFullYear() - birthYear;

  // If the birthday hasn't occurred yet this calendar year, subtract one
  const birthdayThisYear = new Date(today.getFullYear(), birthMonth - 1, birthDay);
  if (today < birthdayThisYear) {
    age--;
  }

  if (age >= 21) return 21;
  if (age >= 18) return 18;
  return null;
}
```

**Step 4: Run tests — expect all `computeAgeFloor` tests PASS**
```bash
cd apps/server && pnpm test --reporter=verbose 2>&1 | grep -E "computeAgeFloor|PASS|FAIL"
```
Expected: all 8 `computeAgeFloor` tests pass.

**Step 5: Commit**
```bash
git add apps/server/src/services/verify.service.ts \
        apps/server/src/services/__tests__/verify.service.test.ts
git commit -m "feat: add computeAgeFloor with tests"
```

---

### Task 3: `createVeriffSession` — service function, TDD

**Files:**
- Modify: `apps/server/src/services/verify.service.ts`
- Modify: `apps/server/src/services/__tests__/verify.service.test.ts`

**Step 1: Add failing tests for `createVeriffSession`**

Add this block to the test file, before the closing brace of the file (after the computeAgeFloor describe block). First, add the mocks at the top of the file — the entire test file must be rewritten to add the mock infrastructure. Replace the file contents with:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      users:         { findFirst: vi.fn() },
      verifications: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

// ─── Env setup ───────────────────────────────────────────────────────────────

process.env['VERIFF_API_KEY']        = 'test-api-key';
process.env['VERIFF_WEBHOOK_SECRET'] = 'test-webhook-secret';
process.env['VERIFF_BASE_URL']       = 'https://stationapi.veriff.com';
process.env['APP_BASE_URL']          = 'https://cageid.app';

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { db } from '../../db/index.js';
import {
  computeAgeFloor,
  createVeriffSession,
} from '../verify.service.js';

// Fixed reference date for deterministic tests
const TODAY = new Date('2026-03-07');

// ─── computeAgeFloor ─────────────────────────────────────────────────────────

describe('computeAgeFloor', () => {
  it('returns 21 for someone aged 21 or older', () => {
    expect(computeAgeFloor('2005-01-01', TODAY)).toBe(21);
  });

  it('returns 18 for someone aged exactly 18 (birthday already passed this year)', () => {
    expect(computeAgeFloor('2008-01-01', TODAY)).toBe(18);
  });

  it('returns null for someone whose 18th birthday is later this year', () => {
    expect(computeAgeFloor('2008-12-31', TODAY)).toBeNull();
  });

  it('returns null for someone under 18', () => {
    expect(computeAgeFloor('2015-06-15', TODAY)).toBeNull();
  });

  it('returns 18 (not 21) for someone aged 20 (birthday already passed this year)', () => {
    expect(computeAgeFloor('2006-01-01', TODAY)).toBe(18);
  });

  it('returns 18 for someone whose 21st birthday is later this year', () => {
    expect(computeAgeFloor('2005-12-31', TODAY)).toBe(18);
  });

  it('returns 21 for someone who turned 21 this year (birthday already passed)', () => {
    expect(computeAgeFloor('2005-01-01', TODAY)).toBe(21);
  });

  it('defaults today to current date when not provided', () => {
    const result = computeAgeFloor('1990-01-01');
    expect(result === 21 || result === 18 || result === null).toBe(true);
  });
});

// ─── createVeriffSession ─────────────────────────────────────────────────────

describe('createVeriffSession', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the Veriff API with the correct headers and vendorData', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        verification: {
          id:  'veriff-session-uuid',
          url: 'https://alchemy.veriff.com/v/veriff-session-uuid',
        },
      }),
    });

    const mockValues = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as unknown as ReturnType<typeof db.insert>);

    await createVeriffSession('user-uuid-123');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://stationapi.veriff.com/v1/sessions',
      expect.objectContaining({
        method:  'POST',
        headers: expect.objectContaining({ 'X-AUTH-CLIENT': 'test-api-key' }),
        body:    expect.stringContaining('"vendorData":"user-uuid-123"'),
      })
    );
  });

  it('inserts a pending verifications row', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        verification: { id: 'sess-1', url: 'https://alchemy.veriff.com/v/sess-1' },
      }),
    });

    const mockValues = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as unknown as ReturnType<typeof db.insert>);

    await createVeriffSession('user-uuid-123');

    expect(vi.mocked(db.insert)).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId:          'user-uuid-123',
        veriffSessionId: 'sess-1',
        status:          'pending',
      })
    );
  });

  it('returns veriffSessionId and verificationUrl on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        verification: { id: 'sess-1', url: 'https://alchemy.veriff.com/v/sess-1' },
      }),
    });

    const mockValues = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as unknown as ReturnType<typeof db.insert>);

    const result = await createVeriffSession('user-uuid-123');

    expect(result).toEqual({
      veriffSessionId:  'sess-1',
      verificationUrl: 'https://alchemy.veriff.com/v/sess-1',
    });
  });

  it('throws when the Veriff API returns a non-OK response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    await expect(createVeriffSession('user-uuid-123')).rejects.toThrow('Veriff API error');
  });

  it('does NOT insert a DB row when the API call fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    await expect(createVeriffSession('user-uuid-123')).rejects.toThrow();
    expect(vi.mocked(db.insert)).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run tests — expect `createVeriffSession` tests to FAIL**
```bash
cd apps/server && pnpm test --reporter=verbose 2>&1 | grep -E "createVeriffSession|not a function|FAIL"
```
Expected: `createVeriffSession is not a function` (not exported yet).

**Step 3: Implement `createVeriffSession` in `verify.service.ts`**

Add after the `computeAgeFloor` function:

```typescript
// ─── Types ────────────────────────────────────────────────────────────────────

interface VeriffSessionResponse {
  status: string;
  verification: {
    id:  string;
    url: string;
  };
}

// ─── createVeriffSession ──────────────────────────────────────────────────────

/**
 * Calls the Veriff REST API to create a new verification session, then inserts
 * a pending `verifications` row. Returns the Veriff session ID and the URL
 * to redirect the user to.
 *
 * Throws on API error — callers should catch and return a 502.
 * Does NOT insert a DB row if the API call fails.
 */
export async function createVeriffSession(
  userId: string
): Promise<{ veriffSessionId: string; verificationUrl: string }> {
  const baseUrl   = process.env['VERIFF_BASE_URL'] ?? 'https://stationapi.veriff.com';
  const apiKey    = process.env['VERIFF_API_KEY']  ?? '';
  const appBase   = process.env['APP_BASE_URL']    ?? 'https://cageid.app';

  const response = await fetch(`${baseUrl}/v1/sessions`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'X-AUTH-CLIENT': apiKey,
    },
    body: JSON.stringify({
      verification: {
        callback:   `${appBase}/verify/callback`,
        vendorData: userId,
        timestamp:  new Date().toISOString(),
        lang:       'en',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Veriff API error: ${response.status}`);
  }

  const data = (await response.json()) as VeriffSessionResponse;
  const veriffSessionId  = data.verification.id;
  const verificationUrl  = data.verification.url;

  // Insert pending row — after confirming API success
  await db.insert(verifications).values({
    userId,
    veriffSessionId,
    status: 'pending',
  });

  return { veriffSessionId, verificationUrl };
}
```

**Step 4: Run tests — expect all tests PASS**
```bash
cd apps/server && pnpm test --reporter=verbose 2>&1 | grep -E "PASS|FAIL|✓|✗"
```

**Step 5: Commit**
```bash
git add apps/server/src/services/verify.service.ts \
        apps/server/src/services/__tests__/verify.service.test.ts
git commit -m "feat: add createVeriffSession with tests"
```

---

### Task 4: `getVerificationStatus` — service function, TDD

**Files:**
- Modify: `apps/server/src/services/verify.service.ts`
- Modify: `apps/server/src/services/__tests__/verify.service.test.ts`

**Step 1: Add failing tests**

Append to the test file (add to imports and add a new describe block):

Add `getVerificationStatus` to the import line:
```typescript
import {
  computeAgeFloor,
  createVeriffSession,
  getVerificationStatus,
} from '../verify.service.js';
```

Add this describe block after the `createVeriffSession` describe:

```typescript
// ─── getVerificationStatus ────────────────────────────────────────────────────

describe('getVerificationStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns { status: "none" } when no verifications row exists', async () => {
    vi.mocked(db.query.verifications.findFirst).mockResolvedValue(undefined);

    const result = await getVerificationStatus('user-uuid-123');

    expect(result).toEqual({ status: 'none' });
  });

  it('returns { status: "pending" } when the latest row is pending', async () => {
    vi.mocked(db.query.verifications.findFirst).mockResolvedValue({
      id: 'v-1', userId: 'user-uuid-123', veriffSessionId: 'sess-1',
      status: 'pending', ageFloor: null, verifiedAt: null, expiresAt: null,
      createdAt: new Date(),
    });

    const result = await getVerificationStatus('user-uuid-123');

    expect(result).toEqual({ status: 'pending' });
  });

  it('returns { status: "approved" } when the latest row is approved', async () => {
    vi.mocked(db.query.verifications.findFirst).mockResolvedValue({
      id: 'v-1', userId: 'user-uuid-123', veriffSessionId: 'sess-1',
      status: 'approved', ageFloor: 21, verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000), createdAt: new Date(),
    });

    const result = await getVerificationStatus('user-uuid-123');

    expect(result).toEqual({ status: 'approved' });
  });

  it('returns { status: "declined" } when the latest row is declined', async () => {
    vi.mocked(db.query.verifications.findFirst).mockResolvedValue({
      id: 'v-1', userId: 'user-uuid-123', veriffSessionId: 'sess-1',
      status: 'declined', ageFloor: null, verifiedAt: null, expiresAt: null,
      createdAt: new Date(),
    });

    const result = await getVerificationStatus('user-uuid-123');

    expect(result).toEqual({ status: 'declined' });
  });
});
```

**Step 2: Run tests — expect `getVerificationStatus` tests to FAIL**
```bash
cd apps/server && pnpm test --reporter=verbose 2>&1 | grep -E "getVerificationStatus|FAIL"
```

**Step 3: Implement `getVerificationStatus` in `verify.service.ts`**

Add after `createVeriffSession`:

```typescript
// ─── getVerificationStatus ────────────────────────────────────────────────────

/**
 * Returns the most recent verification status for a user.
 * Returns { status: 'none' } if no row exists.
 */
export async function getVerificationStatus(
  userId: string
): Promise<{ status: 'pending' | 'approved' | 'declined' | 'none' }> {
  const row = await db.query.verifications.findFirst({
    where: (v, { eq: eqFn }) => eqFn(v.userId, userId),
    orderBy: (v, { desc }) => [desc(v.createdAt)],
  });

  if (!row) return { status: 'none' };
  return { status: row.status };
}
```

**Step 4: Run tests — expect all PASS**
```bash
cd apps/server && pnpm test --reporter=verbose
```

**Step 5: Commit**
```bash
git add apps/server/src/services/verify.service.ts \
        apps/server/src/services/__tests__/verify.service.test.ts
git commit -m "feat: add getVerificationStatus with tests"
```

---

### Task 5: `handleWebhook` — service function, TDD

This is the most complex service function: HMAC verification, age floor computation, DB update.

**Files:**
- Modify: `apps/server/src/services/verify.service.ts`
- Modify: `apps/server/src/services/__tests__/verify.service.test.ts`

**Step 1: Add failing tests**

Add `handleWebhook` to the import:
```typescript
import {
  computeAgeFloor,
  createVeriffSession,
  getVerificationStatus,
  handleWebhook,
} from '../verify.service.js';
```

Add a helper at the top of the test file (after the `TODAY` const) to compute a valid HMAC for tests:

```typescript
import { createHmac } from 'crypto';

function makeSignature(body: string): string {
  return createHmac('sha256', 'test-webhook-secret').update(body).digest('hex');
}
```

Add this describe block after `getVerificationStatus`:

```typescript
// ─── handleWebhook ────────────────────────────────────────────────────────────

describe('handleWebhook', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── HMAC verification ────────────────────────────────────────────────────

  it('returns { error: "invalid_signature" } on HMAC mismatch', async () => {
    const body = JSON.stringify({ status: 'approved', verification: { id: 's1', vendorData: 'u1' } });
    const result = await handleWebhook(body, 'wrong-signature');
    expect(result).toEqual({ error: 'invalid_signature' });
  });

  it('returns { error: "invalid_signature" } for empty signature', async () => {
    const body = JSON.stringify({ status: 'approved', verification: { id: 's1', vendorData: 'u1' } });
    const result = await handleWebhook(body, '');
    expect(result).toEqual({ error: 'invalid_signature' });
  });

  // ── No-op statuses ────────────────────────────────────────────────────────

  it('returns { ok: true } and does nothing for non-approved/declined statuses', async () => {
    const body = JSON.stringify({
      status: 'resubmission_requested',
      verification: { id: 'sess-1', vendorData: 'user-1' },
    });
    const result = await handleWebhook(body, makeSignature(body));
    expect(result).toEqual({ ok: true });
    expect(vi.mocked(db.update)).not.toHaveBeenCalled();
  });

  it('returns { ok: true } and does nothing for unknown userId', async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

    const body = JSON.stringify({
      status: 'approved',
      verification: {
        id:         'sess-1',
        vendorData: 'unknown-user',
        person:     { dateOfBirth: '1990-01-01' },
      },
    });
    const result = await handleWebhook(body, makeSignature(body));
    expect(result).toEqual({ ok: true });
    expect(vi.mocked(db.update)).not.toHaveBeenCalled();
  });

  // ── Declined ──────────────────────────────────────────────────────────────

  it('updates the verifications row to declined on declined status', async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user-1', email: 'u@e.com', emailVerifiedAt: null, createdAt: new Date(),
    });

    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet   = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as ReturnType<typeof db.update>);

    const body = JSON.stringify({
      status: 'declined',
      verification: { id: 'sess-1', vendorData: 'user-1' },
    });
    const result = await handleWebhook(body, makeSignature(body));

    expect(result).toEqual({ ok: true });
    expect(mockSet).toHaveBeenCalledWith({ status: 'declined' });
    expect(mockWhere).toHaveBeenCalled();
  });

  // ── Approved — age floor 21 ───────────────────────────────────────────────

  it('sets age_floor=21 for someone old enough', async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user-1', email: 'u@e.com', emailVerifiedAt: null, createdAt: new Date(),
    });

    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet   = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as ReturnType<typeof db.update>);

    const body = JSON.stringify({
      status: 'approved',
      verification: {
        id:         'sess-1',
        vendorData: 'user-1',
        person:     { dateOfBirth: '1990-01-01' },
      },
    });
    const result = await handleWebhook(body, makeSignature(body));

    expect(result).toEqual({ ok: true });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved', ageFloor: 21 })
    );
  });

  // ── Approved — age floor 18 ───────────────────────────────────────────────

  it('sets age_floor=18 for someone aged 18–20', async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user-1', email: 'u@e.com', emailVerifiedAt: null, createdAt: new Date(),
    });

    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet   = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as ReturnType<typeof db.update>);

    const body = JSON.stringify({
      status: 'approved',
      verification: {
        id:         'sess-1',
        vendorData: 'user-1',
        person:     { dateOfBirth: '2008-01-01' }, // 18 years old in 2026, birthday passed
      },
    });
    const result = await handleWebhook(body, makeSignature(body));

    expect(result).toEqual({ ok: true });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved', ageFloor: 18 })
    );
  });

  // ── Approved — under 18 edge case ────────────────────────────────────────

  it('sets status=declined and emits console.warn when Veriff approves someone under 18', async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user-1', email: 'u@e.com', emailVerifiedAt: null, createdAt: new Date(),
    });

    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet   = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as ReturnType<typeof db.update>);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const body = JSON.stringify({
      status: 'approved',
      verification: {
        id:         'sess-1',
        vendorData: 'user-1',
        person:     { dateOfBirth: '2015-06-15' }, // 10 years old
      },
    });
    const result = await handleWebhook(body, makeSignature(body));

    expect(result).toEqual({ ok: true });
    expect(mockSet).toHaveBeenCalledWith({ status: 'declined' });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' })
    );

    warnSpy.mockRestore();
  });

  // ── sets verifiedAt and expiresAt (12 months from now) ───────────────────

  it('sets verifiedAt and expiresAt (~12 months) on approval', async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user-1', email: 'u@e.com', emailVerifiedAt: null, createdAt: new Date(),
    });

    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet   = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as ReturnType<typeof db.update>);

    const body = JSON.stringify({
      status: 'approved',
      verification: {
        id:         'sess-1',
        vendorData: 'user-1',
        person:     { dateOfBirth: '1990-01-01' },
      },
    });
    await handleWebhook(body, makeSignature(body));

    const setArg = mockSet.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArg['verifiedAt']).toBeInstanceOf(Date);
    expect(setArg['expiresAt']).toBeInstanceOf(Date);

    const expiresAt = setArg['expiresAt'] as Date;
    const verifiedAt = setArg['verifiedAt'] as Date;
    const diffMs = expiresAt.getTime() - verifiedAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // Should be approximately 365 days (12 months)
    expect(diffDays).toBeGreaterThan(364);
    expect(diffDays).toBeLessThan(367);
  });
});
```

**Step 2: Run tests — expect `handleWebhook` tests to FAIL**
```bash
cd apps/server && pnpm test --reporter=verbose 2>&1 | grep -E "handleWebhook|FAIL"
```

**Step 3: Implement `handleWebhook` in `verify.service.ts`**

Add imports at the top of `verify.service.ts` if not already present:
```typescript
import { createHmac, timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, verifications } from '../db/schema.js';
```

(Note: also import `users` from schema.)

Add after `getVerificationStatus`:

```typescript
// ─── handleWebhook ────────────────────────────────────────────────────────────

type WebhookResult = { ok: true } | { error: 'invalid_signature' };

interface VeriffWebhookPayload {
  status: string;
  verification: {
    id:         string;   // veriffSessionId
    vendorData: string;   // userId
    person?: {
      dateOfBirth?: string;
    };
  };
}

/**
 * Verifies the HMAC-SHA256 signature on a Veriff webhook and updates the
 * verifications row accordingly.
 *
 * Security notes:
 * - Raw body must be read BEFORE any JSON parsing (call c.req.text() in the route)
 * - Uses timingSafeEqual to prevent timing-based HMAC reconstruction attacks
 * - Always returns { ok: true } for valid requests regardless of outcome
 *   (except HMAC failure) — Veriff retries on non-200 responses
 *
 * @param rawBody   The raw request body as a string (before JSON parsing)
 * @param signature The value of the x-hmac-signature request header
 */
export async function handleWebhook(
  rawBody: string,
  signature: string
): Promise<WebhookResult> {
  // ── HMAC verification ────────────────────────────────────────────────────
  const secret   = process.env['VERIFF_WEBHOOK_SECRET'] ?? '';
  const computed = createHmac('sha256', secret).update(rawBody).digest('hex');

  const computedBuf  = Buffer.from(computed);
  const receivedBuf  = Buffer.from(signature);

  if (
    computedBuf.length !== receivedBuf.length ||
    !timingSafeEqual(computedBuf, receivedBuf)
  ) {
    return { error: 'invalid_signature' };
  }

  // ── Parse payload ────────────────────────────────────────────────────────
  const payload = JSON.parse(rawBody) as VeriffWebhookPayload;
  const { status, verification } = payload;
  const { id: veriffSessionId, vendorData: userId } = verification;

  // Only act on approved and declined — ignore all other statuses
  if (status !== 'approved' && status !== 'declined') {
    return { ok: true };
  }

  // Verify user exists — no-op if not (don't leak user existence)
  const user = await db.query.users.findFirst({
    where: (u, { eq: eqFn }) => eqFn(u.id, userId),
  });
  if (!user) return { ok: true };

  // ── Declined ─────────────────────────────────────────────────────────────
  if (status === 'declined') {
    await db
      .update(verifications)
      .set({ status: 'declined' })
      .where(eq(verifications.veriffSessionId, veriffSessionId));
    return { ok: true };
  }

  // ── Approved ─────────────────────────────────────────────────────────────
  const dateOfBirth = verification.person?.dateOfBirth;
  if (!dateOfBirth) {
    // Defensive: Veriff approved without a DOB — treat as declined
    await db
      .update(verifications)
      .set({ status: 'declined' })
      .where(eq(verifications.veriffSessionId, veriffSessionId));
    return { ok: true };
  }

  const ageFloor = computeAgeFloor(dateOfBirth);

  if (ageFloor === null) {
    // Veriff approved someone CAGE computes as under 18.
    // Log for debuggability — no PII (no DOB, no email).
    const today = new Date();
    const [byStr, bmStr, bdStr] = dateOfBirth.split('-');
    let computedAge = today.getFullYear() - parseInt(byStr!, 10);
    if (today < new Date(today.getFullYear(), parseInt(bmStr!, 10) - 1, parseInt(bdStr!, 10))) {
      computedAge--;
    }
    console.warn({ userId, computedAge });

    await db
      .update(verifications)
      .set({ status: 'declined' })
      .where(eq(verifications.veriffSessionId, veriffSessionId));
    return { ok: true };
  }

  // All checks passed — mark approved with age floor and expiry
  const now       = new Date();
  const expiresAt = new Date(now);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 12-month validity

  await db
    .update(verifications)
    .set({ status: 'approved', ageFloor, verifiedAt: now, expiresAt })
    .where(eq(verifications.veriffSessionId, veriffSessionId));

  return { ok: true };
}
```

Also add `users` to the schema import at the top of verify.service.ts:
```typescript
import { verifications, users } from '../db/schema.js';
```

**Step 4: Run all service tests — expect all PASS**
```bash
cd apps/server && pnpm test --reporter=verbose
```

**Step 5: Commit**
```bash
git add apps/server/src/services/verify.service.ts \
        apps/server/src/services/__tests__/verify.service.test.ts
git commit -m "feat: add handleWebhook with HMAC verification and age floor"
```

---

### Task 6: Route handlers — all four endpoints + route tests

**Files:**
- Create: `apps/server/src/routes/verify.ts`
- Create: `apps/server/src/routes/__tests__/verify.routes.test.ts`

**Step 1: Create the route test file with failing tests**

Create `apps/server/src/routes/__tests__/verify.routes.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context, Next } from 'hono';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../services/verify.service.js', () => ({
  createVeriffSession:   vi.fn(),
  handleWebhook:         vi.fn(),
  getVerificationStatus: vi.fn(),
}));

vi.mock('../../middleware/requireAuth.js', () => ({
  requireAuth: vi.fn(async (c: Context, next: Next) => {
    c.set('userId', 'test-user-uuid');
    await next();
  }),
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    get: vi.fn(),
  },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { verifyRoutes } from '../verify.js';
import {
  createVeriffSession,
  handleWebhook,
  getVerificationStatus,
} from '../../services/verify.service.js';
import { redis } from '../../lib/redis.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeApp() {
  const app = new Hono();
  app.route('/verify', verifyRoutes);
  return app;
}

function withSession(req: Request, sessionId = 'valid-session-id') {
  const headers = new Headers(req.headers);
  headers.set('Cookie', `cage_session=${sessionId}`);
  return new Request(req, { headers });
}

// ─── GET /verify/start ────────────────────────────────────────────────────────

describe('GET /verify/start', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects to the Veriff verification URL on success', async () => {
    vi.mocked(createVeriffSession).mockResolvedValue({
      veriffSessionId:  'sess-1',
      verificationUrl: 'https://alchemy.veriff.com/v/sess-1',
    });

    const app = makeApp();
    const req = withSession(new Request('http://localhost/verify/start'));
    const res = await app.fetch(req);

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://alchemy.veriff.com/v/sess-1');
  });

  it('calls createVeriffSession with the userId from the session', async () => {
    vi.mocked(createVeriffSession).mockResolvedValue({
      veriffSessionId:  'sess-1',
      verificationUrl: 'https://alchemy.veriff.com/v/sess-1',
    });

    const app = makeApp();
    const req = withSession(new Request('http://localhost/verify/start'));
    await app.fetch(req);

    expect(vi.mocked(createVeriffSession)).toHaveBeenCalledWith('test-user-uuid');
  });

  it('returns 502 HTML when createVeriffSession throws', async () => {
    vi.mocked(createVeriffSession).mockRejectedValue(new Error('Veriff API error: 500'));

    const app = makeApp();
    const req = withSession(new Request('http://localhost/verify/start'));
    const res = await app.fetch(req);

    expect(res.status).toBe(502);
    const body = await res.text();
    expect(body).toContain('Unable to start verification');
  });
});

// ─── GET /verify/status ───────────────────────────────────────────────────────

describe('GET /verify/status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the verification status as JSON', async () => {
    vi.mocked(getVerificationStatus).mockResolvedValue({ status: 'pending' });

    const app = makeApp();
    const req = withSession(new Request('http://localhost/verify/status'));
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, string>;
    expect(body['status']).toBe('pending');
  });

  it('returns { status: "none" } when no verification row exists', async () => {
    vi.mocked(getVerificationStatus).mockResolvedValue({ status: 'none' });

    const app = makeApp();
    const req = withSession(new Request('http://localhost/verify/status'));
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, string>;
    expect(body['status']).toBe('none');
  });
});

// ─── GET /verify/callback ─────────────────────────────────────────────────────

describe('GET /verify/callback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 302 to /auth/magic-link when no cage_session cookie is present', async () => {
    const app = makeApp();
    const res = await app.fetch(new Request('http://localhost/verify/callback'));

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/auth/magic-link');
  });

  it('returns 302 to /auth/magic-link when session is not found in Redis', async () => {
    vi.mocked(redis.get).mockResolvedValue(null);

    const app = makeApp();
    const req = withSession(new Request('http://localhost/verify/callback'));
    const res = await app.fetch(req);

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/auth/magic-link');
  });

  it('returns HTML polling page when session is valid', async () => {
    vi.mocked(redis.get).mockResolvedValue({ userId: 'test-user-uuid' });

    const app = makeApp();
    const req = withSession(new Request('http://localhost/verify/callback'));
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('/verify/status');   // polling target
    expect(body).toContain('/oauth/authorize'); // redirect on approval
  });
});

// ─── POST /verify/webhook ─────────────────────────────────────────────────────

describe('POST /verify/webhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls handleWebhook with the raw body string and signature header', async () => {
    vi.mocked(handleWebhook).mockResolvedValue({ ok: true });

    const body = JSON.stringify({
      status: 'approved',
      verification: { id: 'sess-1', vendorData: 'user-1', person: { dateOfBirth: '1990-01-01' } },
    });
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/verify/webhook', {
        method:  'POST',
        body,
        headers: {
          'Content-Type':      'application/json',
          'x-hmac-signature':  'valid-sig',
        },
      })
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(handleWebhook)).toHaveBeenCalledWith(body, 'valid-sig');
  });

  it('returns 400 when handleWebhook reports invalid_signature', async () => {
    vi.mocked(handleWebhook).mockResolvedValue({ error: 'invalid_signature' });

    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/verify/webhook', {
        method:  'POST',
        body:    '{}',
        headers: { 'x-hmac-signature': 'bad-sig' },
      })
    );

    expect(res.status).toBe(400);
  });

  it('returns 200 on successful webhook processing', async () => {
    vi.mocked(handleWebhook).mockResolvedValue({ ok: true });

    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/verify/webhook', {
        method:  'POST',
        body:    '{"status":"declined","verification":{"id":"s1","vendorData":"u1"}}',
        headers: { 'x-hmac-signature': 'some-sig' },
      })
    );

    expect(res.status).toBe(200);
  });
});
```

**Step 2: Run tests — expect FAIL (route file not found)**
```bash
cd apps/server && pnpm test --reporter=verbose 2>&1 | grep -E "verify.routes|Cannot find|FAIL" | head -20
```

**Step 3: Create `routes/verify.ts`**

Create `apps/server/src/routes/verify.ts`:

```typescript
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { requireAuth } from '../middleware/requireAuth.js';
import { redis } from '../lib/redis.js';
import {
  createVeriffSession,
  handleWebhook,
  getVerificationStatus,
} from '../services/verify.service.js';

type VerifyVariables = { userId: string };

export const verifyRoutes = new Hono<{ Variables: VerifyVariables }>();

// ─── GET /verify/start ────────────────────────────────────────────────────────
// Creates a Veriff session and redirects the user to Veriff's hosted SDK.
// Reached via 302 redirect from /oauth/authorize when user is unverified.

verifyRoutes.get('/start', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const { verificationUrl } = await createVeriffSession(userId);
    return c.redirect(verificationUrl);
  } catch {
    return c.html(
      '<h1>Error</h1><p>Unable to start verification. Please try again later.</p>',
      502
    );
  }
});

// ─── POST /verify/webhook ─────────────────────────────────────────────────────
// Receives Veriff's decision webhook. Authenticated via HMAC-SHA256.
// CRITICAL: Read raw body with c.req.text() BEFORE any JSON parsing.
// Veriff expects a 200 response to stop retrying — only return non-200 on HMAC failure.

verifyRoutes.post('/webhook', async (c) => {
  const rawBody  = await c.req.text(); // must be first — reads raw bytes
  const signature = c.req.header('x-hmac-signature') ?? '';

  const result = await handleWebhook(rawBody, signature);

  if ('error' in result && result.error === 'invalid_signature') {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  return c.json({ ok: true });
});

// ─── GET /verify/callback ─────────────────────────────────────────────────────
// Veriff redirects the user here after they finish (or abandon) the ID check.
// Returns an HTML page that polls /verify/status every 2 seconds.
// Does NOT use requireAuth — handles session expiry gracefully (→ magic link).

verifyRoutes.get('/callback', async (c) => {
  const sessionId = getCookie(c, 'cage_session');
  if (!sessionId) {
    return c.redirect('/auth/magic-link');
  }

  const session = await redis.get<{ userId: string }>(`session:${sessionId}`);
  if (!session?.userId) {
    return c.redirect('/auth/magic-link');
  }

  return c.html(callbackPage());
});

// ─── GET /verify/status ───────────────────────────────────────────────────────
// Polled by the callback page. Returns the current verification status for
// the authenticated user. Returns { status: "none" } if no row exists yet.

verifyRoutes.get('/status', requireAuth, async (c) => {
  const userId = c.get('userId');
  const result = await getVerificationStatus(userId);
  return c.json(result);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function callbackPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CAGE — Verifying your identity</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { text-align: center; padding: 2rem; max-width: 400px; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e5e7eb;
               border-top-color: #111; border-radius: 50%;
               animation: spin 0.8s linear infinite; margin: 0 auto 1.5rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: #374151; margin: 0; }
    a { color: #111; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner" id="spinner"></div>
    <p id="message">Verifying your identity&hellip; This usually takes just a moment.</p>
  </div>
  <script>
    const start    = Date.now();
    const TIMEOUT  = 30000; // 30 seconds
    const INTERVAL = 2000;  // poll every 2 seconds

    async function poll() {
      if (Date.now() - start > TIMEOUT) {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('message').innerHTML =
          'This is taking longer than expected. You can close this tab and ' +
          '<a href="/auth/magic-link">sign in again</a> once your verification is complete.';
        return;
      }

      try {
        const res  = await fetch('/verify/status');
        const data = await res.json();

        if (data.status === 'approved') {
          document.getElementById('message').textContent =
            'Verification successful! Redirecting\u2026';
          window.location.href = '/oauth/authorize';
          return;
        }

        if (data.status === 'declined') {
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('message').innerHTML =
            'Verification was not successful. You must be 18 or older to use CAGE. ' +
            '<a href="/auth/magic-link">Return to sign in</a>.';
          return;
        }

        // pending or none — keep polling
        setTimeout(poll, INTERVAL);
      } catch {
        // Network error — keep trying
        setTimeout(poll, INTERVAL);
      }
    }

    setTimeout(poll, INTERVAL);
  </script>
</body>
</html>`;
}
```

**Step 4: Run tests — expect all route tests PASS**
```bash
cd apps/server && pnpm test --reporter=verbose
```

**Step 5: Commit**
```bash
git add apps/server/src/routes/verify.ts \
        apps/server/src/routes/__tests__/verify.routes.test.ts
git commit -m "feat: add verify routes with tests"
```

---

### Task 7: Register `verifyRoutes` in `index.ts`

**Files:**
- Modify: `apps/server/src/index.ts`

**Step 1: Add the import and `app.route` call**

In `apps/server/src/index.ts`, add after the existing imports:
```typescript
import { verifyRoutes } from './routes/verify.js';
```

And add after `app.route('/auth', authRoutes)`:
```typescript
// Veriff age verification endpoints
app.route('/verify', verifyRoutes);
```

**Step 2: Type-check**
```bash
cd apps/server && pnpm check-types
```
Expected: no errors.

**Step 3: Commit**
```bash
git add apps/server/src/index.ts
git commit -m "feat: register verifyRoutes in server entry point"
```

---

### Task 8: Update `oauth.ts` — redirect to `/verify/start` + `pending_oauth` resumption

The OAuth authorize endpoint currently redirects unverified users to `/verify` (which doesn't exist yet) and returns a 400 when params are missing. Both need updating.

**Files:**
- Modify: `apps/server/src/routes/oauth.ts`
- Modify: `apps/server/src/routes/__tests__/oauth.authorize.test.ts`

**Step 1: Read the existing authorize test file before modifying**

Look at `apps/server/src/routes/__tests__/oauth.authorize.test.ts` to understand the current test coverage before adding new tests.

**Step 2: Add failing tests for the new behaviors**

In `oauth.authorize.test.ts`, add two new test cases to the relevant describe block:

```typescript
// In the describe block for GET /oauth/authorize, add:

it('redirects to /verify/start when user has no valid verification', async () => {
  // user is authenticated but has no approved verification
  vi.mocked(redis.get).mockResolvedValue({ userId: 'test-user-uuid' });
  vi.mocked(findActivePartner).mockResolvedValue(mockPartner);
  vi.mocked(db.query.verifications.findFirst).mockResolvedValue(undefined);

  const app = makeApp();
  const req = withSession(
    new Request(
      'http://localhost/oauth/authorize?client_id=partner-uuid&redirect_uri=https%3A%2F%2Fexample.com%2Fcb&response_type=code&state=abc'
    )
  );
  const res = await app.fetch(req);

  expect(res.status).toBe(302);
  expect(res.headers.get('location')).toBe('/verify/start');
});

it('resumes OAuth flow from pending_oauth when no query params are provided', async () => {
  // After verification, the callback page redirects to /oauth/authorize with no params.
  // The handler should read pending_oauth from the session and proceed.
  vi.mocked(redis.get).mockResolvedValue({
    userId: 'test-user-uuid',
    pending_oauth: {
      client_id:    mockPartner.id,
      redirect_uri: 'https://example.com/cb',
      state:        'xyz',
    },
  });
  vi.mocked(findActivePartner).mockResolvedValue(mockPartner);
  vi.mocked(db.query.verifications.findFirst).mockResolvedValue({
    id: 'v-1', userId: 'test-user-uuid', veriffSessionId: 'sess-1',
    status: 'approved', ageFloor: 21,
    verifiedAt: new Date(), expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
  });
  vi.mocked(db.query.partnerSubs.findFirst).mockResolvedValue({
    id: 'ps-1', userId: 'test-user-uuid', partnerId: mockPartner.id,
    subHash: 'sub-hash-abc', createdAt: new Date(),
  });
  vi.mocked(generateAuthCode).mockReturnValue('auth-code-xyz');
  vi.mocked(redis.set).mockResolvedValue('OK');

  const app = makeApp();
  // No query params — just the session cookie
  const req = withSession(new Request('http://localhost/oauth/authorize'));
  const res = await app.fetch(req);

  // Should issue an auth code and redirect to the partner's redirect_uri
  expect(res.status).toBe(302);
  expect(res.headers.get('location')).toContain('https://example.com/cb');
  expect(res.headers.get('location')).toContain('code=auth-code-xyz');
});
```

**Step 3: Run tests — expect new tests to FAIL**
```bash
cd apps/server && pnpm test --reporter=verbose 2>&1 | grep -E "resumes|redirects to.*verify|FAIL"
```

**Step 4: Update `oauth.ts` — two changes**

**Change 1:** Update the no-verification redirect from `/verify` → `/verify/start`, and store `pending_oauth` properly.

Find the block that starts with `if (!verification) {` and update it:

```typescript
  if (!verification) {
    // Store OAuth params in session for flow resumption after verification
    await redis.set(
      `session:${sessionId}`,
      { userId, pending_oauth: { client_id, redirect_uri, state } },
      { ex: 1800 }
    );
    return c.redirect('/verify/start');  // ← was '/verify'
  }
```

**Change 2:** At the top of the authorize handler, add `pending_oauth` resumption logic. Replace the existing param destructuring and validation block:

```typescript
oauthRoutes.get("/authorize", async (c) => {
  let { client_id, redirect_uri, state, response_type } = c.req.query();

  // If params are missing, check session for pending_oauth (resuming after Veriff verification).
  // The callback page redirects to /oauth/authorize with no query params.
  if (!client_id || !redirect_uri || !response_type) {
    const sessionId = getCookie(c, "cage_session");
    if (sessionId) {
      const session = await redis.get<{
        userId: string;
        pending_oauth?: { client_id: string; redirect_uri: string; state?: string };
      }>(`session:${sessionId}`);

      if (session?.pending_oauth) {
        client_id      = session.pending_oauth.client_id;
        redirect_uri   = session.pending_oauth.redirect_uri;
        state          = session.pending_oauth.state;
        response_type  = 'code';
      }
    }
  }

  // 1. Basic param validation
  if (!client_id || !redirect_uri || !response_type) {
    return c.text("Missing required parameters: client_id, redirect_uri, response_type", 400);
  }
  // ... rest of handler unchanged ...
```

**Step 5: Run all tests — expect all PASS**
```bash
cd apps/server && pnpm test --reporter=verbose
```

**Step 6: Type-check and lint**
```bash
cd apps/server && pnpm check-types && pnpm lint
```
Expected: no errors or warnings.

**Step 7: Commit**
```bash
git add apps/server/src/routes/oauth.ts \
        apps/server/src/routes/__tests__/oauth.authorize.test.ts
git commit -m "feat: update OAuth authorize to redirect to /verify/start and resume from pending_oauth"
```

---

### Task 9: Final verification

**Step 1: Run the full test suite**
```bash
cd apps/server && pnpm test
```
Expected: all tests pass, zero failures.

**Step 2: Type-check the whole monorepo**
```bash
pnpm check-types
```
Expected: no errors.

**Step 3: Lint**
```bash
pnpm lint
```
Expected: zero warnings (ESLint is configured with `--max-warnings 0`).

**Step 4: Commit if anything needed fixing**

If lint or type-check flagged anything, fix and commit before proceeding.

---

### Done

All four verify endpoints are implemented and tested. The full flow works:

1. `/oauth/authorize` → no verification → stores `pending_oauth` → redirects to `/verify/start`
2. `/verify/start` → creates Veriff session → redirects to Veriff SDK URL
3. User completes Veriff → browser lands on `/verify/callback`
4. Callback page polls `/verify/status` every 2 seconds
5. Webhook arrives → HMAC verified → row updated → status becomes `approved`
6. Polling detects `approved` → `window.location.href = '/oauth/authorize'`
7. Authorize reads `pending_oauth` from session → resumes OAuth flow → issues auth code
