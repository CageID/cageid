# Extension Phase 2: Silent OAuth Pass-Through — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When the extension detects a navigation to `/oauth/authorize` and the user is already verified + consented for that partner, silently issue an auth code and redirect back — no CAGE UI shown.

**Architecture:** New `POST /oauth/extension-authorize` endpoint on the server validates the extension's Bearer session, checks verification + prior consent, and returns `{ code, redirect_uri, state }`. The extension's background service worker intercepts the navigation, calls this endpoint, and redirects the tab on success. On any failure, the normal browser OAuth flow proceeds.

**Tech Stack:** Hono (server), Chrome Extensions Manifest V3 (webNavigation API), TypeScript

---

### Task 1: Server — `POST /oauth/extension-authorize` endpoint

**Files:**
- Modify: `apps/server/src/routes/oauth.ts` (add new route after the `/authorize` GET handler, ~line 154)

**Step 1: Add the extension-authorize route**

Add this route to `oauth.ts`, after the existing `GET /authorize` handler and before the consent POST handler. It reuses `requireAuth` middleware and the existing `issueAuthCode`-style logic but returns JSON instead of redirecting.

```typescript
import { requireAuth } from "../middleware/requireAuth.js";

// ─── Extension Silent Authorize ─────────────────────────────────────────────

oauthRoutes.post("/extension-authorize", requireAuth, async (c) => {
  const userId = c.get("userId");
  const { client_id, redirect_uri, response_type, state } = await c.req.json<{
    client_id: string;
    redirect_uri: string;
    response_type: string;
    state?: string;
  }>();

  // 1. Basic param validation
  if (!client_id || !redirect_uri || !response_type) {
    return c.json({ error: "invalid_request", error_description: "Missing required parameters" }, 400);
  }
  if (response_type !== "code") {
    return c.json({ error: "invalid_request", error_description: "Unsupported response_type" }, 400);
  }

  // 2. Validate partner
  const partner = await findActivePartner(client_id);
  if (!partner) {
    return c.json({ error: "invalid_client", error_description: "Unknown or inactive client" }, 400);
  }
  if (!validateRedirectUri(partner, redirect_uri)) {
    return c.json({ error: "invalid_request", error_description: "Invalid redirect_uri" }, 400);
  }

  // 3. Check verification status
  const verification = await db.query.verifications.findFirst({
    where: (v, { eq, and, gt }) =>
      and(
        eq(v.userId, userId),
        eq(v.status, "approved"),
        gt(v.expiresAt!, new Date())
      ),
    orderBy: (v, { desc }) => [desc(v.createdAt)],
  });

  if (!verification) {
    return c.json({ error: "verification_required", error_description: "User not verified" }, 403);
  }

  // 4. Age floor check
  if ((verification.ageFloor ?? 0) < partner.ageFloorRequired) {
    return c.json({ error: "access_denied", error_description: "Age requirement not met" }, 403);
  }

  // 5. Check prior consent (partner_subs row must exist)
  const existingSub = await db.query.partnerSubs.findFirst({
    where: (ps, { eq, and }) =>
      and(eq(ps.userId, userId), eq(ps.partnerId, partner.id)),
  });

  if (!existingSub) {
    return c.json({ error: "consent_required", error_description: "User has not consented to this partner" }, 403);
  }

  // 6. Issue auth code
  const code = generateAuthCode();
  await redis.set(
    `oauth_code:${code}`,
    { userId, partnerId: partner.id, redirectUri: redirect_uri },
    { ex: 60 }
  );

  return c.json({ code, redirect_uri, state: state ?? null });
});
```

**Step 2: Verify the server builds**

Run: `pnpm build --filter=server`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add apps/server/src/routes/oauth.ts
git commit -m "feat: add POST /oauth/extension-authorize endpoint for silent OAuth"
```

---

### Task 2: Extension — Background worker interception logic

**Files:**
- Modify: `apps/extension/src/background.ts` (replace the Phase 2 placeholder, lines 43-62)

**Step 1: Replace the OAuth detection placeholder with interception logic**

Replace the entire `// ─── OAuth Detection` section with:

