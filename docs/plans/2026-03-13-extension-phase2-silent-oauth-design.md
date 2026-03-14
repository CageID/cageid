# Phase 2: Silent OAuth Pass-Through — Design

## Scope

When the extension detects a partner site redirecting to `/oauth/authorize`, and the user is already verified + has consented to that partner, the extension silently completes the OAuth flow — the user never sees the CAGE website. If they haven't consented yet, the normal redirect happens untouched.

## Flow

1. **Detection** — Background service worker's `webNavigation.onBeforeNavigate` fires when a tab navigates to `/oauth/authorize`
2. **Eligibility check** — Extension calls `POST /oauth/extension-authorize` with Bearer token + the OAuth query params (`client_id`, `redirect_uri`, `response_type`, `state`, `scope`)
3. **Server validates** — Checks session, partner active, redirect_uri allowlisted, user verified, age floor met, and `partner_subs` row exists (prior consent)
4. **Success** — Server returns `{ code, redirect_uri, state }`. Extension navigates the tab to `redirect_uri?code=XXX&state=YYY`
5. **Fallback** — If anything fails (no consent, unverified, invalid partner), server returns an error. Extension does nothing — lets the normal redirect proceed to the CAGE website

## New Server Endpoint

`POST /oauth/extension-authorize`

- Auth: `Authorization: Bearer {sessionId}` (reuses existing `requireAuth` middleware)
- Body: `{ client_id, redirect_uri, response_type, state?, scope? }`
- Success: `200 { code, redirect_uri, state }`
- Failure: `400/401/403` with `{ error, error_description }` — extension ignores and lets normal flow proceed

### Validation Steps (server-side)

1. `requireAuth` middleware validates Bearer token, sets userId
2. Validate `response_type === "code"`
3. Look up partner by `client_id`, verify active
4. Validate `redirect_uri` against partner's allowlist
5. Query user's latest approved verification, check not expired
6. Check `ageFloor >= partner.ageFloorRequired`
7. Check `partner_subs` row exists for this user+partner (prior consent)
8. If all pass: issue auth code via `generateAuthCode()`, store in Redis, return `{ code, redirect_uri, state }`
9. If any fail: return error JSON, extension falls through to normal OAuth flow

## Extension Changes

- **background.ts** — Replace console.log placeholder with interception logic: call endpoint, redirect on success or let normal flow proceed on failure
- **manifest.json** — May need `webRequest` or `declarativeNetRequest` permission if `webNavigation` alone can't cancel/redirect navigations
- **config.ts** — No changes needed, `OAUTH_PATTERNS` already defined

## What's NOT in Phase 2

- No in-extension consent UI (Phase 3)
- No popup badge/notification showing interception happened
- No partner site content script injection
- No handling of first-time partners (falls through to normal CAGE website)

## Decisions

- **Silent pass-through only** for already-consented partners (option A)
- **First-time consent** falls through to normal CAGE website redirect (option A, Phase 3 will add overlay)
- **Dedicated endpoint** `POST /oauth/extension-authorize` rather than reusing existing `/oauth/authorize` (option A — cleaner, safer)
