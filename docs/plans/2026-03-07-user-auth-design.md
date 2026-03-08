# User Auth Design — Magic Link

**Date:** 2026-03-07
**Feature:** User authentication via magic link (register + login unified)
**Status:** Approved

## Overview

CAGE users authenticate via passwordless magic link. A single unified flow handles both
registration and login: the user submits their email, receives a one-time link, and clicks
it to start a session. Accounts are auto-created on first use.

## Endpoints

| Method   | Path                | Auth required | Purpose                                        |
|----------|---------------------|---------------|------------------------------------------------|
| `POST`   | `/auth/magic-link`  | No            | Request magic link (rate limited: 3/email/hr)  |
| `GET`    | `/auth/verify`      | No            | Verify token → create session → set cookie     |
| `POST`   | `/auth/logout`      | Yes           | Delete session from Redis                      |
| `DELETE` | `/auth/account`     | Yes           | Hard delete user + cascade                     |

## Magic Link Flow

1. `POST /auth/magic-link` with `{ email }`
   - Check `magic_link_rate:{email}` counter in Redis — return `429` if ≥ 3 within the hour
   - Increment rate counter (`INCR` + `EXPIRE 3600` on first request)
   - Upsert user row (insert if new, no-op if existing)
   - Generate 32-byte hex token
   - Store `magic_link:{token}` → `{ userId, email }` in Redis, TTL 600s
   - Send email via Resend with link: `{APP_BASE_URL}/auth/verify?token={token}`
   - Always return `200 OK` — never reveal whether the email address exists

2. `GET /auth/verify?token=...`
   - Use `GETDEL magic_link:{token}` — atomic lookup + delete (no race condition)
   - If missing/expired: return `400`
   - Set `users.email_verified_at = NOW()` (if not already set)
   - Generate session ID (UUID)
   - Store `session:{id}` → `{ userId }` in Redis, TTL 7,776,000s (90 days)
   - Set `cage_session` cookie (httpOnly, secure, sameSite=lax, maxAge=90 days)
   - Return `200 OK`

## Rate Limiting

Fixed-window rate limit on magic link requests: **3 requests per email per hour**.

Redis key: `magic_link_rate:{email}` — integer counter, TTL 3600s set on first increment.
Returns `429 Too Many Requests` when counter ≥ 3.

## requireAuth Middleware

Reads `cage_session` cookie → looks up `session:{id}` in Redis → sets `userId` in Hono
context via `c.set('userId', ...)` → calls `next()`.

Returns `401 Unauthorized` if cookie is missing or session not found in Redis (expired or
logged out). Applied to `POST /auth/logout` and `DELETE /auth/account`.

## Account Deletion

Hard delete: removes the `users` row. Foreign key cascades handle `verifications` and
`partner_subs`. No soft delete. No `deleted_at` column.

Future nice-to-have: an `audit_events` table (timestamp, event type, no user-identifying
info) for operational visibility without retaining personal data. Not part of this feature.

## Redis Key Reference

| Key                          | Value                   | TTL                 |
|------------------------------|-------------------------|---------------------|
| `magic_link:{token}`         | `{ userId, email }`     | 600s (10 min)       |
| `magic_link_rate:{email}`    | integer count           | 3600s (1 hr)        |
| `session:{id}`               | `{ userId: string }`    | 7,776,000s (90 days)|

## Data Layer

No schema migrations required. The `users` table already has all required columns:
- `id`, `email`, `email_verified_at`, `created_at`

`email_verified_at` is set on first successful magic link verification.

## Dependencies

- **New:** `resend` (official Resend SDK for email delivery)
- **Existing:** `@upstash/redis`, `drizzle-orm`, `hono`

## New Environment Variables

| Variable          | Purpose                                      |
|-------------------|----------------------------------------------|
| `RESEND_API_KEY`  | Resend API key for sending emails            |
| `APP_BASE_URL`    | Base URL for magic link (e.g. `https://cageid.app`) |

Add both to `apps/server/.env.example`, `turbo.json` build env, and Doppler.

## Code Structure

```
src/
  services/
    auth.service.ts              # sendMagicLink, verifyMagicLink, createSession,
                                 # deleteSession, deleteAccount
    __tests__/
      auth.service.test.ts       # mocks Redis + Resend; tests each function
  routes/
    auth.ts                      # 4 thin endpoint handlers calling auth.service
    __tests__/
      auth.routes.test.ts        # integration tests for all 4 endpoints
  middleware/
    requireAuth.ts               # cage_session → Redis → userId in context; 401 if missing
    __tests__/
      requireAuth.test.ts        # valid session, missing cookie, expired session
```

## Testing Approach

Same TDD pattern as the OAuth feature:

1. Write failing tests first
2. Implement until tests pass
3. Two-stage quality review per task (spec reviewer + code quality reviewer)

Test files mock Redis (`vi.mock('../lib/redis.js')`) and Resend (`vi.mock('resend')`).
No real network calls in tests.

## Security Notes

- `GETDEL` used for atomic token consumption — prevents double-use on concurrent requests
- Magic link response is always `200` — prevents email enumeration
- `cage_session` cookie: `httpOnly`, `secure`, `sameSite=lax`
- Rate limit applied before upsert — prevents account creation spam

## Session Lifecycle

- **Created:** on successful `GET /auth/verify`
- **Refreshed:** not refreshed (static 90-day TTL; refresh tokens are a future enhancement)
- **Destroyed:** on `POST /auth/logout` (explicit) or Redis TTL expiry (passive)

## Build Order Context

This feature enables verified users for the Veriff webhook handler (next feature). The
OAuth token flow already reads `session:{id}` from Redis — this feature is what creates
those sessions.
