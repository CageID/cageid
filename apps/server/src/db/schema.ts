// CAGE Database Schema
// Drizzle ORM — PostgreSQL (Neon)
//
// Tables: users, verifications, partners, partner_subs
// Design principle: store the minimum data needed. No PII beyond email.
// Verification history is immutable — one row per attempt, never update in place.

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "approved",
  "declined",
]);

// ─── users ──────────────────────────────────────────────
// Intentionally minimal. No name, no profile, no PII beyond email.
// email_verified_at is null until the magic-link is clicked.

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── verifications ──────────────────────────────────────
// Immutable audit trail — one row per Veriff attempt.
// Current status = most recent "approved" row where expires_at > now().
// "expired" is never written — it's computed at query time.

export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  veriffSessionId: text("veriff_session_id").notNull().unique(),
  status: verificationStatusEnum("status").notNull().default("pending"),
  ageFloor: integer("age_floor"), // 18 or 21 — only set on approval
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── partners ───────────────────────────────────────────
// Sites that integrate CAGE (e.g. Facebook, Instagram).
// Each partner gets a client_id (the uuid) and a hashed secret.
// redirect_uris is a simple text[] — no separate table needed at launch.

export const partners = pgTable("partners", {
  id: uuid("id").primaryKey().defaultRandom(), // this IS the client_id
  name: text("name").notNull(),
  domain: text("domain").notNull().unique(),
  clientSecretHash: text("client_secret_hash").notNull(),
  ageFloorRequired: integer("age_floor_required").notNull().default(18),
  redirectUris: text("redirect_uris").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── partner_subs ───────────────────────────────────────
// One row per user × partner. The sub_hash is a unique anonymous ID
// issued to THIS partner for THIS user. Partners cannot cross-reference
// users across the network — structurally impossible.

export const partnerSubs = pgTable(
  "partner_subs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id),
    subHash: text("sub_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One anonymous sub per user per partner — enforced at DB level
    uniqueIndex("partner_subs_user_partner_idx").on(
      table.userId,
      table.partnerId
    ),
  ]
);
