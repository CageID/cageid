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
