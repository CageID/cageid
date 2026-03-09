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

// ─── GET /verify/start ──────────────────────────────────────────────────────

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

// ─── POST /verify/webhook ───────────────────────────────────────────────────

verifyRoutes.post('/webhook', async (c) => {
  const rawBody   = await c.req.text();
  const signature = c.req.header('x-hmac-signature') ?? '';
  const result = await handleWebhook(rawBody, signature);
  if ('error' in result && result.error === 'invalid_signature') {
    return c.json({ error: 'Invalid signature' }, 400);
  }
  return c.json({ ok: true });
});

// ─── GET /verify/callback ───────────────────────────────────────────────────

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

// ─── GET /verify/status ─────────────────────────────────────────────────────

verifyRoutes.get('/status', requireAuth, async (c) => {
  const userId = c.get('userId');
  const result = await getVerificationStatus(userId);

  // Check for pending OAuth flow — frontend uses this to redirect after verification
  const sessionId = getCookie(c, 'cage_session');
  let hasPendingOAuth = false;
  if (sessionId) {
    const session = await redis.get<{
      userId: string;
      pending_oauth?: { client_id: string; redirect_uri: string; state?: string };
    }>(`session:${sessionId}`);
    hasPendingOAuth = !!session?.pending_oauth;
  }

  return c.json({ ...result, hasPendingOAuth });
});

// ─── Callback page HTML ─────────────────────────────────────────────────────

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
    const TIMEOUT  = 30000;
    const INTERVAL = 2000;

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
          document.getElementById('message').textContent = 'Verification successful! Redirecting\\u2026';
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
        setTimeout(poll, INTERVAL);
      } catch {
        setTimeout(poll, INTERVAL);
      }
    }

    setTimeout(poll, INTERVAL);
  </script>
</body>
</html>`;
}
