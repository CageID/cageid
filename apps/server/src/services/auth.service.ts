import { randomBytes, randomUUID } from 'crypto';
import { Resend } from 'resend';
import { redis } from '../lib/redis.js';
import { db } from '../db/index.js';
import { users, verifications, partnerSubs } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// ─── Resend client (module-level singleton) ───────────────────────────────────

const resend = new Resend(process.env['RESEND_API_KEY'] ?? '');

// ─── Types ────────────────────────────────────────────────────────────────────

export type SendMagicLinkResult = { sent: true } | { rateLimited: true };

// ─── sendMagicLink ────────────────────────────────────────────────────────────

/**
 * Rate-checks, upserts the user, stores a magic link token in Redis,
 * and sends the link via Resend.
 *
 * Always returns { sent: true } on success — callers must never reveal
 * whether the email address already had an account.
 */
export async function sendMagicLink(email: string): Promise<SendMagicLinkResult> {
  // ── Rate limiting: 3 requests per email per hour ───────────────────────────
  const rateKey = `magic_link_rate:${email}`;
  const count = await redis.incr(rateKey);
  if (count === 1) {
    // First request in this window — set the TTL
    await redis.expire(rateKey, 3600);
  }
  if (count > 3) {
    return { rateLimited: true };
  }

  // ── Upsert user ────────────────────────────────────────────────────────────
  let userId: string;
  const existing = await db.query.users.findFirst({
    where: (u, { eq: eqFn }) => eqFn(u.email, email),
  });
  if (existing) {
    userId = existing.id;
  } else {
    const inserted = await db.insert(users).values({ email }).returning();
    userId = inserted[0]!.id;
  }

  // ── Generate and store token ───────────────────────────────────────────────
  const token = randomBytes(32).toString('hex');
  await redis.set(
    `magic_link:${token}`,
    { userId, email },
    { ex: 600 } // 10 minutes
  );

  // ── Send email via Resend ──────────────────────────────────────────────────
  const webBase = process.env['WEB_BASE_URL'] ?? 'https://cageid.app';
  const magicLinkUrl = `${webBase}/api/auth/verify?token=${token}`;

  const { error: sendError } = await resend.emails.send({
    from: 'CAGE <noreply@cageid.app>',
    to: email,
    subject: 'Your CAGE sign-in link',
    html: `
      <p>Click the link below to sign in to CAGE. This link expires in 10 minutes and can only be used once.</p>
      <p><a href="${magicLinkUrl}">Sign in to CAGE</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  if (sendError) {
    throw new Error(`Failed to send magic link email: ${sendError.message}`);
  }

  return { sent: true };
}

// ─── verifyMagicLink ─────────────────────────────────────────────────────────

/**
 * Atomically retrieves and deletes the magic link token from Redis (GETDEL).
 * Prevents race conditions where two concurrent requests could both succeed.
 * Sets email_verified_at on the user if not already set.
 */
export async function verifyMagicLink(
  token: string
): Promise<{ userId: string; email: string } | null> {
  const data = await redis.getdel<{ userId: string; email: string }>(
    `magic_link:${token}`
  );
  if (!data) return null;

  // Update email_verified_at — advances timestamp on each successful verification
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, data.userId));

  return { userId: data.userId, email: data.email };
}

// ─── createSession ────────────────────────────────────────────────────────────

/**
 * Creates a new 90-day session in Redis and returns the session ID.
 */
export async function createSession(userId: string): Promise<string> {
  const sessionId = randomUUID();
  await redis.set(
    `session:${sessionId}`,
    { userId },
    { ex: 7776000 } // 90 days
  );
  return sessionId;
}

// ─── deleteSession ────────────────────────────────────────────────────────────

/**
 * Deletes a session from Redis. Used by logout and account deletion.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(`session:${sessionId}`);
}

// ─── deleteAccount ────────────────────────────────────────────────────────────

/**
 * Hard-deletes the user row. Foreign key cascades handle verifications
 * and partner_subs automatically.
 */
export async function deleteAccount(userId: string): Promise<void> {
  // Delete child rows first — FK constraints have no CASCADE
  await db.delete(partnerSubs).where(eq(partnerSubs.userId, userId));
  await db.delete(verifications).where(eq(verifications.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}
