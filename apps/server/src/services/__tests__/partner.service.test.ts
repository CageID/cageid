// apps/server/src/services/__tests__/partner.service.test.ts
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import * as argon2 from 'argon2';
import {
  findActivePartner,
  validateClientSecret,
  validateRedirectUri,
} from '../partner.service.js';
import type { Partner } from '../partner.service.js';

// Mock the database module
vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      partners: {
        findFirst: vi.fn(),
      },
    },
  },
}));

import { db } from '../../db/index.js';

let correctHash: string;
beforeAll(async () => {
  correctHash = await argon2.hash('correct-secret');
});

const mockPartner: Partner = {
  id: 'test-partner-uuid',
  name: 'Test Partner',
  domain: 'testpartner.com',
  clientSecretHash: 'hash-placeholder',
  ageFloorRequired: 18,
  redirectUris: [
    'https://testpartner.com/callback',
    'https://testpartner.com/auth/return',
  ],
  active: true,
  createdAt: new Date(),
};

describe('partner.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findActivePartner', () => {
    it('returns partner when found and active', async () => {
      vi.mocked(db.query.partners.findFirst).mockResolvedValue(mockPartner);

      const result = await findActivePartner('test-partner-uuid');

      expect(result).toEqual(mockPartner);
    });

    it('returns null when partner is not found', async () => {
      vi.mocked(db.query.partners.findFirst).mockResolvedValue(undefined);

      const result = await findActivePartner('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('validateRedirectUri', () => {
    it('returns true for an exact match in the allowed list', () => {
      expect(
        validateRedirectUri(mockPartner, 'https://testpartner.com/callback')
      ).toBe(true);
    });

    it('returns false for a URI not in the allowed list', () => {
      expect(
        validateRedirectUri(mockPartner, 'https://evil.com/steal')
      ).toBe(false);
    });

    it('returns false for a URI that is a path-prefix of an allowed URI', () => {
      expect(
        validateRedirectUri(mockPartner, 'https://testpartner.com/callback/extra')
      ).toBe(false);
    });

    it('returns false for a URI that is a subdomain of an allowed domain', () => {
      expect(
        validateRedirectUri(mockPartner, 'https://evil.testpartner.com/callback')
      ).toBe(false);
    });
  });

  describe('validateClientSecret', () => {
    it('returns true when the secret matches the hash', async () => {
      const partner = { ...mockPartner, clientSecretHash: correctHash };
      const result = await validateClientSecret(partner, 'correct-secret');
      expect(result).toBe(true);
    });

    it('returns false when the secret does not match the hash', async () => {
      const partner = { ...mockPartner, clientSecretHash: correctHash };
      const result = await validateClientSecret(partner, 'wrong-secret');
      expect(result).toBe(false);
    });

    it('returns false (does not throw) when the hash is malformed', async () => {
      const partner = { ...mockPartner, clientSecretHash: 'not-a-valid-argon2-hash' };
      const result = await validateClientSecret(partner, 'any-secret');
      expect(result).toBe(false);
    });
  });
});
