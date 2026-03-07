// apps/server/src/services/partner.service.ts
import { db } from "../db/index.js";
import * as argon2 from "argon2";
import { type partners } from "../db/schema.js";

export type Partner = typeof partners.$inferSelect;

/**
 * Finds an active partner by client_id (= partner.id).
 * Returns null if not found OR if the partner is inactive.
 *
 * SECURITY: An inactive partner and an unknown partner look identical to callers.
 * Never reveal which condition was triggered.
 */
export async function findActivePartner(
  clientId: string
): Promise<Partner | null> {
  const partner = await db.query.partners.findFirst({
    where: (p, { eq, and }) => and(eq(p.id, clientId), eq(p.active, true)),
  });
  return partner ?? null;
}

/**
 * Verifies a plain-text client secret against the stored argon2id hash.
 * Returns false on any error (hash mismatch, malformed hash, etc.).
 */
export async function validateClientSecret(
  partner: Partner,
  secret: string
): Promise<boolean> {
  try {
    return await argon2.verify(partner.clientSecretHash, secret);
  } catch {
    return false;
  }
}

/**
 * Checks whether a redirect_uri is in the partner's allowed list.
 * EXACT match only — no prefix matching, no wildcard, no trailing-slash tolerance.
 */
export function validateRedirectUri(partner: Partner, uri: string): boolean {
  return partner.redirectUris.includes(uri);
}
