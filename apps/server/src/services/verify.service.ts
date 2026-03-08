import { createHmac, timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { verifications } from '../db/schema.js';

// ─── computeAgeFloor ─────────────────────────────────────────────────────────

/**
 * Computes the CAGE age floor (18 or 21) from a date of birth string.
 * Returns null if the person is under 18.
 *
 * Age is computed by calendar year subtraction, adjusted if the birthday
 * hasn't occurred yet this year. Do NOT use millisecond arithmetic — it
 * drifts with leap years.
 *
 * @param dateOfBirth - ISO date string 'YYYY-MM-DD'
 * @param today       - Reference date (defaults to now; injectable for tests)
 */
export function computeAgeFloor(dateOfBirth: string, today = new Date()): number | null {
  const [birthYearStr, birthMonthStr, birthDayStr] = dateOfBirth.split('-');
  const birthYear  = parseInt(birthYearStr!,  10);
  const birthMonth = parseInt(birthMonthStr!, 10);
  const birthDay   = parseInt(birthDayStr!,   10);

  let age = today.getFullYear() - birthYear;

  // If the birthday hasn't occurred yet this calendar year, subtract one
  const birthdayThisYear = new Date(today.getFullYear(), birthMonth - 1, birthDay);
  if (today < birthdayThisYear) {
    age--;
  }

  if (age >= 21) return 21;
  if (age >= 18) return 18;
  return null;
}

// ─── createVeriffSession ─────────────────────────────────────────────────────

interface VeriffSessionResponse {
  status: string;
  verification: {
    id:  string;
    url: string;
  };
}

export async function createVeriffSession(
  userId: string
): Promise<{ veriffSessionId: string; verificationUrl: string }> {
  const baseUrl = process.env['VERIFF_BASE_URL'] ?? 'https://stationapi.veriff.com';
  const apiKey  = process.env['VERIFF_API_KEY']  ?? '';
  const appBase = process.env['APP_BASE_URL']    ?? 'https://cageid.app';

  const response = await fetch(`${baseUrl}/v1/sessions`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'X-AUTH-CLIENT': apiKey,
    },
    body: JSON.stringify({
      verification: {
        callback:   `${appBase}/verify/callback`,
        vendorData: userId,
        timestamp:  new Date().toISOString(),
        lang:       'en',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Veriff API error: ${response.status}`);
  }

  const data = (await response.json()) as VeriffSessionResponse;
  const veriffSessionId = data.verification.id;
  const verificationUrl = data.verification.url;

  await db.insert(verifications).values({
    userId,
    veriffSessionId,
    status: 'pending',
  });

  return { veriffSessionId, verificationUrl };
}

// ─── getVerificationStatus ───────────────────────────────────────────────────

export async function getVerificationStatus(
  userId: string
): Promise<{ status: 'pending' | 'approved' | 'declined' | 'none' }> {
  const row = await db.query.verifications.findFirst({
    where: (v, { eq: eqFn }) => eqFn(v.userId, userId),
    orderBy: (v, { desc }) => [desc(v.createdAt)],
  });

  if (!row) return { status: 'none' };
  return { status: row.status };
}

// ─── handleWebhook ───────────────────────────────────────────────────────────

type WebhookResult = { ok: true } | { error: 'invalid_signature' };

interface VeriffWebhookPayload {
  status: string;
  verification: {
    id:         string;
    vendorData: string;
    person?: { dateOfBirth?: string };
  };
}

export async function handleWebhook(
  rawBody: string,
  signature: string
): Promise<WebhookResult> {
  const secret   = process.env['VERIFF_WEBHOOK_SECRET'] ?? '';
  const computed = createHmac('sha256', secret).update(rawBody).digest('hex');
  const computedBuf  = Buffer.from(computed);
  const receivedBuf  = Buffer.from(signature);

  if (computedBuf.length !== receivedBuf.length || !timingSafeEqual(computedBuf, receivedBuf)) {
    return { error: 'invalid_signature' };
  }

  const payload = JSON.parse(rawBody) as VeriffWebhookPayload;
  const { status, verification } = payload;
  const { id: veriffSessionId, vendorData: userId } = verification;

  if (status !== 'approved' && status !== 'declined') {
    return { ok: true };
  }

  const user = await db.query.users.findFirst({
    where: (u, { eq: eqFn }) => eqFn(u.id, userId),
  });
  if (!user) return { ok: true };

  if (status === 'declined') {
    await db.update(verifications).set({ status: 'declined' }).where(eq(verifications.veriffSessionId, veriffSessionId));
    return { ok: true };
  }

  const dateOfBirth = verification.person?.dateOfBirth;
  if (!dateOfBirth) {
    await db.update(verifications).set({ status: 'declined' }).where(eq(verifications.veriffSessionId, veriffSessionId));
    return { ok: true };
  }

  const ageFloor = computeAgeFloor(dateOfBirth);

  if (ageFloor === null) {
    // Under 18 edge case — compute age for warning log
    const today = new Date();
    const parts = dateOfBirth.split('-');
    const by = parseInt(parts[0]!, 10);
    const bm = parseInt(parts[1]!, 10);
    const bd = parseInt(parts[2]!, 10);
    let computedAge = today.getFullYear() - by;
    if (today < new Date(today.getFullYear(), bm - 1, bd)) computedAge--;
    console.warn({ userId, computedAge });

    await db.update(verifications).set({ status: 'declined' }).where(eq(verifications.veriffSessionId, veriffSessionId));
    return { ok: true };
  }

  const now       = new Date();
  const expiresAt = new Date(now);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  await db.update(verifications).set({ status: 'approved', ageFloor, verifiedAt: now, expiresAt }).where(eq(verifications.veriffSessionId, veriffSessionId));
  return { ok: true };
}
