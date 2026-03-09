# Chrome Extension — Phase 1 Design

**Date:** 2026-03-09
**Phase:** 1 — Skeleton + Login Flow

## Overview

A Chrome extension for CAGE that lets users log in and view their verification status directly from the browser toolbar. Phase 1 covers the extension skeleton, popup UI, and a dedicated magic-link login flow. Phase 2 (future) will add OAuth interception and silent token passing.

## File Structure

```
apps/extension/
  src/
    popup.ts          # Popup logic (login form, status display)
    background.ts     # Service worker (webNavigation listener, session mgmt)
    content.ts        # Content script (reads session from verify page)
    config.ts         # Server/web URL constants (dev/prod)
  static/
    manifest.json     # Manifest V3
    popup.html        # Popup UI
    popup.css         # Styles matching CAGE palette
    icons/            # 16, 48, 128px icons
  package.json        # Build scripts (tsc watch)
  tsconfig.json       # TypeScript config
  dist/               # Build output — load as unpacked extension
```

## Manifest V3

- **Name:** "CAGE — Age Verification"
- **Description:** "Verify your age once, use it everywhere. No personal data shared."
- **Permissions:** `storage`, `webNavigation`, `activeTab`
- **Host permissions:** Production CAGE URLs + localhost for dev
- **Background:** service worker (`background.js`)
- **Content scripts:** Match CAGE web app URLs, run `content.js`
- **Action:** popup (`popup.html`)

> **Note:** Host permissions and content script matches currently use Vercel/Railway URLs. Update to `cageid.app` / `api.cageid.app` when custom domains are configured.

## Login Flow

The extension uses a dedicated login flow, independent of the web app's cookie-based auth.

### Sequence

1. User opens popup → popup reads `chrome.storage.local` for existing session
2. No session → shows logged-out UI with email input
3. User submits email → popup calls `POST {SERVER}/auth/magic-link` with `{ email, source: "extension" }`
4. Popup shows "Check your email" state
5. User clicks magic link → opens `{WEB_URL}/api/auth/verify?token=XYZ&source=extension`
6. Server detects `source=extension`: verifies token, creates session, renders a simple HTML page with:
   - Visible message: "You're now signed in to the CAGE extension. You can close this tab."
   - Hidden element: `<div id="cage-ext-session" data-session-id="..." data-email="...">`
7. Content script detects `#cage-ext-session`, reads data attributes, sends `chrome.runtime.sendMessage`
8. Background worker stores session in `chrome.storage.local`
9. Popup reactively updates to logged-in state

### Why Dedicated Login?

- The web app uses httpOnly cookies — the extension can't read them
- A dedicated flow keeps the extension's auth completely independent
- The extension stores a sessionId and uses it as a Bearer token for API calls
- No dependency on the web app being open or logged in

## Popup UI States

**Dimensions:** 360px wide, up to 480px tall.

### Logged Out
- Dark header (`#282e00`) with CAGE logo
- "Check Age, Go Everywhere" tagline
- Email input field (styled to match web app)
- "Send Magic Link" button (accent green `#a0ff57`)
- Footer: "No password needed"

### Check Your Email
- Same header
- Envelope/mail icon
- "Check your email" heading
- "We sent a sign-in link to {email}"
- "Click the link to sign in to the extension."
- "Resend" link (30s cooldown)

### Logged In
- Same header
- Green verified badge: "Verified 18+" (or current status)
- User email displayed
- "Connected sites" section (placeholder for Phase 1)
- "Log out" button

## Color Palette (from web app)

| Token | Value | Usage |
|-------|-------|-------|
| `cage-dark` | `#282e00` | Backgrounds, buttons, text |
| `cage-mid` | `#999c7e` | Secondary text, borders |
| `cage-accent` | `#a0ff57` | Button text, verified badge |
| `cage-bg` | `#fafaf7` | Light background |
| `cage-bg-dark` | `#1a1d00` | Dark mode background |
| `cage-text` | `#1c1f00` | Primary text |
| `cage-text-dark` | `#e8e8d8` | Dark mode text |
| `cage-border` | `rgba(153,156,126,0.2)` | Border color |
| `cage-error` | `#dc2626` | Error text |
| `cage-amber` | `#d97706` | Pending/warning |

## Server Changes

### 1. Modify `GET /auth/verify` (auth.ts)

When `source=extension` query param is present:
- Still verify token and create session (same as normal flow)
- Instead of setting a cookie + redirecting, render an HTML page with:
  - Session data in `<div id="cage-ext-session" data-session-id="..." data-email="...">`
  - User-visible message: "Signed in to CAGE extension. You can close this tab."

### 2. Update `requireAuth` middleware

Accept `Authorization: Bearer {sessionId}` header in addition to the `cage_session` cookie. This allows the extension to call authenticated endpoints (`/verify/status`, etc.) without cookies.

## Background Service Worker

- **On install/startup:** load session from `chrome.storage.local`
- **Message listener:** handle `SESSION_CAPTURED` from content script, store session
- **webNavigation listener:** filter for `/oauth/authorize` on CAGE domains — `console.log` only (Phase 2 will intercept)
- **Session check:** expose internal function to check if authenticated

## Content Script

- Runs on CAGE web app URLs
- On page load: checks for `#cage-ext-session` element
- If found: reads `data-session-id` and `data-email`, sends to background worker
- Minimal — does nothing on pages without the handoff element

## Dev Setup

- TypeScript compiled via `tsc` to `dist/`
- `pnpm dev` runs `tsc --watch` + copies static files
- `pnpm build` for one-shot build
- Load `dist/` as unpacked extension in `chrome://extensions` (Developer mode)

## What's NOT in Phase 1

- OAuth interception (Phase 2)
- Silent token passing to partner sites (Phase 3)
- Consent overlay on partner sites (Phase 3)
- Production icons/branding (placeholder for now)
