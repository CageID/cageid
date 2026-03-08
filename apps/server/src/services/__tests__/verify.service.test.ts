import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      users:         { findFirst: vi.fn() },
      verifications: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

process.env['VERIFF_API_KEY']        = 'test-api-key';
process.env['VERIFF_WEBHOOK_SECRET'] = 'test-webhook-secret';
process.env['VERIFF_BASE_URL']       = 'https://stationapi.veriff.com';
process.env['APP_BASE_URL']          = 'https://cageid.app';
process.env['WEB_BASE_URL']          = 'http://localhost:3000';

import { db } from '../../db/index.js';
import { createHmac } from 'crypto';
import { computeAgeFloor, createVeriffSession, getVerificationStatus, handleWebhook } from '../verify.service.js';

// Fixed reference date for deterministic tests
const TODAY = new Date('2026-03-07');

describe('computeAgeFloor', () => {
  it('returns 21 for someone aged 21 or older', () => {
    expect(computeAgeFloor('2005-01-01', TODAY)).toBe(21); // birthday passed
  });

  it('returns 18 for someone aged exactly 18 (birthday already passed this year)', () => {
    expect(computeAgeFloor('2008-01-01', TODAY)).toBe(18);
  });

  it('returns null for someone whose 18th birthday is later this year', () => {
    expect(computeAgeFloor('2008-12-31', TODAY)).toBeNull();
  });

  it('returns null for someone under 18', () => {
    expect(computeAgeFloor('2015-06-15', TODAY)).toBeNull();
  });

  it('returns 18 (not 21) for someone aged 20 (birthday already passed this year)', () => {
    expect(computeAgeFloor('2006-01-01', TODAY)).toBe(18);
  });

  it('returns 18 for someone whose 21st birthday is later this year', () => {
    // DOB 2005-12-31: born Dec 31 2005. By March 7 2026, age is 20 (birthday not yet).
    expect(computeAgeFloor('2005-12-31', TODAY)).toBe(18);
  });

  it('returns 21 for someone who turned 21 this year (birthday already passed)', () => {
    // DOB 2005-01-01: born Jan 1 2005. By March 7 2026, birthday has passed, age is 21.
    expect(computeAgeFloor('2005-01-01', TODAY)).toBe(21);
  });

  it('defaults today to current date when not provided', () => {
    const result = computeAgeFloor('1990-01-01');
    expect(result === 21 || result === 18 || result === null).toBe(true);
  });
});

describe('createVeriffSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const veriffOkResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      status: 'success',
      verification: {
        id:  'veriff-session-123',
        url: 'https://magic.veriff.me/v/abc123',
      },
    }),
  };

  it('calls Veriff API with correct headers and vendorData', async () => {
    vi.mocked(fetch).mockResolvedValue(veriffOkResponse as unknown as Response);
    const mockValues = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as unknown as ReturnType<typeof db.insert>);

    await createVeriffSession('user-1');

    expect(fetch).toHaveBeenCalledWith(
      'https://stationapi.veriff.com/v1/sessions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'X-AUTH-CLIENT': 'test-api-key',
        },
        body: expect.stringContaining('"vendorData":"user-1"'),
      }),
    );

    // Verify the callback URL points to the frontend via WEB_BASE_URL
    const callBody = vi.mocked(fetch).mock.calls[0]![1]!.body as string;
    expect(callBody).toContain('"callback":"http://localhost:3000/verify/callback"');
  });

  it('inserts a pending verifications row with the correct fields', async () => {
    vi.mocked(fetch).mockResolvedValue(veriffOkResponse as unknown as Response);
    const mockValues = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as unknown as ReturnType<typeof db.insert>);

    await createVeriffSession('user-1');

    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      userId: 'user-1',
      veriffSessionId: 'veriff-session-123',
      status: 'pending',
    });
  });

  it('returns { veriffSessionId, verificationUrl } on success', async () => {
    vi.mocked(fetch).mockResolvedValue(veriffOkResponse as unknown as Response);
    const mockValues = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as unknown as ReturnType<typeof db.insert>);

    const result = await createVeriffSession('user-1');

    expect(result).toEqual({
      veriffSessionId: 'veriff-session-123',
      verificationUrl: 'https://magic.veriff.me/v/abc123',
    });
  });

  it('throws on non-OK API response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    await expect(createVeriffSession('user-1')).rejects.toThrow('Veriff API error: 500');
  });

  it('does NOT insert a DB row when API fails', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    await expect(createVeriffSession('user-1')).rejects.toThrow();
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe('getVerificationStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { status: "none" } when no row exists', async () => {
    vi.mocked(db.query.verifications.findFirst).mockResolvedValue(undefined);

    const result = await getVerificationStatus('user-1');

    expect(result).toEqual({ status: 'none' });
  });

  it('returns { status: "pending" } for pending row', async () => {
    vi.mocked(db.query.verifications.findFirst).mockResolvedValue({
      id: 'v-1',
      userId: 'user-1',
      veriffSessionId: 'sess-1',
      status: 'pending',
      ageFloor: null,
      verifiedAt: null,
      expiresAt: null,
      createdAt: new Date(),
    });

    const result = await getVerificationStatus('user-1');

    expect(result).toEqual({ status: 'pending' });
  });

  it('returns { status: "approved" } for approved row', async () => {
    vi.mocked(db.query.verifications.findFirst).mockResolvedValue({
      id: 'v-1',
      userId: 'user-1',
      veriffSessionId: 'sess-1',
      status: 'approved',
      ageFloor: 21,
      verifiedAt: new Date(),
      expiresAt: new Date(),
      createdAt: new Date(),
    });

    const result = await getVerificationStatus('user-1');

    expect(result).toEqual({ status: 'approved' });
  });

  it('returns { status: "declined" } for declined row', async () => {
    vi.mocked(db.query.verifications.findFirst).mockResolvedValue({
      id: 'v-1',
      userId: 'user-1',
      veriffSessionId: 'sess-1',
      status: 'declined',
      ageFloor: null,
      verifiedAt: null,
      expiresAt: null,
      createdAt: new Date(),
    });

    const result = await getVerificationStatus('user-1');

    expect(result).toEqual({ status: 'declined' });
  });
});

