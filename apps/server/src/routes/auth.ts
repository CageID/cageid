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
  const source = typeof body['source'] === 'string' ? body['source'] : undefined;

  const result = await sendMagicLink(email, next, source);

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

  // ── Extension login: return HTML page with session data for content script ──
  const source = c.req.query('source');
  if (source === 'extension') {
    return c.html(extensionVerifyPage(sessionId, data.email));
  }

  // ── Normal web login: set cookie and redirect ──────────────────────────────
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
  // Match by hostname regardless of protocol (http vs https)
  const appBase = process.env['APP_BASE_URL'] ?? 'http://localhost:3001';
  if (data.next) {
    try {
      const nextUrl = new URL(data.next);
      const baseUrl = new URL(appBase);
      if (nextUrl.host === baseUrl.host) {
        return c.redirect(`${webBase}/api${nextUrl.pathname}${nextUrl.search}`);
      }
    } catch {
      // Invalid URL — fall through to dashboard
    }
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

// ─── Extension verify page HTML ──────────────────────────────────────────────

function extensionVerifyPage(sessionId: string, email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CAGE — Extension Sign In</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0; background: #fafaf7; color: #1c1f00;
    }
    .card {
      text-align: center; padding: 2.5rem; max-width: 400px;
      background: white; border-radius: 16px;
      border: 1px solid rgba(153, 156, 126, 0.2);
    }
    .logo { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 1rem; }
    .check {
      width: 48px; height: 48px; border-radius: 50%;
      background: rgba(160, 255, 87, 0.15); display: flex;
      align-items: center; justify-content: center;
      margin: 0 auto 1rem; font-size: 24px;
    }
    h1 { font-size: 18px; font-weight: 600; margin: 0 0 0.5rem; }
    p { color: #999c7e; font-size: 14px; margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">CAGE</div>
    <div class="check">\u2713</div>
    <h1>Signed in to CAGE extension</h1>
    <p>You can close this tab and return to the extension.</p>
  </div>
  <div id="cage-ext-session"
       data-session-id="${sessionId}"
       data-email="${email}"
       style="display:none;"></div>
</body>
</html>`;
}
