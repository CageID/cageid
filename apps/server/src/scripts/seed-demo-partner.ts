/**
 * Seed script: creates (or updates) a "Demo App" partner for local development.
 *
 * Usage:  pnpm --filter=server seed:demo-partner
 *
 * Idempotent — if a partner with domain "localhost:3003" already exists,
 * it updates the row instead of creating a duplicate.
 *
 * Prints the client_id and plaintext client_secret to the terminal.
 * This is the ONLY time the secret is visible.
 */

import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { partners } from '../db/schema.js';

const PARTNER_NAME = 'Demo App';
const PARTNER_DOMAIN = 'localhost:3003';
const REDIRECT_URIS = ['http://localhost:3003/callback'];
const AGE_FLOOR_REQUIRED = 18;

async function main() {
  // Generate a secure random secret (48 bytes → 64-char hex string)
  const clientSecret = randomBytes(48).toString('hex');
  const clientSecretHash = await argon2.hash(clientSecret);

  // Check if partner already exists for this domain
  const existing = await db.query.partners.findFirst({
    where: (p, { eq: eqFn }) => eqFn(p.domain, PARTNER_DOMAIN),
  });

  let clientId: string;

  if (existing) {
    // Update existing partner
    await db
      .update(partners)
      .set({
        name: PARTNER_NAME,
        clientSecretHash,
        ageFloorRequired: AGE_FLOOR_REQUIRED,
        redirectUris: REDIRECT_URIS,
        active: true,
      })
      .where(eq(partners.domain, PARTNER_DOMAIN));

    clientId = existing.id;
    console.log('\nUpdated existing partner.\n');
  } else {
    // Insert new partner
    const [inserted] = await db
      .insert(partners)
      .values({
        name: PARTNER_NAME,
        domain: PARTNER_DOMAIN,
        clientSecretHash,
        ageFloorRequired: AGE_FLOOR_REQUIRED,
        redirectUris: REDIRECT_URIS,
        active: true,
      })
      .returning();

    clientId = inserted!.id;
    console.log('\nCreated new partner.\n');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('  Demo Partner Credentials');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Name:          ${PARTNER_NAME}`);
  console.log(`  Domain:        ${PARTNER_DOMAIN}`);
  console.log(`  Redirect URIs: ${REDIRECT_URIS.join(', ')}`);
  console.log(`  Age Floor:     ${AGE_FLOOR_REQUIRED}+`);
  console.log('');
  console.log(`  client_id:     ${clientId}`);
  console.log(`  client_secret: ${clientSecret}`);
  console.log('');
  console.log('  Save these — the secret cannot be recovered.');
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
