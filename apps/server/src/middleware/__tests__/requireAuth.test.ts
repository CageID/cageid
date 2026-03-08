import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/redis.js', () => ({
  redis: {
    get: vi.fn(),
  },
}));

import { redis } from '../../lib/redis.js';
import { Hono } from 'hono';
import { requireAuth } from '../requireAuth.js';

function makeApp() {
  const app = new Hono<{ Variables: { userId: string } }>();
  app.use('/protected', requireAuth);
  app.get('/protected', (c) => c.json({ userId: c.get('userId') }));
  return app;
}

describe('requireAuth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when cage_session cookie is missing', async () => {
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/protected')
    );
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when session is not found in Redis', async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/protected', {
        headers: { Cookie: 'cage_session=nonexistent-session-id' },
      })
    );
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('Unauthorized');
  });

  it('calls next and sets userId in context when session is valid', async () => {
    vi.mocked(redis.get).mockResolvedValue({ userId: 'user-uuid-123' });
    const app = makeApp();
    const res = await app.fetch(
      new Request('http://localhost/protected', {
        headers: { Cookie: 'cage_session=valid-session-id' },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, string>;
    expect(body.userId).toBe('user-uuid-123');
  });

  it('looks up the correct Redis key for the session', async () => {
    vi.mocked(redis.get).mockResolvedValue({ userId: 'user-uuid-123' });
    const app = makeApp();
    await app.fetch(
      new Request('http://localhost/protected', {
        headers: { Cookie: 'cage_session=abc123' },
      })
    );
    expect(vi.mocked(redis.get)).toHaveBeenCalledWith('session:abc123');
  });
});
