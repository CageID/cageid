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

  await deleteAccount(userId);
  await deleteSession(sessionId);
  deleteCookie(c, 'cage_session', { path: '/' });

  return c.json({ message: 'Account deleted' });
});
