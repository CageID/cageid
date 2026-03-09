# Demo Partner Site Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a minimal Hono web app at `apps/demo-partner` that acts as an OAuth client to CAGE, demonstrating the end-to-end age verification flow.

**Architecture:** Two-route Hono server on port 3003. Homepage has a "Verify with CAGE" button that starts the OAuth flow. Callback route exchanges the auth code for an ID token and displays the decoded JWT claims. No database, no sessions beyond a state cookie for CSRF.

**Tech Stack:** Hono, @hono/node-server, tsx, TypeScript (NodeNext)

---

### Task 1: Scaffold the app

**Files:**
- Create: `apps/demo-partner/package.json`
- Create: `apps/demo-partner/tsconfig.json`
- Create: `apps/demo-partner/eslint.config.js`
- Create: `apps/demo-partner/.env.example`

**Step 1: Create package.json**

```json
{
  "name": "demo-partner",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch --env-file=.env src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint --max-warnings 0",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.8",
    "hono": "^4.7.5"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@types/node": "^22.15.3",
    "eslint": "^9.39.1",
    "tsx": "^4.19.3",
    "typescript": "5.9.2"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "@repo/typescript-config/node.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": false,
    "declarationMap": false
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create eslint.config.js**

```js
import { config } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default config;
```

**Step 4: Create .env.example**

```
DEMO_CLIENT_ID=
DEMO_CLIENT_SECRET=
CAGE_SERVER_URL=http://localhost:3001
PORT=3003
```

**Step 5: Add DEMO_CLIENT_ID, DEMO_CLIENT_SECRET, CAGE_SERVER_URL to turbo.json build env array**

Add `"DEMO_CLIENT_ID"`, `"DEMO_CLIENT_SECRET"`, `"CAGE_SERVER_URL"` to the `env` array in `turbo.json` under `build`.

**Step 6: Run pnpm install from repo root**

Run: `pnpm install`

**Step 7: Commit**

```
git add apps/demo-partner/ turbo.json
git commit -m "feat(demo-partner): scaffold app with package.json, tsconfig, eslint"
```

---

### Task 2: Homepage and server entry point

**Files:**
- Create: `apps/demo-partner/src/index.ts`

**Step 1: Create the Hono app with homepage route**

```typescript
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { randomBytes } from 'crypto';
import { getCookie, setCookie } from 'hono/cookie';

const app = new Hono();

const CLIENT_ID = process.env['DEMO_CLIENT_ID'] ?? '';
const CLIENT_SECRET = process.env['DEMO_CLIENT_SECRET'] ?? '';
const CAGE_SERVER = process.env['CAGE_SERVER_URL'] ?? 'http://localhost:3001';
const PORT = Number(process.env['PORT'] ?? '3003');
const SELF_URL = `http://localhost:${PORT}`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing DEMO_CLIENT_ID or DEMO_CLIENT_SECRET in .env');
  process.exit(1);
}

// ─── Homepage ─────────────────────────────────────────────────────────────────

app.get('/', (c) => {
  // Generate a random state for CSRF protection
  const state = randomBytes(16).toString('hex');
  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    maxAge: 300,
    path: '/',
  });

  const authorizeUrl = new URL('/oauth/authorize', CAGE_SERVER);
  authorizeUrl.searchParams.set('client_id', CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', `${SELF_URL}/callback`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('state', state);

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Demo App — CAGE Partner</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      padding: 48px;
      max-width: 420px;
      text-align: center;
    }
    h1 { font-size: 28px; margin-bottom: 8px; }
    .subtitle { color: #666; margin-bottom: 32px; font-size: 15px; }
    .cage-btn {
      display: inline-block;
      background: #282e00;
      color: #a0ff57;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: opacity 0.15s;
    }
    .cage-btn:hover { opacity: 0.9; }
    .note { margin-top: 24px; font-size: 13px; color: #999; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Demo App</h1>
    <p class="subtitle">This site requires age verification to enter.</p>
    <a href="${authorizeUrl.toString()}" class="cage-btn">Verify with CAGE</a>
    <p class="note">You'll be redirected to CAGE to verify your age.<br>No personal information is shared with this site.</p>
  </div>
</body>
</html>`);
});

// ─── OAuth Callback ───────────────────────────────────────────────────────────

app.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');
  const savedState = getCookie(c, 'oauth_state');

  // Handle error responses from CAGE
  if (error) {
    return c.html(errorPage('Authorization Denied', `CAGE returned an error: ${error}`));
  }

  // Validate state (CSRF protection)
  if (!state || !savedState || state !== savedState) {
    return c.html(errorPage('Invalid State', 'The state parameter did not match. This may be a CSRF attack or your session expired. Please try again.'));
  }

  // Validate code
  if (!code) {
    return c.html(errorPage('Missing Code', 'No authorization code was returned by CAGE.'));
  }

  // Exchange code for ID token
  let tokenData: { id_token?: string; error?: string };
  try {
    const tokenRes = await fetch(`${CAGE_SERVER}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
    tokenData = await tokenRes.json() as { id_token?: string; error?: string };
  } catch (err) {
    return c.html(errorPage('Token Exchange Failed', `Could not reach CAGE server at ${CAGE_SERVER}`));
  }

  if (tokenData.error || !tokenData.id_token) {
    return c.html(errorPage('Token Exchange Failed', `CAGE returned: ${tokenData.error ?? 'no id_token'}`));
  }

  // Decode the JWT payload (no signature verification for demo)
  const parts = tokenData.id_token.split('.');
  if (!parts[1]) {
    return c.html(errorPage('Invalid Token', 'The ID token was malformed.'));
  }

  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as Record<string, unknown>;
  } catch {
    return c.html(errorPage('Invalid Token', 'Could not decode the ID token payload.'));
  }

  // Render the claims page
  return c.html(claimsPage(claims));
});

