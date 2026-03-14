# Phase 2: Silent OAuth Pass-Through — Design & Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extension silently completes OAuth for already-consented partners — user never sees the CAGE website on repeat visits.

**Architecture:** Background service worker intercepts `/oauth/authorize` navigations, calls `POST /oauth/extension-authorize` with Bearer token, and redirects the tab directly to the partner callback with an auth code. Falls through to normal OAuth flow on any failure.

**Tech Stack:** Chrome Extension Manifest V3, Hono server, Redis auth codes, Drizzle ORM

**Status:** Server endpoint and extension interception already implemented. Remaining work: deploy demo partner, update DB redirect URIs, add tests, verify end-to-end.

---

### Task 1: Deploy Demo Partner to Railway

**Files:**
- Already created: `Dockerfile.demo-partner`
- Already modified: `apps/demo-partner/src/index.ts` (SELF_URL from env)

**Step 1: Commit and push demo partner changes**

```bash
git add Dockerfile.demo-partner apps/demo-partner/src/index.ts apps/demo-partner/.env.example apps/server/scripts/update-partner-redirect.ts
git commit -m "feat: prepare demo partner for Railway deployment"
git push
```

**Step 2: User creates Railway service**

- Railway dashboard → New Service → GitHub repo → set root to `/`
- Set Dockerfile path to `Dockerfile.demo-partner`
- Add env vars: DEMO_CLIENT_ID, DEMO_CLIENT_SECRET, CAGE_SERVER_URL, SELF_URL, PORT

**Step 3: Update partner redirect_uris in DB**

```bash
cd apps/server
npx tsx --env-file=.env scripts/update-partner-redirect.ts https://<demo-partner-url>/callback
```

---

### Task 2: Add Tests for Extension-Authorize Endpoint

**Files:**
- Create: `apps/server/src/routes/__tests__/oauth.extension-authorize.test.ts`

Test cases:
- Success: valid session, verified user, consented partner → returns `{ code, redirect_uri, state }`
- 401: missing Bearer token
- 401: invalid/expired session
- 400: missing required params (client_id, redirect_uri, response_type)
- 400: invalid client_id
- 400: invalid redirect_uri
- 403: user not verified
- 403: age floor not met
- 403: no prior consent (no partner_subs row)

---

### Task 3: End-to-End Verification

1. Visit demo partner production URL
2. Click "Verify with CAGE" — normal flow (consent page, grant, callback)
3. Return to demo partner, click "Verify with CAGE" again
4. Extension intercepts — user goes directly to callback (no CAGE pages shown)
5. Claims page displays with age_verified: true

---

### What's NOT in Phase 2

- No in-extension consent UI (Phase 3)
- No popup badge/notification on interception
- No partner content script injection
