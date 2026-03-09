import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { redis } from '../lib/redis.js';

export const requireAuth = createMiddleware<{
  Variables: { userId: string };
}>(async (c, next) => {
  // Try Bearer token first (used by Chrome extension), then fall back to cookie
  let sessionId: string | undefined;

  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    sessionId = authHeader.slice(7);
  }

  if (!sessionId) {
    sessionId = getCookie(c, 'cage_session');
  }

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