// ─── HTML Helpers ─────────────────────────────────────────────────────────────

function errorPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Error — Demo App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      padding: 48px;
      max-width: 480px;
      text-align: center;
    }
    h1 { font-size: 24px; color: #c00; margin-bottom: 12px; }
    p { color: #666; line-height: 1.6; margin-bottom: 24px; }
    a { color: #282e00; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/">Try again</a>
  </div>
</body>
</html>`;
}

function claimsPage(claims: Record<string, unknown>): string {
  const ageVerified = claims['age_verified'] === true;
  const ageFloor = claims['age_floor'] as number | undefined;
  const sub = String(claims['sub'] ?? '');
  const iss = String(claims['iss'] ?? '');
  const aud = String(claims['aud'] ?? '');
  const exp = claims['exp'] as number | undefined;
  const iat = claims['iat'] as number | undefined;

  const formatTs = (ts: number | undefined) =>
    ts ? new Date(ts * 1000).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC') : '—';

  const truncate = (s: string, len: number) =>
    s.length > len ? s.slice(0, len) + '...' : s;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Verified — Demo App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      padding: 40px;
      max-width: 520px;
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .header h1 { font-size: 22px; margin-bottom: 8px; }
    .header p { color: #666; font-size: 14px; }
    .claims { display: flex; flex-direction: column; gap: 16px; }
    .claim {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #fafafa;
      border-radius: 8px;
      border: 1px solid #eee;
    }
    .claim.primary {
      background: #f0fde4;
      border-color: #c5e99b;
    }
    .claim-label {
      font-size: 13px;
      color: #666;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .claim-value {
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
    }
    .badge-green { background: #22c55e; color: white; }
    .badge-red { background: #ef4444; color: white; }
    .badge-age {
      font-size: 20px;
      font-weight: 800;
      color: #282e00;
    }
    .secondary .claim-label { font-size: 12px; }
    .secondary .claim-value { font-size: 12px; color: #666; }
    .footer {
      text-align: center;
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
    .footer p { font-size: 13px; color: #999; line-height: 1.5; }
    .footer a { color: #282e00; font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Demo App</h1>
      <p>Here's what CAGE shared with Demo App &mdash; nothing more.</p>
    </div>
    <div class="claims">
      <div class="claim primary">
        <span class="claim-label">Age Verified</span>
        <span class="badge ${ageVerified ? 'badge-green' : 'badge-red'}">${ageVerified ? 'Yes' : 'No'}</span>
      </div>
      <div class="claim primary">
        <span class="claim-label">Age Floor</span>
        <span class="claim-value badge-age">${ageFloor ? ageFloor + '+' : '—'}</span>
      </div>
      <div class="claim">
        <span class="claim-label">Anonymous ID (sub)</span>
        <span class="claim-value">${truncate(sub, 20)}</span>
      </div>
      <div class="claim secondary">
        <span class="claim-label">Issuer</span>
        <span class="claim-value">${iss}</span>
      </div>
      <div class="claim secondary">
        <span class="claim-label">Audience</span>
        <span class="claim-value">${truncate(aud, 20)}</span>
      </div>
      <div class="claim secondary">
        <span class="claim-label">Issued At</span>
        <span class="claim-value">${formatTs(iat)}</span>
      </div>
      <div class="claim secondary">
        <span class="claim-label">Expires</span>
        <span class="claim-value">${formatTs(exp)}</span>
      </div>
    </div>
    <div class="footer">
      <p>No name, birthday, address, or document data was shared.</p>
      <p style="margin-top: 12px;"><a href="/">Start over</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Start server ─────────────────────────────────────────────────────────────

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Demo partner running at http://localhost:${PORT}`);
});
```

**Step 2: Verify it type-checks**

Run: `pnpm --filter=demo-partner check-types`

**Step 3: Verify it lints**

Run: `pnpm --filter=demo-partner lint`

**Step 4: Commit**

```
git add apps/demo-partner/src/
git commit -m "feat(demo-partner): homepage and OAuth callback with claims display"
```

---

### Task 3: Create .env and test end-to-end

**Step 1: Create apps/demo-partner/.env**

Copy `.env.example` and fill in the `DEMO_CLIENT_ID` and `DEMO_CLIENT_SECRET` from the seed script output. These are already saved in the server's `.env`.

**Step 2: Start the demo partner**

Run: `pnpm --filter=demo-partner dev`

Visit `http://localhost:3003` — should see the homepage with the "Verify with CAGE" button.

**Step 3: Test the full flow**

1. Click "Verify with CAGE"
2. CAGE should handle login/verification/consent
3. CAGE redirects back to `http://localhost:3003/callback?code=...&state=...`
4. Demo partner exchanges code, displays decoded claims

**Step 4: Final commit (if any tweaks needed)**

```
git add -A
git commit -m "feat(demo-partner): verified end-to-end OAuth flow"
```
