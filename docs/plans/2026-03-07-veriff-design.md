# Veriff Integration Design

**Date:** 2026-03-07
**Feature:** Age verification via Veriff — full flow from OAuth trigger to approved session
**Status:** Approved

## Overview

When a user hits the OAuth authorize endpoint without a valid verification, CAGE redirects them
through a Veriff identity check. Veriff processes the document and biometrics, posts a signed
webhook decision back to CAGE, and the user's browser polls for the result. On approval, the
OAuth flow resumes automatically.

## Endpoints

| Method | Path               | Auth required | Purpose                                          |
|--------|--------------------|---------------|--------------------------------------------------|
| `GET`  | `/verify/start`    | Yes           | Create Veriff session, redirect to SDK URL       |
| `POST` | `/verify/webhook`  | No (HMAC)     | Receive Veriff decision, update verifications row|
| `GET`  | `/verify/callback` | Yes           | Polling page served after user finishes in Veriff|
| `GET`  | `/verify/status`   | Yes           | Returns current verification status for the user |

## Full Data Flow

1. **OAuth authorize** — `GET /oauth/authorize` finds no valid `verifications` row for the user.
   Stores `{ client_id, redirect_uri, state, code_challenge }` as `pending_oauth` in the Redis
   session. Returns `302` to `/verify/start`.

