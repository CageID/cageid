import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context, Next } from 'hono';

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

// ─── GET /verify/start ──────────────────────────────────────────────────────

describe('GET /verify/start', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects (302) to the Veriff verification URL on success', async () => {
    vi.mocked(createVeriffSession).mockResolvedValue({
      veriffSessionId: 'session-abc',
      verificationUrl: 'https://veriff.me/v/abc123',
    });
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/verify/start')
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://veriff.me/v/abc123');
  });

  it('calls createVeriffSession with the userId from the session', async () => {
    vi.mocked(createVeriffSession).mockResolvedValue({
      veriffSessionId: 'session-abc',
      verificationUrl: 'https://veriff.me/v/abc123',
    });
    const app = makeApp();
    await app.fetch(
      new Request('http://localhost/verify/start')
    );
    expect(vi.mocked(createVeriffSession)).toHaveBeenCalledWith('test-user-uuid');
  });

  it('returns 502 HTML when createVeriffSession throws', async () => {
    vi.mocked(createVeriffSession).mockRejectedValue(
      new Error('Veriff API error: 500')
    );
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/verify/start')
    );
    expect(res.status).toBe(502);
    const body = await res.text();
    expect(body).toContain('Unable to start verification');
  });
});

// ─── GET /verify/status ─────────────────────────────────────────────────────

describe('GET /verify/status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the verification status as JSON', async () => {
    vi.mocked(getVerificationStatus).mockResolvedValue({ status: 'pending' });
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/verify/status')
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, string>;
    expect(body).toEqual({ status: 'pending' });
  });

  it('returns { status: "none" } when no verification row exists', async () => {
    vi.mocked(getVerificationStatus).mockResolvedValue({ status: 'none' });
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/verify/status')
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, string>;
    expect(body).toEqual({ status: 'none' });
  });
});

// ─── GET /verify/callback ───────────────────────────────────────────────────

describe('GET /verify/callback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects to /auth/magic-link when no cage_session cookie is present', async () => {
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/verify/callback')
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/auth/magic-link');
  });

  it('redirects to /auth/magic-link when session is not found in Redis', async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    const app = makeApp();
    const req = withSession(
      new Request('http://localhost/verify/callback')
    );
    const res = await app.fetch(req);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/auth/magic-link');
  });

  it('returns HTML polling page when session is valid', async () => {
    vi.mocked(redis.get).mockResolvedValue({ userId: 'test-user-uuid' });
    const app = makeApp();
    const req = withSession(
      new Request('http://localhost/verify/callback')
    );
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('/verify/status');
    expect(body).toContain('/oauth/authorize');
  });
});

// ─── POST /verify/webhook ───────────────────────────────────────────────────

describe('POST /verify/webhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls handleWebhook with the raw body and x-hmac-signature header', async () => {
    vi.mocked(handleWebhook).mockResolvedValue({ ok: true });
    const app = makeApp();
    const payload = JSON.stringify({ status: 'approved', verification: { id: 'v1' } });
    await app.fetch(
      new Request('http://localhost/verify/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hmac-signature': 'abc123signature',
        },
        body: payload,
      })
    );
    expect(vi.mocked(handleWebhook)).toHaveBeenCalledWith(payload, 'abc123signature');
  });

  it('returns 400 when handleWebhook reports invalid_signature', async () => {
    vi.mocked(handleWebhook).mockResolvedValue({ error: 'invalid_signature' });
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/verify/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hmac-signature': 'bad-sig',
        },
        body: '{}',
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body).toEqual({ error: 'Invalid signature' });
  });

  it('returns 200 on successful webhook processing', async () => {
    vi.mocked(handleWebhook).mockResolvedValue({ ok: true });
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/verify/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hmac-signature': 'valid-sig',
        },
        body: '{"status":"approved"}',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, boolean>;
    expect(body).toEqual({ ok: true });
  });
});
