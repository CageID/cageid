# Chrome Extension — Phase 1 Implementation Plan

**Design:** `2026-03-09-chrome-extension-design.md`

## Step 1: Extension Scaffold

Create `apps/extension/` with:

- `package.json` with `name`, `private: true`, build scripts:
  - `dev`: `tsc --watch & node scripts/copy-static.js --watch` (or a simple shell script)
  - `build`: `tsc && node scripts/copy-static.js`
- `tsconfig.json` extending `@repo/typescript-config/node.json`, `outDir: dist`, `rootDir: src`
- `scripts/copy-static.js` — copies `static/` contents to `dist/`
- `static/manifest.json` — Manifest V3 with all permissions, background worker, content scripts, popup
- `static/popup.html` — HTML shell linking to `popup.css` and `popup.js`
- `static/popup.css` — CAGE-themed styles for popup
- `static/icons/` — placeholder PNG icons (16, 48, 128px)

**Verify:** `pnpm build` in `apps/extension` produces a valid `dist/` folder.

## Step 2: Config Module

Create `src/config.ts`:
- `SERVER_URL` constant — `http://localhost:3001` for dev, `https://server-production-0ea14.up.railway.app` for prod
- `WEB_URL` constant — `http://localhost:3000` for dev, `https://cageid-web.vercel.app` for prod
- `IS_DEV` flag based on a build-time toggle or hardcoded for now
- TODO comment about updating to `cageid.app` / `api.cageid.app` when custom domains are set up

## Step 3: Popup UI

Create `src/popup.ts`:
- On load: read session from `chrome.storage.local`
- If no session → show logged-out state (email form)
- If session exists → call `GET {SERVER}/verify/status` with Bearer token to get verification status, show logged-in state
- **Logged-out form handler:**
  - Validate email
  - Call `POST {SERVER}/auth/magic-link` with `{ email, source: "extension" }`
  - Switch to "check your email" state
  - "Resend" link with 30s cooldown timer
- **Logged-in state:**
  - Display email, verification status badge
  - "Connected sites" placeholder
  - Log out button → clear `chrome.storage.local`, switch to logged-out state
- Listen for `chrome.storage.onChanged` to reactively update when background worker stores session

## Step 4: Content Script

Create `src/content.ts`:
- On page load: check for `document.getElementById('cage-ext-session')`
- If found: read `data-session-id` and `data-email` attributes
- Send `chrome.runtime.sendMessage({ type: 'SESSION_CAPTURED', sessionId, email })`
- Remove the element from DOM after reading (cleanup)

## Step 5: Background Service Worker

Create `src/background.ts`:
- `chrome.runtime.onInstalled` listener — log extension installed
- `chrome.runtime.onMessage` listener:
  - Handle `SESSION_CAPTURED` → store `{ sessionId, email }` in `chrome.storage.local`
- `chrome.webNavigation.onBeforeNavigate` listener:
  - Filter for URLs matching `*/oauth/authorize*` on CAGE domains
  - `console.log('OAuth authorize detected:', url)` — no interception yet (Phase 2)

## Step 6: Server — Extension Verify Endpoint

Modify `apps/server/src/routes/auth.ts`:
- In `GET /auth/verify`: check for `source=extension` query param
- If `source=extension`:
  - Still verify token and create session (identical logic)
  - Instead of `setCookie` + `redirect`, render HTML page:
    - `<div id="cage-ext-session" data-session-id="{sessionId}" data-email="{email}">`
    - User message: "You're signed in to the CAGE extension. You can close this tab."
  - Style the page to match CAGE branding

## Step 7: Server — Bearer Token Auth

Modify `apps/server/src/middleware/requireAuth.ts`:
- Before checking `cage_session` cookie, check for `Authorization: Bearer {token}` header
- If present: look up `session:{token}` in Redis (same logic as cookie-based lookup)
- This allows extension API calls without cookies

## Step 8: Update Tests

- Update `auth.routes.test.ts`: add tests for `source=extension` verify flow
- Update `requireAuth` tests (if they exist): test Bearer token path
- Ensure all existing tests still pass

## Step 9: Integration Test

- Build extension (`pnpm build` in `apps/extension`)
- Load as unpacked in Chrome
- Test full flow:
  1. Open popup → see login form
  2. Enter email, send magic link
  3. Click link in email → see "signed in to extension" page
  4. Popup updates to logged-in state
  5. Log out → back to login form

## Dependencies

Steps 1–5 (extension code) are independent of steps 6–7 (server changes). Step 8 depends on step 7. Step 9 depends on all previous steps.

Can parallelize: Steps 1-5 (extension) and Steps 6-7 (server) can be built simultaneously.
