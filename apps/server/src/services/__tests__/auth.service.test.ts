import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../lib/redis.js', () => ({
  redis: {
    incr: vi.fn(),
    expire: vi.fn(),
    set: vi.fn(),
    getdel: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'email-id' }, error: null }),
    },
  })),
}));

// ─── Env setup (must be before service import) ──────────────────────────────

process.env['RESEND_API_KEY'] = 'test-resend-key';
process.env['APP_BASE_URL'] = 'https://cageid.app';

// ─── Imports ─────────────────────────────────────────────────────────────────

import { redis } from '../../lib/redis.js';
import { db } from '../../db/index.js';
import {
  sendMagicLink,
  verifyMagicLink,
  createSession,
  deleteSession,
  deleteAccount,
} from '../auth.service.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-uuid-123',
  email: 'test@example.com',
  emailVerifiedAt: null,
  createdAt: new Date(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── sendMagicLink ──────────────────────────────────────────────────────────

  describe('sendMagicLink', () => {
    it('returns rateLimited: true when request count exceeds 3', async () => {
      vi.mocked(redis.incr).mockResolvedValue(4);

      const result = await sendMagicLink('user@example.com');

      expect(result).toEqual({ rateLimited: true });
      // Should not send an email or upsert a user
      expect(vi.mocked(db.insert)).not.toHaveBeenCalled();
    });

    it('sets Redis TTL on the first request (count === 1)', async () => {
      vi.mocked(redis.incr).mockResolvedValue(1);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      await sendMagicLink('user@example.com');

      expect(vi.mocked(redis.expire)).toHaveBeenCalledWith(
        'magic_link_rate:user@example.com',
        3600
      );
    });

    it('does NOT reset TTL on subsequent requests (count > 1)', async () => {
      vi.mocked(redis.incr).mockResolvedValue(2);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      await sendMagicLink('user@example.com');

      expect(vi.mocked(redis.expire)).not.toHaveBeenCalled();
    });

    it('upserts existing user and stores magic link token in Redis', async () => {
      vi.mocked(redis.incr).mockResolvedValue(1);
      vi.mocked(redis.expire).mockResolvedValue(1);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      const result = await sendMagicLink('test@example.com');

      expect(result).toEqual({ sent: true });
      expect(vi.mocked(redis.set)).toHaveBeenCalledWith(
        expect.stringMatching(/^magic_link:[a-f0-9]{64}$/),
        { userId: 'user-uuid-123', email: 'test@example.com' },
        { ex: 600 }
      );
    });

    it('creates a new user when email is not found', async () => {
      vi.mocked(redis.incr).mockResolvedValue(1);
      vi.mocked(redis.expire).mockResolvedValue(1);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);
      const mockInsert = {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUser]),
        }),
      };
      vi.mocked(db.insert).mockReturnValue(mockInsert as any);

      await sendMagicLink('new@example.com');

      expect(vi.mocked(db.insert)).toHaveBeenCalled();
    });

    it('stores a magic link token with correct Redis key pattern', async () => {
      vi.mocked(redis.incr).mockResolvedValue(1);
      vi.mocked(redis.expire).mockResolvedValue(1);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      await sendMagicLink('test@example.com');

      const setCall = vi.mocked(redis.set).mock.calls[0]!;
      const key = setCall[0] as string;
      expect(key).toMatch(/^magic_link:[a-f0-9]{64}$/);
      const value = setCall[1] as { userId: string; email: string };
      expect(value.userId).toBe('user-uuid-123');
    });
  });

  // ── verifyMagicLink ────────────────────────────────────────────────────────

  describe('verifyMagicLink', () => {
    it('returns null when token is not found in Redis', async () => {
      vi.mocked(redis.getdel).mockResolvedValue(null);

      const result = await verifyMagicLink('bad-token');

      expect(result).toBeNull();
    });

    it('uses GETDEL for atomic lookup + deletion', async () => {
      vi.mocked(redis.getdel).mockResolvedValue({
        userId: 'user-uuid-123',
        email: 'test@example.com',
      });
      // db.update mock — we mock it on the db object directly
      (db as any).update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await verifyMagicLink('valid-token');

      expect(vi.mocked(redis.getdel)).toHaveBeenCalledWith('magic_link:valid-token');
      // Separate redis.del should NOT be called — GETDEL handles deletion atomically
      expect(vi.mocked(redis.del)).not.toHaveBeenCalled();
    });

    it('returns userId and email on valid token', async () => {
      vi.mocked(redis.getdel).mockResolvedValue({
        userId: 'user-uuid-123',
        email: 'test@example.com',
      });
      (db as any).update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await verifyMagicLink('valid-token');

      expect(result).toEqual({ userId: 'user-uuid-123', email: 'test@example.com' });
    });
  });

  // ── createSession ──────────────────────────────────────────────────────────

  describe('createSession', () => {
    it('stores session in Redis with 90-day TTL and returns session ID', async () => {
      vi.mocked(redis.set).mockResolvedValue('OK');

      const sessionId = await createSession('user-uuid-123');

      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
      expect(vi.mocked(redis.set)).toHaveBeenCalledWith(
        `session:${sessionId}`,
        { userId: 'user-uuid-123' },
        { ex: 7776000 }
      );
    });

    it('generates a unique session ID on each call', async () => {
      vi.mocked(redis.set).mockResolvedValue('OK');

      const id1 = await createSession('user-uuid-123');
      const id2 = await createSession('user-uuid-123');

      expect(id1).not.toBe(id2);
    });
  });

  // ── deleteSession ──────────────────────────────────────────────────────────

  describe('deleteSession', () => {
    it('deletes the correct Redis session key', async () => {
      vi.mocked(redis.del).mockResolvedValue(1);

      await deleteSession('session-abc');

      expect(vi.mocked(redis.del)).toHaveBeenCalledWith('session:session-abc');
    });
  });

  // ── deleteAccount ──────────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('deletes the user from the database', async () => {
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockDelete = { where: mockWhere };
      (db as any).delete = vi.fn().mockReturnValue(mockDelete);

      await deleteAccount('user-uuid-123');

      expect((db as any).delete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });
  });
});