```typescript
// ─── OAuth Silent Pass-Through (Phase 2) ────────────────────────────────────

// TODO: Update to cageid.app / api.cageid.app when custom domains are configured.
const SERVER_URL = 'https://server-production-0ea14.up.railway.app';

chrome.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    // Only intercept top-level navigations (not iframes)
    if (details.frameId !== 0) return;

    const url = new URL(details.url);

    // Must be an /oauth/authorize request
    if (!url.pathname.endsWith('/oauth/authorize')) return;

    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri');
    const responseType = url.searchParams.get('response_type');
    const state = url.searchParams.get('state');

    if (!clientId || !redirectUri || responseType !== 'code') return;

    console.log('[CAGE] OAuth authorize detected, attempting silent pass-through...');

    // Attempt silent authorization
    attemptSilentAuth(details.tabId, { clientId, redirectUri, responseType, state });
  },
  {
    url: [
      { urlContains: 'cageid' },
      { urlContains: 'localhost:3000/api/oauth' },
      { urlContains: 'localhost:3001/oauth' },
    ],
  }
);

async function attemptSilentAuth(
  tabId: number,
  params: { clientId: string; redirectUri: string; responseType: string; state: string | null }
) {
  try {
    // 1. Get session from storage
    const stored = await chrome.storage.local.get([STORAGE_KEYS.SESSION_ID]);
    const sessionId = stored[STORAGE_KEYS.SESSION_ID];

    if (!sessionId) {
      console.log('[CAGE] No session — falling through to normal OAuth flow');
      return; // Let normal flow proceed
    }

    // 2. Call extension-authorize endpoint
    const response = await fetch(`${SERVER_URL}/oauth/extension-authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionId}`,
      },
      body: JSON.stringify({
        client_id: params.clientId,
        redirect_uri: params.redirectUri,
        response_type: params.responseType,
        state: params.state ?? undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.log('[CAGE] Silent auth declined:', err.error ?? response.status, '— falling through');
      return; // Let normal flow proceed
    }

    const { code, redirect_uri, state } = await response.json();

    // 3. Build the callback URL and redirect the tab
    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set('code', code);
    if (state) callbackUrl.searchParams.set('state', state);

    console.log('[CAGE] Silent auth success — redirecting to partner callback');
    chrome.tabs.update(tabId, { url: callbackUrl.toString() });
  } catch (err) {
    console.error('[CAGE] Silent auth error:', err);
    // Let normal flow proceed on any error
  }
}
```

**Step 2: Build the extension**

Run: `cd apps/extension && pnpm build`
Expected: TypeScript compiles, dist/ contains updated background.js

**Step 3: Commit**

```bash
git add apps/extension/src/background.ts
git commit -m "feat: extension Phase 2 — silent OAuth pass-through in background worker"
```

---

### Task 3: Manual integration test

**Step 1: Deploy server changes**

Push to main so Railway auto-deploys:
```bash
git push
```

**Step 2: Reload extension in Chrome**

1. Go to `chrome://extensions`
2. Click the refresh icon on the CAGE extension
3. Open the extension's service worker console (click "service worker" link)

**Step 3: Test with the demo partner**

If a demo partner is configured, navigate to its login page which triggers the OAuth flow. The extension console should show one of:
- `[CAGE] Silent auth success — redirecting to partner callback` (if consented before)
- `[CAGE] Silent auth declined: consent_required` (if first time — normal flow proceeds)
- `[CAGE] No session` (if not logged into extension)

If no demo partner is set up yet, verify the endpoint works via curl:
```bash
curl -X POST https://server-production-0ea14.up.railway.app/oauth/extension-authorize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_ID" \
  -d '{"client_id":"PARTNER_ID","redirect_uri":"https://example.com/callback","response_type":"code"}'
```

**Step 4: Commit & push final**

```bash
git push
```
