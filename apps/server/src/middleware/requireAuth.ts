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