2. **`GET /verify/start`** — the browser arrives here via the redirect (GET, not POST). Handler
   calls Veriff's REST API (`POST /v1/sessions`) with `{ vendorData: userId }` so the userId is
   embedded in the webhook payload. On success: inserts a `verifications` row with
   `status=pending`, stores `veriffSessionId` in the Redis session, returns `302` to
   `verification.url` (Veriff's hosted SDK). If the Veriff API call fails, returns a `502` error
   page — no row is inserted.

3. **User completes Veriff** — Veriff processes documents and biometrics (typically seconds to
   minutes). Redirects the browser to `{APP_BASE_URL}/verify/callback`.

4. **`POST /verify/webhook`** — Veriff POSTs a decision asynchronously (may arrive before or
   after the browser callback). Verifies HMAC signature, extracts `vendorData` (userId) and
   (on approval) `person.dateOfBirth`. Computes `age_floor`. Updates the `verifications` row.
   Returns `200` in all cases — Veriff retries on non-200.

5. **`GET /verify/callback`** — serves an HTML page that polls `GET /verify/status` every 2
   seconds, up to 30 seconds. Shows a spinner while pending.

6. **`GET /verify/status`** — queries the most recent `verifications` row for the user. Returns
   `{ status: "pending" | "approved" | "declined" | "none" }`. `"none"` means no row exists
   (e.g. if `/verify/start` failed before inserting).

7. **Polling resolves:**
   - `approved` → `window.location.href = "/oauth/authorize"`. The authorize endpoint reads
     `pending_oauth` from the session and resumes the OAuth flow. Client stays dumb; all logic
     is server-side.
   - `declined` → show error message on the callback page.
   - 30s timeout still `pending` or `none` → show "this is taking longer than expected" message.
     No redirect, no auto-retry.

## Webhook Handler

### HMAC Verification

Veriff signs the raw request body with HMAC-SHA256 using `VERIFF_WEBHOOK_SECRET`. The handler
must read the raw body as a string **before** any JSON parsing — if Hono middleware consumes the
body first, re-reading it won't work.

Verification:
```ts
const computed = createHmac('sha256', secret).update(rawBody).digest('hex');
const received = request.headers.get('x-hmac-signature') ?? '';
if (!timingSafeEqual(Buffer.from(computed), Buffer.from(received))) {
  return c.json({ error: 'invalid signature' }, 400);
}
```

Use `crypto.timingSafeEqual` — not `===`. Regular string comparison leaks timing information
that can theoretically allow an attacker to reconstruct the secret.

### Webhook Payload (relevant fields)

```json
{
  "status": "approved | declined | resubmission_requested | ...",
  "verification": {
    "vendorData": "<userId>",
    "person": { "dateOfBirth": "YYYY-MM-DD" }
  }
}
```

Only `approved` and `declined` trigger DB updates. All other statuses return `200` no-op.
If `vendorData` (userId) is not found in the DB, return `200` no-op — do not leak that the user
doesn't exist.

## Age Floor Computation

Two tiers, applied on `approved` webhook only:

```
age = current year − birth year, adjusted if birthday hasn't occurred yet this calendar year
if age >= 21 → age_floor = 21
if age >= 18 → age_floor = 18
if age <  18 → status = "declined", no age_floor set
```

**Implementation note:** compute age by subtracting birth year from current year, then checking
whether the birth month/day has passed yet this calendar year. Do not use millisecond arithmetic
(`Math.floor((now - dob) / msInYear)`) — it drifts with leap years.

**Under-18 edge case:** Veriff may approve a session that CAGE computes as under 18 (unusual
but defensive). When this happens:
- Set `status = "declined"` (no `age_floor`)
- Emit `console.warn({ userId, computedAge })` — no PII (no DOB, no name)
- This makes the case debuggable if it ever occurs in production

## Error Handling

| Endpoint | Condition | Response |
|----------|-----------|----------|
| `GET /verify/start` | Veriff API error | `502` error page; no row inserted |
| `POST /verify/webhook` | HMAC mismatch | `400` |
| `POST /verify/webhook` | Unknown userId | `200` no-op |
| `POST /verify/webhook` | DB failure | `500` (Veriff will retry) |
| `GET /verify/callback` | Session expired (`requireAuth` fails) | Redirect to `/auth/magic-link` |
| `GET /verify/status` | No verifications row | `{ status: "none" }` |

Note on callback session expiry: `requireAuth` returns `401` by default, but the callback route
handles this case explicitly — redirect to `/auth/magic-link` rather than surfacing a raw 401.
With a 90-day session TTL this is unlikely but should be graceful.

## Redis Key Reference

| Key | Value | TTL |
|-----|-------|-----|
| `session:{id}` | `{ userId, pending_oauth?, veriffSessionId? }` | 90 days (existing) |

No new Redis key types. `veriffSessionId` and `pending_oauth` are fields written into the
existing session object.

## Data Layer

The `verifications` table already exists with all required columns:
`id`, `userId`, `veriffSessionId` (unique), `status` (pending/approved/declined enum),
`ageFloor`, `verifiedAt`, `expiresAt`, `createdAt`.

No schema migrations required.

One row is inserted per Veriff session attempt (immutable audit trail). Current verification
status for a user = most recent `approved` row where `expires_at > now()`.

## Dependencies

- **New:** none (raw `fetch` to Veriff REST API — no Veriff SDK needed)
- **New env vars:** `VERIFF_API_KEY`, `VERIFF_WEBHOOK_SECRET`,
  `VERIFF_BASE_URL` (default: `https://stationapi.veriff.com`)
- **Existing:** `@upstash/redis`, `drizzle-orm`, `hono`, Node `crypto`

Add new env vars to `apps/server/.env.example`, `turbo.json` build env, and Doppler.

## Code Structure

```
src/
  services/
    verify.service.ts              # createVeriffSession, handleWebhook,
                                   # getVerificationStatus, computeAgeFloor
    __tests__/
      verify.service.test.ts       # mocks Veriff API + Redis + DB; tests each function
  routes/
    verify.ts                      # 4 thin endpoint handlers calling verify.service
    __tests__/
      verify.routes.test.ts        # integration tests for all 4 endpoints
```

`requireAuth` middleware (existing) applied to `GET /verify/start`, `GET /verify/callback`,
`GET /verify/status`. Webhook endpoint is public but HMAC-authenticated.

## Testing Approach

Same TDD pattern as auth and OAuth features:

1. Write failing tests first
2. Implement until tests pass
3. Two-stage quality review per task (spec reviewer + code quality reviewer)

Key test cases:
- HMAC verification: valid signature, invalid signature, timing-safe comparison path
- Age floor: exactly 18, exactly 21, birthday-not-yet-this-year, under-18 (defensive branch)
- Webhook no-ops: unknown status, unknown userId
- Callback session expiry → redirect to magic link
- Status endpoint: `none` when no row exists, each status value
- Polling timeout path (30s)

## Security Notes

- HMAC-SHA256 with `timingSafeEqual` for webhook signature verification
- `vendorData` = userId (not email) — no PII in transit to Veriff
- Webhook handler always returns `200` to Veriff regardless of outcome (except HMAC failure)
- No raw DOB stored — only the computed `age_floor`
- `console.warn` on under-18 edge case logs only `{ userId, computedAge }` — no PII
