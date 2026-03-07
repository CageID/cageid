// apps/server/src/routes/__tests__/oauth.authorize.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/token.service.js', () => ({
  getJwks: vi.fn(),
  signIdToken: vi.fn(),
  generateAuthCode: vi.fn().mockReturnValue('a'.repeat(64)),
}));

vi.mock('../../services/partner.service.js', () => ({
  findActivePartner: vi.fn(),
  validateClientSecret: vi.fn(),
  validateRedirectUri: vi.fn(),
}));

vi.mock('../../lib/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      verifications: { findFirst: vi.fn() },
      partnerSubs: { findFirst: vi.fn() },
    },
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  },
}));

import { findActivePartner, validateRedirectUri } from '../../services/partner.service.js';
import { redis } from '../../lib/redis.js';
import { db } from '../../db/index.js';

process.env['OIDC_ISSUER'] = 'https://cageid.app';

import { Hono } from 'hono';
import { oauthRoutes } from '../oauth.js';

function makeApp() {
  const app = new Hono();
  app.route('/oauth', oauthRoutes);
  return app;
}

const mockPartner = {
  id: 'partner-uuid',
  name: 'Test Partner',
  domain: 'testpartner.com',
  clientSecretHash: 'hash',
  ageFloorRequired: 18,
  redirectUris: ['https://testpartner.com/callback'],
  active: true,
  createdAt: new Date(),
};

const mockVerification = {
  id: 'verif-uuid',
  userId: 'user-uuid',
  status: 'approved' as const,
  ageFloor: 18,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  veriffSessionId: 'veriff-session-id',
  verifiedAt: new Date(),
  createdAt: new Date(),
};

const mockPartnerSub = {
  id: 'sub-uuid',
  userId: 'user-uuid',
  partnerId: 'partner-uuid',
  subHash: 'stable-sub-hash',
  createdAt: new Date(),
};

describe('GET /oauth/authorize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when response_type is missing', async () => {
    const app = makeApp();
    const res = await app.request(
      '/oauth/authorize?client_id=x&redirect_uri=y&state=z'
    );
    expect(res.status).toBe(400);
  });

  it('shows an error page (not a redirect) when client_id is unknown', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(null);
    const app = makeApp();
    const res = await app.request(
      '/oauth/authorize?client_id=unknown&redirect_uri=https://evil.com&state=s&response_type=code'
    );
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain('Unknown or inactive client');
  });

  it('shows an error page (not a redirect) when redirect_uri is not allowed', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(mockPartner);
    vi.mocked(validateRedirectUri).mockReturnValue(false);
    const app = makeApp();
    const res = await app.request(
      '/oauth/authorize?client_id=partner-uuid&redirect_uri=https://evil.com/steal&state=s&response_type=code'
    );
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain('Invalid redirect URI');
  });

  it('redirects to /login when there is no session cookie', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(mockPartner);
    vi.mocked(validateRedirectUri).mockReturnValue(true);
    vi.mocked(redis.get).mockResolvedValue(null);
    const app = makeApp();
    const res = await app.request(
      '/oauth/authorize?client_id=partner-uuid&redirect_uri=https://testpartner.com/callback&state=mystate&response_type=code'
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('redirects with error=access_denied when user age_floor is below requirement', async () => {
    vi.mocked(findActivePartner).mockResolvedValue({ ...mockPartner, ageFloorRequired: 21 });
    vi.mocked(validateRedirectUri).mockReturnValue(true);
    vi.mocked(redis.get).mockResolvedValue({ userId: 'user-uuid' });
    vi.mocked(db.query.verifications.findFirst).mockResolvedValue({
      ...mockVerification,
      ageFloor: 18, // below required 21
    });
    const app = makeApp();
    const res = await app.request(
      '/oauth/authorize?client_id=partner-uuid&redirect_uri=https://testpartner.com/callback&state=mystate&response_type=code',
      { headers: { Cookie: 'cage_session=test-session-id' } }
    );
    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('error=access_denied');
    expect(location).toContain('state=mystate');
  });

  it('redirects with code and state on successful authorization (returning user)', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(mockPartner);
    vi.mocked(validateRedirectUri).mockReturnValue(true);
    vi.mocked(redis.get).mockResolvedValue({ userId: 'user-uuid' });
    vi.mocked(db.query.verifications.findFirst).mockResolvedValue(mockVerification);
    vi.mocked(db.query.partnerSubs.findFirst).mockResolvedValue(mockPartnerSub);
    vi.mocked(redis.set).mockResolvedValue('OK');
    const app = makeApp();
    const res = await app.request(
      '/oauth/authorize?client_id=partner-uuid&redirect_uri=https://testpartner.com/callback&state=mystate&response_type=code',
      { headers: { Cookie: 'cage_session=test-session-id' } }
    );
    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('https://testpartner.com/callback');
    expect(location).toContain('code=');
    expect(location).toContain('state=mystate');
    // Auth code must be stored in Redis
    expect(vi.mocked(redis.set)).toHaveBeenCalledWith(
      expect.stringContaining('oauth_code:'),
      expect.objectContaining({ userId: 'user-uuid', partnerId: 'partner-uuid' }),
      expect.objectContaining({ ex: 60 })
    );
  });
});
