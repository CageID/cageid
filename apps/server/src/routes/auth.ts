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

  // Basic email format validation — prevents garbage user creation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({ error: 'Invalid email address' }, 400);
  }

  // Optional: where to redirect after login (used by OAuth flow)
  const next = typeof body['next'] === 'string' ? body['next'] : undefined;

  const result = await sendMagicLink(email, next);

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

  const webBase = process.env['WEB_BASE_URL'] ?? 'https://cageid.app';

  // If a `next` URL was stored (e.g. from OAuth flow), redirect there instead of dashboard.
  // Rewrite server-direct URLs to go through the frontend proxy so the session cookie
  // (set on the frontend's domain) is included in the subsequent request.
  const appBase = process.env['APP_BASE_URL'] ?? 'http://localhost:3001';
  if (data.next && data.next.startsWith(appBase)) {
    const nextPath = data.next.slice(appBase.length); // e.g., "/oauth/authorize?..."
    return c.redirect(`${webBase}/api${nextPath}`);
  }

  return c.redirect(`${webBase}/dashboard`);
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────

authRoutes.post('/logout', requireAuth, async (c) => {
  const sessionId = getCookie(c, 'cage_session');
  if (!sessionId) return c.json({ error: 'Unauthorized' }, 401);
  await deleteSession(sessionId);
  deleteCookie(c, 'cage_session', { path: '/' });
  return c.json({ message: 'Logged out' });
});

// ─── DELETE /auth/account ─────────────────────────────────────────────────────

authRoutes.delete('/account', requireAuth, async (c) => {
  const userId = c.get('userId');
  const sessionId = getCookie(c, 'cage_session');
  if (!sessionId) return c.json({ error: 'Unauthorized' }, 401);

  // Delete session first — prevents ghost session if DB delete fails
  await deleteSession(sessionId);
  await deleteAccount(userId);
  deleteCookie(c, 'cage_session', { path: '/' });

  return c.json({ message: 'Account deleted' });
});
