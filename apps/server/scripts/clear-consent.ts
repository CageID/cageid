/**
 * Clears all partner_subs rows for a given email (revokes all partner consents).
 *
 * Usage: npx tsx --env-file=.env scripts/clear-consent.ts <email>
 * Example: npx tsx --env-file=.env scripts/clear-consent.ts acres.steven@gmail.com
 */

import { eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { users, partnerSubs } from '../src/db/schema.js';

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx tsx --env-file=.env scripts/clear-consent.ts <email>');
  process.exit(1);
}

const user = await db.query.users.findFirst({
  where: eq(users.email, email),
});

if (!user) {
  console.error('User not found:', email);
  process.exit(1);
}

const subs = await db.query.partnerSubs.findMany({
  where: eq(partnerSubs.userId, user.id),
});

if (subs.length === 0) {
  console.log('No consents found for', email);
  process.exit(0);
}

for (const sub of subs) {
  await db.delete(partnerSubs).where(eq(partnerSubs.id, sub.id));
}

console.log(`Cleared ${subs.length} consent(s) for ${email}`);
process.exit(0);
