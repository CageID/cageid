// apps/server/src/routes/__tests__/oauth.token.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/token.service.js', () => ({
  getJwks: vi.fn(),
  signIdToken: vi.fn().mockResolvedValue('signed.jwt.token'),
  generateAuthCode: vi.fn(),
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

import { findActivePartner, validateClientSecret } from '../../services/partner.service.js';
import { signIdToken } from '../../services/token.service.js';
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

function tokenRequest(body: Record<string, string>) {
  return new Request('http://localhost/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
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

const storedCode = {
  userId: 'user-uuid',
  partnerId: 'partner-uuid',
  redirectUri: 'https://testpartner.com/callback',
};

const mockVerification = {
  id: 'verif-uuid',
  userId: 'user-uuid',
  veriffSessionId: 'veriff-session',
  status: 'approved' as const,
  ageFloor: 18,
  verifiedAt: new Date(),
  expiresAt: new Date(Date.now() + 86400000),
  createdAt: new Date(),
};

const mockPartnerSub = {
  id: 'sub-uuid',
  userId: 'user-uuid',
  partnerId: 'partner-uuid',
  subHash: 'stable-sub-hash',
  createdAt: new Date(),
};

describe('POST /oauth/token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 unsupported_grant_type for wrong grant type', async () => {
    const app = makeApp();
    const res = await app.fetch(tokenRequest({
      grant_type: 'client_credentials',
      client_id: 'partner-uuid',
      client_secret: 'secret',
      code: 'abc',
    }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('unsupported_grant_type');
  });

  it('returns 400 invalid_request when required params are missing', async () => {
    const app = makeApp();
    const res = await app.fetch(tokenRequest({
      grant_type: 'authorization_code',
      // missing code, client_id, client_secret
    }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('invalid_request');
  });

  it('returns 401 invalid_client when partner not found', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(null);
    const app = makeApp();
    const res = await app.fetch(tokenRequest({
      grant_type: 'authorization_code',
      client_id: 'bad-id',
      client_secret: 'bad-secret',
      code: 'somecode',
    }));
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('invalid_client');
  });

  it('returns 401 invalid_client when client_secret is wrong', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(mockPartner);
    vi.mocked(validateClientSecret).mockResolvedValue(false);
    const app = makeApp();
    const res = await app.fetch(tokenRequest({
      grant_type: 'authorization_code',
      client_id: 'partner-uuid',
      client_secret: 'wrong-secret',
      code: 'somecode',
    }));
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('invalid_client');
  });

  it('returns 400 invalid_grant when auth code is not in Redis', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(mockPartner);
    vi.mocked(validateClientSecret).mockResolvedValue(true);
    vi.mocked(redis.get).mockResolvedValue(null);
    const app = makeApp();
    const res = await app.fetch(tokenRequest({
      grant_type: 'authorization_code',
      client_id: 'partner-uuid',
      client_secret: 'correct-secret',
      code: 'expired-or-missing-code',
    }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, string>;
    expect(body.error).toBe('invalid_grant');
  });

  it('returns the ID token on a valid exchange and deletes the auth code', async () => {
    vi.mocked(findActivePartner).mockResolvedValue(mockPartner);
    vi.mocked(validateClientSecret).mockResolvedValue(true);
    vi.mocked(redis.get).mockResolvedValue(storedCode);
    vi.mocked(redis.del).mockResolvedValue(1);
    vi.mocked(db.query.verifications.findFirst).mockResolvedValue(mockVerification);
    vi.mocked(db.query.partnerSubs.findFirst).mockResolvedValue(mockPartnerSub);

    const app = makeApp();
    const res = await app.fetch(tokenRequest({
      grant_type: 'authorization_code',
      client_id: 'partner-uuid',
      client_secret: 'correct-secret',
      code: 'valid-auth-code',
    }));

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.id_token).toBe('signed.jwt.token');
    expect(body.token_type).toBe('Bearer');
    expect(body.expires_in).toBe(3600);

    // Single-use: auth code deleted
    expect(vi.mocked(redis.del)).toHaveBeenCalledWith('oauth_code:valid-auth-code');

    // signIdToken called with correct args
    expect(vi.mocked(signIdToken)).toHaveBeenCalledWith({
      sub: 'stable-sub-hash',
      aud: 'partner-uuid',
      ageFloor: 18,
    });
  });
});
