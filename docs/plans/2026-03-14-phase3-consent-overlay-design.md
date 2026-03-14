# Phase 3: In-Page Consent Overlay Design

## Goal

Replace the redirect-to-CAGE-website consent flow with an in-page overlay injected by the Chrome extension, so first-time partner consent happens inline without leaving the partner's page.

## Flow

1. Extension's `attemptSilentAuth` calls `POST /oauth/extension-authorize`
2. Server returns `403 { error: "consent_required", partner_name: "Demo App" }`
3. Extension injects a content script overlay on the current tab: "Share your age verification with **Demo App**?"
4. **Allow**: Extension re-calls `POST /oauth/extension-authorize` with `{ ..., grant_consent: true }`. Server creates `partner_subs` row + issues auth code. Extension redirects tab to partner callback URL.
5. **Deny**: Overlay is removed. Navigation is cancelled. User stays on the partner page.

## Server Changes

Modify `POST /oauth/extension-authorize`:

- Include `partner_name` in the `consent_required` error response
- When request includes `grant_consent: true` and user has no existing consent, create the `partner_subs` row and issue the auth code (instead of returning 403)

No new endpoints.

## Extension Changes

- **background.ts**: Update `attemptSilentAuth` to handle `consent_required`. Inject content script via `chrome.scripting.executeScript`. Listen for allow/deny message. On allow, re-call endpoint with `grant_consent: true` and redirect tab. On deny, do nothing (user stays on page).
- **consent-overlay.ts** (new): Content script injected on demand. Renders the overlay DOM. Sends `CONSENT_ALLOW` or `CONSENT_DENY` message to background via `chrome.runtime.sendMessage`.
- **manifest.json**: Add `"scripting"` permission for `chrome.scripting.executeScript`.

## Overlay Design

- Dark semi-transparent backdrop covering the full page
- Centered card matching CAGE dark theme (`#1a1a2e` background, `#c9a84c` accent)
- CAGE SVG logo at top
- Text: "Share your age verification with **[Partner Name]**?"
- Subtext: "Only your verification status (18+) is shared. No personal data."
- Two buttons: **Allow** (gold accent) and **Deny** (subtle/gray)

## Not In Scope

- No granular permission controls (just allow/deny)
- No "remember this choice" toggle (consent is permanent once granted)
- No animation or transition effects
