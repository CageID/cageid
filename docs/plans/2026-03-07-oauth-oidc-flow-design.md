# OAuth 2.0 / OIDC Flow Design

**Date:** 2026-03-07
**Status:** Approved

---

## Goal

Implement the core OAuth 2.0 Authorization Code Flow with full OIDC compliance. Partners redirect users to CAGE, CAGE confirms age verification, and redirects back with an authorization code. The partner exchanges the code for a signed OIDC ID token containing the age claim.

## Approach

Hand-rolled OIDC using `jose` for RS256 JWT signing and JWKS formatting. No `node-oidc-provider` — too opinionated for CAGE's narrow use case. Full control, every line is ours.

---

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/oauth/authorize` | GET | Partner redirects user here to start the flow |
| `/oauth/token` | POST | Exchange auth code for OIDC ID token |
| `/oauth/.well-known/openid-configuration` | GET | OIDC discovery document |
| `/oauth/.well-known/jwks.json` | GET | CAGE's public RSA key for partner-side verification |

All route handlers stay thin. All business logic lives in `token.service.ts` and `partner.service.ts`.

---

## Authorization Code Flow

### Happy path (verified user)

1. Partner redirects user to `GET /oauth/authorize?client_id=&redirect_uri=&state=&response_type=code`
2. Validate: `client_id` exists and is active, `redirect_uri` is in partner's `redirect_uris[]`, `response_type=code`
3. Check user session (cookie). No session → show login page (out of scope for this feature)
4. Check `age_floor_required` on partner row. Query `verifications` for most recent `approved` row where `expires_at > now()`. If user's `age_floor < partner.age_floor_required` → redirect back with `error=access_denied`
5. Check `partner_subs` for existing `(user_id, partner_id)` row:
   - **Exists** → skip consent, proceed to step 6
   - **Not found** → show consent page ("Confirm you want to share your age verification with [partner name]"). On confirm, create `partner_subs` row with a new random UUID as `sub_hash`
6. Generate a 32-byte random auth code. Store in Redis: `oauth_code:{code}` → `{ userId, partnerId, redirectUri }`, TTL 60 seconds
7. Redirect to `redirect_uri?code=...&state=...`

### Token exchange

8. Partner POSTs to `/oauth/token` with `code`, `client_id`, `client_secret`, `grant_type=authorization_code`
9. Validate `client_secret` against `client_secret_hash` (argon2 verify)
10. Fetch Redis key `oauth_code:{code}` — if missing or expired → `400 { "error": "invalid_grant" }`
11. **Delete the Redis key immediately** (single-use enforcement)
12. Load the user's verification row to get `age_floor`
13. Look up `partner_subs` row to get `sub_hash`
14. Sign and return the ID token

### Unverified user path (step 4: no valid verification)

- Store `{ client_id, redirect_uri, state }` in session under `pending_oauth`
- Redirect to `/verify` with messaging explaining why — session preserves context for automatic flow resumption after verification completes

---

## ID Token

Signed with RS256. Expiry: 1 hour. No refresh tokens at launch.

```json
{
  "iss": "https://cageid.app",
  "sub": "<partner-scoped sub_hash>",
  "aud": "<partner client_id>",
  "iat": "<now>",
  "exp": "<now + 1 hour>",
  "age_verified": true,
  "age_floor": 18
}
```

- `sub` is the stable `sub_hash` from `partner_subs` — unique per user×partner, opaque across partners
- `age_floor` is read from the user's verification row, not hardcoded
- Partners verify offline using CAGE's public JWKS

---

## Key Management

- `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` loaded from Doppler as PEM strings at startup
- Imported once via `jose`'s `importPKCS8` / `importSPKI` and cached in module scope
- `/.well-known/jwks.json` exports the public key via `jose`'s `exportJWK` with a static `kid`
- No key rotation at launch

---

## Auth Code Storage

- **Upstash Redis**, key: `oauth_code:{code}`
- **60-second TTL** — auto-expires if not exchanged
- **Single-use** — deleted immediately on exchange at `/oauth/token`

---

## Error Handling

| Condition | Response |
|---|---|
| Unknown `client_id` or inactive partner | Show error page — do NOT redirect (unsafe) |
| `redirect_uri` not in partner's allowed list | Show error page — do NOT redirect (unsafe) |
| User's `age_floor` < `partner.age_floor_required` | `redirect_uri?error=access_denied&state=...` |
| Expired or invalid auth code | `400 { "error": "invalid_grant" }` |
| Wrong `client_secret` | `401 { "error": "invalid_client" }` |

---

## Files Affected

```
apps/server/src/
  routes/
    oauth.ts                        ← new: all 4 endpoints
  services/
    token.service.ts                ← new: sign JWT, generate sub_hash, JWKS export
    partner.service.ts              ← new: validate client credentials, lookup partner
  lib/
    redis.ts                        ← new: Upstash Redis client
  index.ts                          ← modify: register oauth routes
```

New dependency: `jose`, `@upstash/redis`
New env vars: `REDIS_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `OIDC_ISSUER`
