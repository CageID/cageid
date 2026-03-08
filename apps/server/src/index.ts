import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { oauthRoutes } from './routes/oauth.js';
import { authRoutes } from './routes/auth.js';
import { verifyRoutes } from './routes/verify.js';

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

// Identity verification (Veriff)
app.route('/verify', verifyRoutes);

const port = Number(process.env['PORT'] ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`CAGE server running at http://localhost:${info.port}`);
});
