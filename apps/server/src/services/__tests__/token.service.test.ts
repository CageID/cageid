// apps/server/src/services/__tests__/token.service.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPair, exportPKCS8, exportSPKI, importSPKI, jwtVerify } from 'jose';

// Set env vars BEFORE any function call.
// token.service.ts reads env vars lazily (inside ensureKeys(), not at module load),
// so setting them here in beforeAll is sufficient.
let publicKeyPem: string;

beforeAll(async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
  process.env['JWT_PRIVATE_KEY'] = await exportPKCS8(privateKey);
  publicKeyPem = await exportSPKI(publicKey);
  process.env['JWT_PUBLIC_KEY'] = publicKeyPem;
  process.env['OIDC_ISSUER'] = 'https://cageid.app';
});

// Dynamic import so the module sees the env vars set above.
// vitest caches modules per test file, but since beforeAll runs before any it(),
// and the lazy init pattern defers key loading until first call, this works correctly.
const getModule = () => import('../token.service.js');

describe('token.service', () => {
  describe('generateAuthCode', () => {
    it('generates a 64-character lowercase hex string', async () => {
      const { generateAuthCode } = await getModule();
      const code = generateAuthCode();
      expect(code).toMatch(/^[0-9a-f]{64}$/);
    });

    it('generates a unique code on every call', async () => {
      const { generateAuthCode } = await getModule();
      const a = generateAuthCode();
      const b = generateAuthCode();
      expect(a).not.toBe(b);
    });
  });

  describe('getJwks', () => {
    it('returns a JWKS object with one RS256 key', async () => {
      const { getJwks } = await getModule();
      const jwks = await getJwks();
      expect(jwks).toHaveProperty('keys');
      expect(jwks.keys).toHaveLength(1);
      expect(jwks.keys[0]).toMatchObject({
        kty: 'RSA',
        alg: 'RS256',
        use: 'sig',
        kid: 'cage-1',
      });
    });

    it('returns the same object on repeated calls (cached)', async () => {
      const { getJwks } = await getModule();
      const first = await getJwks();
      const second = await getJwks();
      expect(first).toBe(second); // same reference = cached
    });
  });

  describe('signIdToken', () => {
    it('returns a verifiable RS256 JWT with correct claims', async () => {
      const { signIdToken } = await getModule();

      const token = await signIdToken({
        sub: 'test-sub-hash',
        aud: 'test-client-id',
        ageFloor: 18,
      });

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // header.payload.signature

      // Verify with the corresponding public key
      const publicKey = await importSPKI(publicKeyPem, 'RS256');
      const { payload } = await jwtVerify(token, publicKey, {
        issuer: 'https://cageid.app',
        audience: 'test-client-id',
      });

      expect(payload.sub).toBe('test-sub-hash');
      expect(payload['age_verified']).toBe(true);
      expect(payload['age_floor']).toBe(18);

      // exp should be ~1 hour from now (within a 60-second margin for test runner speed)
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now + 3540);
      expect(payload.exp).toBeLessThan(now + 3660);
    });

    it('uses the partner client_id as the audience claim', async () => {
      const { signIdToken } = await getModule();
      const token = await signIdToken({ sub: 'sub', aud: 'my-partner-id', ageFloor: 21 });

      const publicKey = await importSPKI(publicKeyPem, 'RS256');
      const { payload } = await jwtVerify(token, publicKey, {
        issuer: 'https://cageid.app',
        audience: 'my-partner-id',
      });
      expect(payload['age_floor']).toBe(21);
    });
  });
});
