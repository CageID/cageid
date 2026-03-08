# Web Frontend Design — 2026-03-08

## Overview

Minimal, functional Next.js frontend for CAGE. Six pages that let a user walk through the full journey: enter email → click magic link → verify with Veriff → see status. Clean SaaS aesthetic, Tailwind CSS, server-side rendering where possible.

## Approach

- Next.js App Router with server components by default, client components only for forms and polling
- Tailwind CSS with custom CAGE color palette
- `next.config.js` rewrites proxy `/api/*` → Hono server on port 3001
- Auth state checked server-side via `cage_session` cookie forwarded through the proxy
- No component library — hand-built from Tailwind utilities (page count is small enough)
- No frontend tests for v1 — 102 server tests cover API behavior; manual walkthrough validates the UI layer

## Pages

| Route              | Page                   | Auth Required | Component Type |
|--------------------|------------------------|---------------|----------------|
| `/`                | Landing / Login        | No            | Server (redirect if authed) + Client form |
| `/login`           | Login                  | No            | Same as `/`, preserves `next` query param |
| `/check-email`     | Check Your Inbox       | No            | Server (static content) |
| `/dashboard`       | Dashboard              | Yes           | Server (fetches status) + Client (delete modal) |
| `/verify/callback` | Verification Complete  | Yes*          | Client (polling loop) |
| `/consent`         | OAuth Consent          | Yes*          | Server (reads query params) + native form POST |

*`/verify/callback` handles expired sessions manually (redirect to `/login`). `/consent` is reached via server redirect from `/oauth/authorize` which already validated the session.

### Not pages

- `/verify/start` — server-side redirect (GET → Veriff URL). Frontend links to `/api/verify/start`.
- `/verify/webhook` — server-only, no UI.
- `/oauth/*` — server-only, partners never see the frontend.

## Color Palette

```
cage-dark:    #282e00   Primary backgrounds, buttons
cage-mid:     #999c7e   Secondary text, borders, muted elements
cage-accent:  #a0ff57   Sparingly — button text on dark bg, status badges
cage-bg:      #fafaf7   Light mode page background (warm off-white)
cage-bg-dark: #1a1d00   Dark mode page background
cage-text:    #1c1f00   Light mode body text
```

Button style: `bg-cage-dark text-cage-accent`. Hover darkens slightly. Disabled uses `cage-mid` background.

## Layout

- Centered content column, max-width ~480px (narrow — single-purpose identity app)
- CAGE wordmark top-center on every page (text-based, no logo asset)
- Minimal footer: "CAGE — Confirmed Age, Granted Entry"
- Dark/light mode via `prefers-color-scheme` (Tailwind `dark:` variants)
- Typography: Geist Sans (already loaded). Clean hierarchy, nothing ornate.
- Cards/containers: subtle `border border-cage-mid/20 rounded-lg`. No shadows, no gradients.

## Data Flow

### Proxy

```
next.config.js rewrites:
  /api/:path* → http://localhost:3001/:path*
```

The `cage_session` cookie is httpOnly and flows through the proxy automatically.

### Auth state detection

Protected pages check auth server-side by forwarding the incoming cookie to the Hono server. If invalid → redirect to `/login`. No React context or auth provider — the cookie is the source of truth.

### Page-by-page

| Page               | Data needed                     | How                                                        |
|--------------------|---------------------------------|------------------------------------------------------------|
| `/` and `/login`   | Is user logged in?              | Server component checks session → redirect to `/dashboard` |
| `/check-email`     | None                            | Static. Email from query param for display.                |
| `/dashboard`       | Status, age floor, expiry       | Server component fetches `/verify/status` with cookie      |
| `/verify/callback` | Polling status                  | Client component. `setInterval` 2s → `/api/verify/status`  |
| `/consent`         | Partner name, consent token     | Read from URL query params. Native form POST.              |

### Form submissions

- **Login:** client component, `fetch('/api/auth/magic-link', { method: 'POST' })` → navigate to `/check-email?email=...`
- **Consent:** native `<form action="/api/oauth/consent" method="POST">` — browser follows the 302 redirect to the partner's redirect URI. NOT a fetch() — fetch would swallow the redirect.
- **Account delete:** `fetch('/api/auth/account', { method: 'DELETE' })` → redirect to `/`

## Error Handling

| Scenario                        | Behavior                                                                |
|---------------------------------|-------------------------------------------------------------------------|
| Session expired mid-flow        | Server 401 → redirect to `/login`                                      |
| Magic link expired/invalid      | Server 400 → redirect to `/login?error=invalid_link`, show message     |
| Unknown email                   | Server returns same 200 (no enumeration) → `/check-email`              |
| Veriff declined                 | Polling gets `declined` → `/dashboard` shows "unsuccessful" + retry    |
| Veriff session creation fails   | Server returns 502 → user sees error, can retry                        |
| Consent token expired           | Server returns 400 → user sees "expired" message                       |
| Account deletion                | Confirmation modal with "Type DELETE" pattern                           |
| Network errors (polling)        | Silent retry. After 10 consecutive failures → "Connection lost" + manual retry button |
| Network errors (forms)          | Inline error: "Something went wrong. Please try again."                |

## Server Changes Required

### 1. `oauth.ts` — consent redirect

Replace inline HTML consent page with a redirect to the frontend:

```typescript
// Before:
return c.html(consentPage(partner.name, consentToken));

// After:
const webBase = process.env['WEB_BASE_URL'] ?? 'http://localhost:3000';
const consentUrl = new URL('/consent', webBase);
consentUrl.searchParams.set('consent_token', consentToken);
consentUrl.searchParams.set('partner_name', partner.name);
return c.redirect(consentUrl.toString());
```

Remove `consentPage()` and `escapeHtml()` helper functions.

### 2. `verify.service.ts` — callback URL

Change Veriff session callback from server URL to frontend URL:

```typescript
// Before:
const appBase = process.env['APP_BASE_URL'] ?? 'https://cageid.app';
// callback: `${appBase}/verify/callback`

// After:
const webBase = process.env['WEB_BASE_URL'] ?? 'http://localhost:3000';
// callback: `${webBase}/verify/callback`
```

### 3. New env var: `WEB_BASE_URL`

Add to `.env.example`:
```
WEB_BASE_URL=http://localhost:3000     # Production: https://cageid.app
```

Add to `turbo.json` build env array.

## Dashboard Status Display

| State       | Visual                                             | Action                    |
|-------------|----------------------------------------------------|---------------------------|
| Verified    | Green dot + "Verified · 21+" + expiry date         | None                      |
| Pending     | Amber dot + "Verification in progress"             | Link to check status      |
| Declined    | Red dot + "Verification unsuccessful"              | "Try again" button        |
| Unverified  | Muted dot + "Not yet verified"                     | "Verify your age" button  |
| Expired     | Muted dot + "Verification expired"                 | "Re-verify" button        |
