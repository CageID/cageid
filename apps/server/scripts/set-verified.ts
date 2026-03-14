import { db } from '../src/db/index.js';
import { users, verifications } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const email = 'acres.steven@gmail.com';

const user = await db.query.users.findFirst({
  where: (u, { eq: eqFn }) => eqFn(u.email, email),
});

if (!user) {
  console.log('User not found:', email);
  process.exit(1);
}

console.log('User:', user.id, email);

const existing = await db.query.verifications.findMany({
  where: (v, { eq: eqFn }) => eqFn(v.userId, user.id),
});

console.log('Existing verifications:', existing.length);

if (existing.length > 0) {
  await db
    .update(verifications)
    .set({
      status: 'approved',
      ageFloor: 18,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    })
    .where(eq(verifications.userId, user.id));
  console.log('Updated to approved');
} else {
  await db.insert(verifications).values({
    userId: user.id,
    veriffSessionId: 'manual-dev-' + randomUUID(),
    status: 'approved',
    ageFloor: 18,
    verifiedAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });
  console.log('Inserted approved verification');
}

console.log('Done! Verification set to approved for', email);
process.exit(0);