function makeSignature(body: string): string {
  return createHmac('sha256', 'test-webhook-secret').update(body).digest('hex');
}

describe('handleWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { error: "invalid_signature" } on HMAC mismatch', async () => {
    const body = JSON.stringify({ status: 'approved', verification: { id: 'sess-1', vendorData: 'user-1' } });
    const result = await handleWebhook(body, 'bad-signature');

    expect(result).toEqual({ error: 'invalid_signature' });
  });

  it('returns { error: "invalid_signature" } for empty signature', async () => {
    const body = JSON.stringify({ status: 'approved', verification: { id: 'sess-1', vendorData: 'user-1' } });
    const result = await handleWebhook(body, '');

    expect(result).toEqual({ error: 'invalid_signature' });
  });

  it('returns { ok: true } and does nothing for non-approved/declined statuses', async () => {
    const body = JSON.stringify({ status: 'resubmission_requested', verification: { id: 'sess-1', vendorData: 'user-1' } });
    const sig = makeSignature(body);

    const result = await handleWebhook(body, sig);

    expect(result).toEqual({ ok: true });
    expect(db.query.users.findFirst).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('returns { ok: true } and does nothing for unknown userId', async () => {
    const body = JSON.stringify({ status: 'approved', verification: { id: 'sess-1', vendorData: 'user-1', person: { dateOfBirth: '1990-01-01' } } });
    const sig = makeSignature(body);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

    const result = await handleWebhook(body, sig);

    expect(result).toEqual({ ok: true });
    expect(db.update).not.toHaveBeenCalled();
  });

  it('updates row to declined on declined status', async () => {
    const body = JSON.stringify({ status: 'declined', verification: { id: 'sess-1', vendorData: 'user-1' } });
    const sig = makeSignature(body);
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      emailVerifiedAt: null,
      createdAt: new Date(),
    });
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet   = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as ReturnType<typeof db.update>);

    const result = await handleWebhook(body, sig);

    expect(result).toEqual({ ok: true });
    expect(mockSet).toHaveBeenCalledWith({ status: 'declined' });
  });

  it('sets age_floor=21 for someone old enough (DOB 1990-01-01)', async () => {
    const body = JSON.stringify({ status: 'approved', verification: { id: 'sess-1', vendorData: 'user-1', person: { dateOfBirth: '1990-01-01' } } });
    const sig = makeSignature(body);
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      emailVerifiedAt: null,
      createdAt: new Date(),
    });
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet   = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as ReturnType<typeof db.update>);

    const result = await handleWebhook(body, sig);

    expect(result).toEqual({ ok: true });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved', ageFloor: 21 }),
    );
  });

  it('sets age_floor=18 for someone aged 18-20 (DOB 2008-01-01)', async () => {
    const body = JSON.stringify({ status: 'approved', verification: { id: 'sess-1', vendorData: 'user-1', person: { dateOfBirth: '2008-01-01' } } });
    const sig = makeSignature(body);
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      emailVerifiedAt: null,
      createdAt: new Date(),
    });
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet   = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as ReturnType<typeof db.update>);

    const result = await handleWebhook(body, sig);

    expect(result).toEqual({ ok: true });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved', ageFloor: 18 }),
    );
  });

  it('sets status=declined and emits console.warn when Veriff approves someone under 18 (DOB 2015-06-15)', async () => {
    const body = JSON.stringify({ status: 'approved', verification: { id: 'sess-1', vendorData: 'user-1', person: { dateOfBirth: '2015-06-15' } } });
    const sig = makeSignature(body);
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      emailVerifiedAt: null,
      createdAt: new Date(),
    });
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet   = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as ReturnType<typeof db.update>);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await handleWebhook(body, sig);

    expect(result).toEqual({ ok: true });
    expect(mockSet).toHaveBeenCalledWith({ status: 'declined' });
    expect(warnSpy).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
    warnSpy.mockRestore();
  });

  it('sets verifiedAt and expiresAt (~12 months) on approval', async () => {
    const body = JSON.stringify({ status: 'approved', verification: { id: 'sess-1', vendorData: 'user-1', person: { dateOfBirth: '1990-01-01' } } });
    const sig = makeSignature(body);
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      emailVerifiedAt: null,
      createdAt: new Date(),
    });
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet   = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as ReturnType<typeof db.update>);

    await handleWebhook(body, sig);

    const setArg = mockSet.mock.calls[0]![0] as { verifiedAt: Date; expiresAt: Date };
    expect(setArg.verifiedAt).toBeInstanceOf(Date);
    expect(setArg.expiresAt).toBeInstanceOf(Date);

    const diffMs = setArg.expiresAt.getTime() - setArg.verifiedAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // ~365 days, allow some tolerance for leap year
    expect(diffDays).toBeGreaterThanOrEqual(365);
    expect(diffDays).toBeLessThanOrEqual(366);
  });
});
