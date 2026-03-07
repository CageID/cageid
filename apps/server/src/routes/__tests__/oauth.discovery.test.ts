// apps/server/src/routes/__tests__/oauth.discovery.test.ts
import { describe, it, expect, vi } from 'vitest';

// Mock token.service so tests don't need real RSA keys
vi.mock('../../services/token.service.js', () => ({
  getJwks: vi.fn().mockResolvedValue({
    keys: [{ kty: 'RSA', alg: 'RS256', use: 'sig', kid: 'cage-1', n: 'abc', e: 'AQAB' }],
  }),
  signIdToken: vi.fn(),
  generateAuthCode: vi.fn(),
}));

// Mock partner.service
vi.mock('../../services/partner.service.js', () => ({
  findActivePartner: vi.fn(),
  validateClientSecret: vi.fn(),
  validateRedirectUri: vi.fn(),
}));

// Mock redis
vi.mock('../../lib/redis.js', () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
}));

// Mock db
vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      verifications: { findFirst: vi.fn() },
      partnerSubs: { findFirst: vi.fn() },
    },
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  },
}));

process.env['OIDC_ISSUER'] = 'https://cageid.app';

import { Hono } from 'hono';
import { oauthRoutes } from '../oauth.js';

function makeApp() {
  const app = new Hono();
  app.route('/oauth', oauthRoutes);
  return app;
}

describe('GET /oauth/.well-known/openid-configuration', () => {
  it('returns 200 with a valid OIDC discovery document', async () => {
    const app = makeApp();
    const res = await app.request('/oauth/.well-known/openid-configuration');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body.issuer).toBe('https://cageid.app');
    expect(body.authorization_endpoint).toBe('https://cageid.app/oauth/authorize');
    expect(body.token_endpoint).toBe('https://cageid.app/oauth/token');
    expect(body.jwks_uri).toBe('https://cageid.app/oauth/.well-known/jwks.json');
    expect(body.response_types_supported).toContain('code');
    expect(body.id_token_signing_alg_values_supported).toContain('RS256');
  });
});

describe('GET /oauth/.well-known/jwks.json', () => {
  it('returns 200 with the JWKS public key', async () => {
    const app = makeApp();
    const res = await app.request('/oauth/.well-known/jwks.json');
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('keys');
    expect(Array.isArray(body.keys)).toBe(true);
    expect((body.keys as unknown[]).length).toBeGreaterThan(0);
  });
});
