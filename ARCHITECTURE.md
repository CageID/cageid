# CAGE — Architecture Decisions

> **Purpose:** This file is the single source of truth for architectural decisions.
> If you're an AI assistant working on this codebase, read this before asking
> the developer questions — the answer is probably already here.

---

## Identity & Role

CAGE is an **OIDC Identity Provider (IdP)** for age verification. Partner sites
(Facebook, Instagram, etc.) are **OAuth clients**. CAGE never stores PII beyond
a user's email address — identity verification is handled entirely by Veriff.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Runtime | Node.js 20+ | LTS, TypeScript end-to-end |
| Framework | Hono | Faster than Express, edge-ready |
| Database | PostgreSQL on Neon | Serverless, managed backups |
| ORM | Drizzle | Type-safe queries, simple migrations |
| Cache | Redis (Upstash) | Sessions, rate limiting, auth codes |
| Auth tokens | jose | JWT signing/verification, JWKS formatting (RS256) |
| OIDC | jose (hand-rolled) | Custom OIDC endpoints — node-oidc-provider is too opinionated for CAGE's narrow use case |
| Password hashing | Argon2id | Memory-hard, safer than bcrypt |
| Secrets | Doppler | No .env files — ever |
| Hosting | Railway or Fly.io | Simple deploy, scales early on |
| Monorepo | Turborepo + pnpm | Shared types across server, app, extension |

---

## Database Schema (4 tables)

### users
- `id` (uuid, PK), `email` (text, unique), `email_verified_at` (timestamptz, nullable), `created_at`
- Intentionally minimal — no name, no profile, no PII beyond email
- `email_verified_at` is null until magic link is clicked

### verifications
- `id` (uuid, PK), `user_id` (FK → users), `veriff_session_id` (text, unique), `status` (enum: pending | approved | declined), `age_floor` (int, nullable), `verified_at`, `expires_at`, `created_at`
- **Immutable audit trail** — one row per Veriff attempt, never update in place
- "Expired" is **never written** — computed as `expires_at < now()` at query time
- Current verification = most recent approved row where `expires_at > now()`
- Expired verifications require full re-verification through Veriff

### partners
- `id` (uuid, PK = client_id), `name`, `domain` (unique), `client_secret_hash`, `age_floor_required` (default 18), `redirect_uris` (text[]), `active` (boolean), `created_at`
- `redirect_uris` is a simple text[] array — no separate table at launch
- Can be upgraded to a `partner_redirect_uris` table later if a self-serve portal needs it

### partner_subs
- `id` (uuid, PK), `user_id` (FK → users), `partner_id` (FK → partners), `sub_hash` (text), `created_at`
- Composite unique index on `(user_id, partner_id)` — enforced at DB level
- Each partner gets a **different anonymous sub ID** per user — cross-partner tracking is structurally impossible

---

## OAuth / OIDC Flow

### Protocol
**Standard OAuth 2.0 Authorization Code Flow with full OIDC compliance.**

Partners redirect users to CAGE → CAGE authenticates → CAGE redirects back with
an authorization code → partner exchanges code for an ID token. Exactly like
"Sign in with Google."

### Implementation Approach
**Hand-rolled OIDC with `jose`** — not `node-oidc-provider`. The `jose` library handles
all RS256 cryptography (key pairs, JWT signing, JWKS formatting) while we own the flow
logic. `node-oidc-provider` is too opinionated for CAGE's narrow use case (one claim,
custom Veriff integration, custom unverified-user page) and would fight us constantly.
Full control, every line is ours to understand and modify.

### Required Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oauth/authorize` | GET | Partner redirects user here |
| `/oauth/token` | POST | Exchange auth code for ID token |
| `/.well-known/openid-configuration` | GET | OIDC discovery document |
| `/.well-known/jwks.json` | GET | Public keys for token verification |

