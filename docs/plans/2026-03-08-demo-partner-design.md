# Demo Partner Site Design — 2026-03-08

## Overview

Minimal Hono web app that acts as an OAuth client to CAGE. Proves the end-to-end OAuth/OIDC flow and demonstrates what data CAGE shares with partner sites. Two pages: a homepage with a "Verify with CAGE" button, and a callback page that displays the decoded ID token claims.

## Location & Stack

- `apps/demo-partner` — new Turborepo app
- Hono + `@hono/node-server` (same framework as CAGE server)
- Inline HTML templates (no React, no Tailwind)
- Port 3003
- Reads `DEMO_CLIENT_ID` and `DEMO_CLIENT_SECRET` from `.env`

## Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Homepage — "Demo App" branding, "Verify with CAGE" button |
| `/callback` | GET | OAuth callback — receives auth code, exchanges for ID token, displays decoded claims |

## OAuth Flow

1. User clicks "Verify with CAGE" on homepage
2. Redirects to `http://localhost:3001/oauth/authorize?client_id=...&redirect_uri=http://localhost:3003/callback&response_type=code&state=<random>`
3. CAGE handles login → verification → consent → redirects back with `?code=abc&state=<random>`
4. `/callback` handler:
   - Validates `state` matches (CSRF protection)
   - POSTs to `http://localhost:3001/oauth/token` with `grant_type`, `code`, `client_id`, `client_secret`
   - Decodes the returned `id_token` JWT payload (base64 decode, no signature verification needed for demo)
   - Renders the claims page

## Result Page

Card layout showing decoded JWT claims:

- **Header:** "Here's what CAGE shared with Demo App — nothing more."
- **Claims displayed:**
  - `age_verified` — green badge when true
  - `age_floor` — prominent (e.g. "18+")
  - `sub` — truncated anonymous ID
  - `iss`, `aud`, `exp`, `iat` — secondary info, smaller
- **Footer:** "No name, birthday, address, or document data was shared."

Monospace font for claim values. Clean card on a simple background.

## Error Handling

- Missing/invalid `code` param → error page with "Authorization failed" message
- Token exchange failure → error page with the error response from CAGE
- Missing `state` or state mismatch → error page with "Invalid state" message
- Missing env vars → crash on startup with clear error message

## Config

- `apps/demo-partner/package.json` with `"dev": "tsx watch --env-file=.env src/index.ts"`
- `.env` needs `DEMO_CLIENT_ID` and `DEMO_CLIENT_SECRET`
- `CAGE_SERVER_URL` defaults to `http://localhost:3001`
- Turborepo picks it up automatically with `pnpm dev`
