/**
 * Adds a redirect URI to the demo partner's allowed list.
 *
 * Usage: npx tsx --env-file=.env scripts/update-partner-redirect.ts <redirect_uri>
 *
 * Example: npx tsx --env-file=.env scripts/update-partner-redirect.ts https://demo-partner-production.up.railway.app/callback
 */

import { eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { partners } from '../src/db/schema.js';

const newUri = process.argv[2];

if (!newUri) {
  console.error('Usage: npx tsx --env-file=.env scripts/update-partner-redirect.ts <redirect_uri>');
  process.exit(1);
}

const PARTNER_DOMAIN = 'localhost:3003';

const partner = await db.query.partners.findFirst({
  where: (p, { eq: eqFn }) => eqFn(p.domain, PARTNER_DOMAIN),
});

if (!partner) {
  console.error('Demo partner not found. Run seed:demo-partner first.');
  process.exit(1);
}

const currentUris = partner.redirectUris ?? [];
if (currentUris.includes(newUri)) {
  console.log('Redirect URI already exists:', newUri);
  console.log('Current URIs:', currentUris);
  process.exit(0);
}

const updatedUris = [...currentUris, newUri];

await db
  .update(partners)
  .set({ redirectUris: updatedUris })
  .where(eq(partners.id, partner.id));

console.log('Updated redirect URIs for demo partner:');
console.log('  Before:', currentUris);
console.log('  After: ', updatedUris);
process.exit(0);