### ID Token Format (OIDC standard + custom claims)
```json
{
  "iss": "https://cageid.app",
  "sub": "partner_scoped_anonymous_hash",
  "aud": "partner_client_id",
  "exp": 1741996800,
  "iat": 1741910400,
  "age_verified": true,
  "age_floor": 18
}
```
- Signed with RS256 (CAGE's private key)
- Partners verify via CAGE's public JWKS endpoint
- `sub` is unique per user×partner — Facebook's sub for a user ≠ Twitter's sub

### Authorization Code Storage
- Stored in **Redis (Upstash)** with a **60-second TTL**
- Single-use — deleted immediately upon exchange at `/oauth/token`
- Redis is already in the stack for sessions and rate limiting — not a new dependency

### Unverified User at `/oauth/authorize`
- **Option B for launch:** Show a CAGE-hosted page explaining they need to verify,
  with a CTA to download the app or start verification
- **Store the original OAuth parameters** (client_id, redirect_uri, state) in the
  session so verification can resume the flow automatically afterward
- Designed to upgrade to inline Veriff verification (Option A) later
- Never return `error=unverified` to the partner (Option C) — that pushes UX
  responsibility onto every partner and kills adoption

---

## Veriff Integration

### Flow
1. User taps "Get Verified" in CAGE app
2. CAGE backend creates a Veriff session (POST to Veriff API with `vendorData` = CAGE user ID)
3. User is redirected to Veriff's SDK — scans ID, does liveness check
4. **CAGE never sees the ID document, selfie, or biometrics** — all inside Veriff's environment
5. Veriff posts a signed webhook to CAGE with the result
6. CAGE stores only: status, age bracket (18+ or 21+), timestamps
7. Verification valid for 12 months

### Webhook Security
- Veriff signs every webhook with **HMAC-SHA256** using a shared secret
- **Always verify the signature first** — reject if invalid
- This is the most security-critical endpoint in CAGE

### What CAGE Receives from Veriff
```json
{
  "status": "approved",
  "vendorData": "cage_uid_xxx",
  "person": {
    "age": null,
    "ageCategory": "18+"
  }
}
```

### What CAGE Never Receives
Government ID images, full legal name, exact DOB, face biometrics, address, document number.

---

## Security Decisions

| Measure | Detail |
|---------|--------|
| Webhook validation | HMAC-SHA256 on all Veriff webhooks |
| Rate limiting | Register: 5/hr per IP. Login: 10/hr per IP. Verify start: 3/day per user |
| JWT signing | RS256 (asymmetric) — partners can't forge tokens even if compromised |
| Password hashing | Argon2id — memory-hard |
| Partner isolation | Per-partner sub IDs — no cross-site tracking |
| DB encryption | Neon encryption at rest (configure before storing real data) |
| Audit logging | Log every verification attempt, token issuance, partner auth (separate from main DB) |
| Secrets | Doppler — never in .env files, never in git. Rotate immediately if committed. |

---

## Environment Variables

| Key | Purpose |
|-----|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `REDIS_URL` | Upstash Redis connection string |
| `VERIFF_API_KEY` | From Veriff dashboard |
| `VERIFF_SECRET_KEY` | For webhook HMAC verification |
| `VERIFF_BASE_URL` | `https://stationapi.veriff.com` (sandbox for dev) |
| `JWT_PRIVATE_KEY` | RS256 private key (PEM format) |
| `JWT_PUBLIC_KEY` | RS256 public key (published at /jwks.json) |
| `OIDC_ISSUER` | `https://cageid.app` |
| `NODE_ENV` | `development` or `production` |
| `PORT` | `3000` |
| `CORS_ORIGINS` | Allowed origins for CORS |

---

## Folder Structure

```
apps/server/src/
├── routes/           ← HTTP endpoints (thin layer)
│   ├── auth.ts       ← register / login / logout / delete
│   ├── verify.ts     ← start Veriff session + poll status
│   ├── oauth.ts      ← OIDC authorize / token / discovery
│   └── webhook.ts    ← Veriff webhook receiver
├── services/         ← Business logic (routes call services, never the reverse)
│   ├── verification.service.ts
│   ├── token.service.ts
│   ├── user.service.ts
│   └── partner.service.ts
├── db/
│   ├── schema.ts     ← Drizzle table definitions
│   ├── index.ts      ← DB connection
│   └── migrations/   ← Generated by Drizzle
├── middleware/
│   ├── auth.middleware.ts  ← JWT validation on protected routes
│   ├── ratelimit.ts       ← Per-IP + per-user limits
│   └── cors.ts
├── lib/
│   ├── veriff.ts     ← Veriff API wrapper
│   ├── crypto.ts     ← Hashing, key generation
│   └── logger.ts
└── index.ts          ← App entry point
```

---

## API Endpoints

### User & Auth (Public)
- `POST /auth/register` — Create CAGE account
- `POST /auth/login` — Returns session token
- `POST /auth/logout` — Invalidates session
- `DELETE /auth/account` — Full account deletion (GDPR)

### Verification (Authenticated)
- `POST /verify/start` — Creates Veriff session, returns URL
- `GET /verify/status` — Poll verification result
- `POST /verify/webhook` — Veriff posts results here (HMAC protected)

### OIDC / OAuth 2.0
- `GET /oauth/authorize` — Partner redirects user here
- `POST /oauth/token` — Exchange code for age token
- `GET /oauth/.well-known/openid-configuration` — OIDC discovery
- `GET /oauth/.well-known/jwks.json` — Public keys for verification

---

## Key Service Responsibilities

- **verification.service** — Creates Veriff sessions, handles webhook results, checks verification status. Most important service.
- **token.service** — Signs JWTs with CAGE's private key, generates per-partner anonymous sub IDs, revokes tokens.
- **user.service** — Account creation (email only), login sessions, account deletion.
- **partner.service** — Partner registration, client credential validation, partner management.
