import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context, Next } from 'hono';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../services/auth.service.js', () => ({
  sendMagicLink: vi.fn(),
  verifyMagicLink: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  deleteAccount: vi.fn(),
}));

vi.mock('../../middleware/requireAuth.js', () => ({
  requireAuth: vi.fn(async (c: Context, next: Next) => {
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
  const headers = new Headers(req.headers);
  headers.set('Cookie', `cage_session=${sessionId}`);
  return new Request(req, { headers });
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

  it('returns 400 for malformed email address', async () => {
    const app = makeApp();
    const res = await app.fetch(
      jsonPost('/auth/magic-link', { email: 'notanemail' })
    );
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBeDefined();
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

  it('sets cage_session cookie and redirects to dashboard on valid token', async () => {
    vi.mocked(verifyMagicLink).mockResolvedValue({
      userId: 'user-uuid-123',
      email: 'user@example.com',
    });
    vi.mocked(createSession).mockResolvedValue('new-session-id');

    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/auth/verify?token=valid-token')
    );

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/dashboard');
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
