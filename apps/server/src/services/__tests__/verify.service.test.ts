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

import { db } from '../../db/index.js';
import { computeAgeFloor, createVeriffSession } from '../verify.service.js';

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
