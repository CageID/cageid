# Web Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a minimal, functional Next.js frontend for CAGE with 6 pages covering the full user journey: login → magic link → Veriff verification → dashboard.

**Architecture:** Next.js App Router with server components for auth-gated pages, client components only for forms and polling. Tailwind CSS with a custom CAGE color palette. API calls proxied through next.config.js rewrites to the Hono server on port 3001.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript, Geist fonts (already loaded)

---

### Task 1: Install Tailwind CSS and Configure CAGE Palette

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/app/cage-theme.css`
- Modify: `apps/web/app/globals.css`

**Step 1: Install Tailwind CSS v4**

Tailwind v4 uses `@tailwindcss/postcss` for Next.js integration.

Run from repo root:
```bash
cd apps/web && pnpm add tailwindcss @tailwindcss/postcss && cd ../..
```

**Step 2: Create PostCSS config**

Create `apps/web/postcss.config.mjs`:
```js
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

**Step 3: Replace globals.css with Tailwind imports and CAGE theme**

Replace `apps/web/app/globals.css` entirely:
```css
@import "tailwindcss";

/* ─── CAGE Color Palette ──────────────────────────────────── */
@theme {
  --color-cage-dark: #282e00;
  --color-cage-mid: #999c7e;
  --color-cage-accent: #a0ff57;
  --color-cage-bg: #fafaf7;
  --color-cage-bg-dark: #1a1d00;
  --color-cage-text: #1c1f00;
  --color-cage-text-dark: #e8e8d8;
  --color-cage-border: rgba(153, 156, 126, 0.2);
  --color-cage-error: #dc2626;
  --color-cage-amber: #d97706;
}

/* ─── Base Styles ──────────────────────────────────────────── */
body {
  font-family: var(--font-geist-sans), system-ui, sans-serif;
  background: var(--color-cage-bg);
  color: var(--color-cage-text);
}

@media (prefers-color-scheme: dark) {
  body {
    background: var(--color-cage-bg-dark);
    color: var(--color-cage-text-dark);
  }
}
```

**Step 4: Delete scaffold files no longer needed**

```bash
rm apps/web/app/page.module.css
rm -rf apps/web/public/file-text.svg apps/web/public/globe.svg apps/web/public/next.svg apps/web/public/turborepo-dark.svg apps/web/public/turborepo-light.svg apps/web/public/vercel.svg apps/web/public/window.svg
```

**Step 5: Verify Tailwind works**

```bash
pnpm dev --filter=web
```

Open http://localhost:3000 — should see unstyled page with CAGE background color. Stop the dev server.

**Step 6: Commit**

```bash
git add apps/web/
git commit -m "feat(web): install Tailwind CSS v4 with CAGE color palette"
```

---

### Task 2: Root Layout with CAGE Branding

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/page.tsx` (temporary placeholder)

**Step 1: Rewrite layout.tsx**

Replace `apps/web/app/layout.tsx` entirely:
```tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "CAGE — Confirmed Age, Granted Entry",
  description: "Verify your age once. Access everywhere.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="py-6 text-center">
            <a href="/" className="text-xl font-semibold tracking-tight text-cage-dark dark:text-cage-text-dark">
              CAGE
            </a>
          </header>

          {/* Main content — narrow centered column */}
          <main className="flex-1 flex items-start justify-center px-4 pb-16">
            <div className="w-full max-w-md">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="py-6 text-center text-sm text-cage-mid">
            CAGE — Confirmed Age, Granted Entry
          </footer>
        </div>
      </body>
    </html>
  );
}
```

**Step 2: Replace page.tsx with a temporary placeholder**

Replace `apps/web/app/page.tsx` entirely:
```tsx
export default function Home() {
  return (
    <div className="text-center py-16">
      <h1 className="text-2xl font-semibold text-cage-dark dark:text-cage-text-dark mb-2">
        CAGE
      </h1>
      <p className="text-cage-mid">
        Check Age, Go Everywhere
      </p>
    </div>
  );
}
```

**Step 3: Verify layout renders correctly**

```bash
pnpm dev --filter=web
```

Check http://localhost:3000 — should see CAGE header, centered content, footer. Stop the dev server.

**Step 4: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/app/page.tsx
git commit -m "feat(web): CAGE-branded root layout with centered content column"
```

---

### Task 3: Proxy Rewrites in next.config.js

**Files:**
- Modify: `apps/web/next.config.js`

**Step 1: Add API proxy rewrites**

Replace `apps/web/next.config.js` entirely:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/:path*",
      },
    ];
  },
};

export default nextConfig;
```

**Step 2: Verify the proxy works**

Start both servers:
```bash
pnpm dev --filter=server &
pnpm dev --filter=web
```

Open http://localhost:3000/api/health — should return `{"status":"ok"}` from the Hono server. Stop both dev servers.

**Step 3: Commit**

```bash
git add apps/web/next.config.js
git commit -m "feat(web): proxy /api/* requests to Hono server via rewrites"
```

---

### Task 4: Server-Side Auth Helper

**Files:**
- Create: `apps/web/app/lib/auth.ts`

**Step 1: Create auth checking utility**

This helper is used by server components to check if the user has a valid session. It calls the Hono server directly (not through the proxy — server components run on the same machine) with the forwarded cookie.

Create `apps/web/app/lib/auth.ts`:
```ts
import { cookies } from "next/headers";

const API_BASE = process.env["API_BASE_URL"] ?? "http://localhost:3001";

interface VerifyStatusResponse {
  status: "pending" | "approved" | "declined" | "none";
}

interface AuthCheckResult {
  authenticated: false;
}

interface AuthCheckSuccess {
  authenticated: true;
  verification: VerifyStatusResponse;
}

export type AuthResult = AuthCheckResult | AuthCheckSuccess;

/**
 * Checks if the current request has a valid session by forwarding
 * the cage_session cookie to the Hono server.
 *
 * Returns authentication status and verification info if authenticated.
 */
export async function checkAuth(): Promise<AuthResult> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("cage_session");

  if (!sessionCookie) {
    return { authenticated: false };
  }

  try {
    const res = await fetch(`${API_BASE}/verify/status`, {
      headers: {
        cookie: `cage_session=${sessionCookie.value}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { authenticated: false };
    }

    const data = (await res.json()) as VerifyStatusResponse;
    return { authenticated: true, verification: data };
  } catch {
    return { authenticated: false };
  }
}
```

**Step 2: Commit**

```bash
git add apps/web/app/lib/auth.ts
git commit -m "feat(web): server-side auth check helper using cookie forwarding"
```

---

### Task 5: Server Changes — WEB_BASE_URL Env Var

**Files:**
- Modify: `apps/server/.env.example`
- Modify: `turbo.json`

**Step 1: Add WEB_BASE_URL to .env.example**

Add the following line after the `APP_BASE_URL` line in `apps/server/.env.example`:
```
WEB_BASE_URL=http://localhost:3000   # Production: https://cageid.app
```

**Step 2: Add WEB_BASE_URL to turbo.json**

Add `"WEB_BASE_URL"` to the `env` array in the `build` task in `turbo.json`, after `"APP_BASE_URL"`.

**Step 3: Commit**

```bash
git add apps/server/.env.example turbo.json
git commit -m "feat(server): add WEB_BASE_URL env var for frontend URL"
```

---

### Task 6: Server Changes — Consent Redirect to Frontend

**Files:**
- Modify: `apps/server/src/routes/oauth.ts`
- Modify: `apps/server/src/routes/__tests__/oauth.authorize.test.ts`

**Step 1: Write/update the test for consent redirect**

In the authorize test file, find the test that checks the consent page for first-visit users. Update it to assert a redirect to the frontend consent URL instead of HTML content.

Add a test like:
```ts
it("redirects to frontend consent page for first-visit user", async () => {
  // ... existing setup for first-visit user with valid session, valid verification, no partnerSub
  // Assert: response is a 302 redirect
  // Assert: Location header starts with "http://localhost:3000/consent?"
  // Assert: URL contains consent_token param
  // Assert: URL contains partner_name param
});
```

**Step 2: Run the test to verify it fails**

```bash
cd apps/server && pnpm vitest run src/routes/__tests__/oauth.authorize.test.ts -v
```

Expected: FAIL — the handler still returns HTML.

**Step 3: Update oauth.ts**

In `apps/server/src/routes/oauth.ts`:

1. Near the top, add:
```ts
const WEB_BASE = process.env['WEB_BASE_URL'] ?? 'http://localhost:3000';
```

2. In the authorize handler, replace the `consentPage` call (around line 145):
```ts
// Before:
return c.html(consentPage(partner.name, consentToken));

// After:
const consentUrl = new URL('/consent', WEB_BASE);
consentUrl.searchParams.set('consent_token', consentToken);
consentUrl.searchParams.set('partner_name', partner.name);
return c.redirect(consentUrl.toString());
```

3. Delete the `consentPage()` function (lines 301–316) and the `escapeHtml()` function (lines 279–286).

**Step 4: Run the test to verify it passes**

```bash
cd apps/server && pnpm vitest run src/routes/__tests__/oauth.authorize.test.ts -v
```

Expected: PASS

**Step 5: Run the full test suite**

```bash
cd apps/server && pnpm vitest run
```

Expected: All tests pass. Some existing tests may need updating if they asserted on the HTML consent page content.

**Step 6: Commit**

```bash
git add apps/server/src/routes/oauth.ts apps/server/src/routes/__tests__/oauth.authorize.test.ts
git commit -m "feat(server): redirect to frontend consent page instead of inline HTML"
```

---

### Task 7: Server Changes — Veriff Callback URL

**Files:**
- Modify: `apps/server/src/services/verify.service.ts`
- Modify: `apps/server/src/services/__tests__/verify.service.test.ts`

**Step 1: Update the createVeriffSession test**

In the test file, find the `createVeriffSession` test group. Update the test that verifies the Veriff API call to assert the callback URL uses `WEB_BASE_URL` (or defaults to `http://localhost:3000`):

```ts
it("sends callback URL pointing to frontend", async () => {
  // ... setup
  // Assert: fetch was called with body containing callback: "http://localhost:3000/verify/callback"
});
```

**Step 2: Run the test to verify it fails**

```bash
cd apps/server && pnpm vitest run src/services/__tests__/verify.service.test.ts -t "createVeriffSession" -v
```

Expected: FAIL — callback still uses APP_BASE_URL.

**Step 3: Update verify.service.ts**

In `apps/server/src/services/verify.service.ts`, in the `createVeriffSession` function (around line 51-53):

```ts
// Before:
const appBase = process.env['APP_BASE_URL'] ?? 'https://cageid.app';

// After:
const webBase = process.env['WEB_BASE_URL'] ?? 'http://localhost:3000';
```

And update the callback line:
```ts
// Before:
callback: `${appBase}/verify/callback`,

// After:
callback: `${webBase}/verify/callback`,
```

Remove the now-unused `appBase` line if `APP_BASE_URL` is no longer referenced in this function.

**Step 4: Run the test to verify it passes**

```bash
cd apps/server && pnpm vitest run src/services/__tests__/verify.service.test.ts -t "createVeriffSession" -v
```

Expected: PASS

**Step 5: Run the full test suite**

```bash
cd apps/server && pnpm vitest run
```

Expected: All pass.

**Step 6: Commit**

```bash
git add apps/server/src/services/verify.service.ts apps/server/src/services/__tests__/verify.service.test.ts
git commit -m "fix(server): point Veriff callback URL to frontend via WEB_BASE_URL"
```

---

### Task 8: Login Page

**Files:**
- Create: `apps/web/app/login/page.tsx`
- Create: `apps/web/app/login/login-form.tsx`
- Modify: `apps/web/app/page.tsx`

The `/` route and `/login` route both show the same email form. The difference is `/login` may have a `next` query param (from OAuth redirects). The `/` route redirects to `/dashboard` if already authenticated.

**Step 1: Create the shared LoginForm client component**

Create `apps/web/app/login/login-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setError("Too many requests. Please try again later.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-cage-dark dark:text-cage-text-dark mb-1">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-cage-border bg-white px-3 py-2 text-cage-text placeholder:text-cage-mid focus:outline-none focus:ring-2 focus:ring-cage-dark dark:bg-cage-bg-dark dark:text-cage-text-dark dark:border-cage-mid/30"
        />
      </div>

      {error && (
        <p className="text-sm text-cage-error">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-cage-dark py-2.5 text-sm font-medium text-cage-accent transition-colors hover:bg-cage-dark/90 disabled:bg-cage-mid disabled:text-cage-bg disabled:cursor-not-allowed"
      >
        {loading ? "Sending…" : "Send sign-in link"}
      </button>
    </form>
  );
}
```

**Step 2: Create the /login page**

Create `apps/web/app/login/page.tsx`:
```tsx
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-cage-dark dark:text-cage-text-dark mb-2">
          Sign in to CAGE
        </h1>
        <p className="text-sm text-cage-mid">
          Enter your email and we'll send you a sign-in link.
        </p>
      </div>

      <div className="rounded-xl border border-cage-border bg-white p-6 dark:bg-cage-dark/30 dark:border-cage-mid/20">
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-cage-mid">
        No password needed — we'll email you a secure link.
      </p>
    </div>
  );
}
```

**Step 3: Update the / page to redirect if authenticated**

Replace `apps/web/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { checkAuth } from "./lib/auth";
import { LoginForm } from "./login/login-form";

export default async function Home() {
  const auth = await checkAuth();
  if (auth.authenticated) {
    redirect("/dashboard");
  }

  return (
    <div className="py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-cage-dark dark:text-cage-text-dark mb-2">
          Check Age, Go Everywhere
        </h1>
        <p className="text-sm text-cage-mid">
          Verify your age once. Access age-restricted sites without re-verifying.
        </p>
      </div>

      <div className="rounded-xl border border-cage-border bg-white p-6 dark:bg-cage-dark/30 dark:border-cage-mid/20">
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-cage-mid">
        No password needed — we'll email you a secure link.
      </p>
    </div>
  );
}
```

**Step 4: Verify pages render**

```bash
pnpm dev --filter=web
```

Check http://localhost:3000 and http://localhost:3000/login — both should show the email form with CAGE styling.

**Step 5: Commit**

```bash
git add apps/web/app/login/ apps/web/app/page.tsx
git commit -m "feat(web): login page with magic link email form"
```

---

### Task 9: Check-Email Page

**Files:**
- Create: `apps/web/app/check-email/page.tsx`

**Step 1: Create the check-email page**

Create `apps/web/app/check-email/page.tsx`:
```tsx
import Link from "next/link";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const email = typeof params["email"] === "string" ? params["email"] : "your email";

  return (
    <div className="py-16 text-center">
      <div className="mb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cage-dark/10 dark:bg-cage-accent/10">
          <svg className="h-6 w-6 text-cage-dark dark:text-cage-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-cage-dark dark:text-cage-text-dark mb-2">
          Check your inbox
        </h1>
        <p className="text-sm text-cage-mid">
          We sent a sign-in link to <span className="font-medium text-cage-dark dark:text-cage-text-dark">{email}</span>.
        </p>
      </div>

      <div className="rounded-xl border border-cage-border bg-white p-6 dark:bg-cage-dark/30 dark:border-cage-mid/20">
        <p className="text-sm text-cage-mid mb-4">
          Click the link in the email to sign in. The link expires in 15 minutes.
        </p>
        <p className="text-sm text-cage-mid">
          Didn't get it?{" "}
          <Link href="/login" className="font-medium text-cage-dark underline underline-offset-2 hover:text-cage-accent dark:text-cage-text-dark">
            Try again
          </Link>
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Verify the page**

```bash
pnpm dev --filter=web
```

Open http://localhost:3000/check-email?email=test@example.com — should show the "check your inbox" page.

**Step 3: Commit**

```bash
git add apps/web/app/check-email/
git commit -m "feat(web): check-email page with inbox prompt"
```

---

### Task 10: Dashboard Page

**Files:**
- Create: `apps/web/app/dashboard/page.tsx`
- Create: `apps/web/app/dashboard/delete-account-button.tsx`

**Step 1: Create the delete account client component**

Create `apps/web/app/dashboard/delete-account-button.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteAccountButton() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/account", { method: "DELETE" });
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (!showModal) {
    return (
      <button
        onClick={() => setShowModal(true)}
        className="text-sm text-cage-mid underline underline-offset-2 hover:text-cage-error transition-colors"
      >
        Delete account
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-cage-error/30 bg-cage-error/5 p-4 dark:bg-cage-error/10">
      <p className="text-sm text-cage-dark dark:text-cage-text-dark mb-3">
        This will permanently delete your account and all verification data. Type <span className="font-mono font-semibold">DELETE</span> to confirm.
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="Type DELETE"
        className="w-full rounded-lg border border-cage-error/30 bg-white px-3 py-2 text-sm text-cage-text placeholder:text-cage-mid focus:outline-none focus:ring-2 focus:ring-cage-error dark:bg-cage-bg-dark dark:text-cage-text-dark mb-3"
      />
      {error && <p className="text-sm text-cage-error mb-3">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={confirmText !== "DELETE" || loading}
          className="rounded-lg bg-cage-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cage-error/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Deleting…" : "Delete my account"}
        </button>
        <button
          onClick={() => { setShowModal(false); setConfirmText(""); setError(""); }}
          className="rounded-lg border border-cage-border px-4 py-2 text-sm text-cage-mid transition-colors hover:bg-cage-mid/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Create the dashboard page**

Create `apps/web/app/dashboard/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { checkAuth } from "../lib/auth";
import { DeleteAccountButton } from "./delete-account-button";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cage-accent/15 px-2.5 py-0.5 text-xs font-medium text-cage-dark dark:text-cage-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-cage-accent" />
          Verified
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cage-amber/15 px-2.5 py-0.5 text-xs font-medium text-cage-amber">
          <span className="h-1.5 w-1.5 rounded-full bg-cage-amber" />
          Verification in progress
        </span>
      );
    case "declined":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cage-error/15 px-2.5 py-0.5 text-xs font-medium text-cage-error">
          <span className="h-1.5 w-1.5 rounded-full bg-cage-error" />
          Verification unsuccessful
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cage-mid/15 px-2.5 py-0.5 text-xs font-medium text-cage-mid">
          <span className="h-1.5 w-1.5 rounded-full bg-cage-mid" />
          Not yet verified
        </span>
      );
  }
}

export default async function DashboardPage() {
  const auth = await checkAuth();
  if (!auth.authenticated) {
    redirect("/login");
  }

  const { status } = auth.verification;
  const needsVerification = status === "none" || status === "declined";

  return (
    <div className="py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-cage-dark dark:text-cage-text-dark mb-1">
          Dashboard
        </h1>
        <p className="text-sm text-cage-mid">Your CAGE verification status</p>
      </div>

      {/* Status card */}
      <div className="rounded-xl border border-cage-border bg-white p-6 dark:bg-cage-dark/30 dark:border-cage-mid/20 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-cage-dark dark:text-cage-text-dark">
            Age Verification
          </span>
          <StatusBadge status={status} />
        </div>

        {status === "approved" && (
          <div className="space-y-2 text-sm text-cage-mid">
            <p>Your age has been verified. Partner sites can confirm you meet their age requirements.</p>
          </div>
        )}

        {status === "pending" && (
          <p className="text-sm text-cage-mid">
            Your verification is being processed. This usually takes just a moment.
          </p>
        )}

        {needsVerification && (
          <div>
            <p className="text-sm text-cage-mid mb-4">
              {status === "declined"
                ? "Your previous verification was unsuccessful. You can try again."
                : "Verify your age to start using CAGE with partner sites."}
            </p>
            <Link
              href="/api/verify/start"
              className="inline-block rounded-lg bg-cage-dark px-4 py-2.5 text-sm font-medium text-cage-accent transition-colors hover:bg-cage-dark/90"
            >
              {status === "declined" ? "Try again" : "Verify your age"}
            </Link>
          </div>
        )}
      </div>

      {/* Sign out */}
      <div className="flex items-center justify-between pt-4">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-cage-mid underline underline-offset-2 hover:text-cage-dark dark:hover:text-cage-text-dark transition-colors"
          >
            Sign out
          </button>
        </form>

        <DeleteAccountButton />
      </div>
    </div>
  );
}
```

**Step 3: Verify the page**

```bash
pnpm dev --filter=web
```

Open http://localhost:3000/dashboard — without a session, should redirect to /login. (Full integration test requires the server running and a valid session.)

**Step 4: Commit**

```bash
git add apps/web/app/dashboard/
git commit -m "feat(web): dashboard page with verification status and account deletion"
```

---

### Task 11: Verify Callback Page (Polling)

**Files:**
- Create: `apps/web/app/verify/callback/page.tsx`
- Create: `apps/web/app/verify/callback/polling-status.tsx`

**Step 1: Create the polling client component**

Create `apps/web/app/verify/callback/polling-status.tsx`:
```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL = 2000;
const MAX_FAILURES = 10;

export function PollingStatus() {
  const router = useRouter();
  const [message, setMessage] = useState("Verifying your identity… This usually takes just a moment.");
  const [showSpinner, setShowSpinner] = useState(true);
  const [showRetry, setShowRetry] = useState(false);
  const failureCount = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startPolling() {
    setShowRetry(false);
    setShowSpinner(true);
    setMessage("Verifying your identity… This usually takes just a moment.");
    failureCount.current = 0;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/verify/status");

        if (!res.ok) {
          // Session might be expired — redirect to login
          if (res.status === 401) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            router.push("/login");
            return;
          }
          throw new Error("Non-OK response");
        }

        failureCount.current = 0;
        const data = (await res.json()) as { status: string };

        if (data.status === "approved") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setMessage("Verification successful! Redirecting…");
          router.push("/dashboard");
          return;
        }

        if (data.status === "declined") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setShowSpinner(false);
          setMessage("Verification was not successful.");
          return;
        }
      } catch {
        failureCount.current++;
        if (failureCount.current >= MAX_FAILURES) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setShowSpinner(false);
          setShowRetry(true);
          setMessage("Connection lost. Please check your internet connection.");
        }
      }
    }, POLL_INTERVAL);
  }

  useEffect(() => {
    startPolling();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="py-16 text-center">
      {showSpinner && (
        <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-[3px] border-cage-border border-t-cage-dark dark:border-cage-mid/30 dark:border-t-cage-accent" />
      )}

      <p className="text-sm text-cage-mid mb-4">{message}</p>

      {showRetry && (
        <button
          onClick={startPolling}
          className="rounded-lg bg-cage-dark px-4 py-2.5 text-sm font-medium text-cage-accent transition-colors hover:bg-cage-dark/90"
        >
          Retry
        </button>
      )}

      {!showSpinner && !showRetry && (
        <a
          href="/dashboard"
          className="inline-block rounded-lg bg-cage-dark px-4 py-2.5 text-sm font-medium text-cage-accent transition-colors hover:bg-cage-dark/90"
        >
          Go to dashboard
        </a>
      )}
    </div>
  );
}
```

**Step 2: Create the callback page**

Create `apps/web/app/verify/callback/page.tsx`:
```tsx
import { PollingStatus } from "./polling-status";

export default function VerifyCallbackPage() {
  return <PollingStatus />;
}
```

**Step 3: Verify the page**

```bash
pnpm dev --filter=web
```

Open http://localhost:3000/verify/callback — should show spinner and polling message (will get 401s without a session, which is expected).

**Step 4: Commit**

```bash
git add apps/web/app/verify/
git commit -m "feat(web): verify callback page with polling and failure threshold"
```

---

### Task 12: Consent Page

**Files:**
- Create: `apps/web/app/consent/page.tsx`

**Step 1: Create the consent page**

Create `apps/web/app/consent/page.tsx`:
```tsx
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const consentToken = typeof params["consent_token"] === "string" ? params["consent_token"] : "";
  const partnerName = typeof params["partner_name"] === "string" ? params["partner_name"] : "Unknown";

  if (!consentToken) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold text-cage-dark dark:text-cage-text-dark mb-2">
          Invalid request
        </h1>
        <p className="text-sm text-cage-mid">
          This consent link is missing required parameters. Please return to the partner site and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cage-dark/10 dark:bg-cage-accent/10">
          <svg className="h-6 w-6 text-cage-dark dark:text-cage-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-cage-dark dark:text-cage-text-dark mb-2">
          Share your age verification
        </h1>
      </div>

      <div className="rounded-xl border border-cage-border bg-white p-6 dark:bg-cage-dark/30 dark:border-cage-mid/20">
        <p className="text-sm text-cage-mid mb-2">
          <span className="font-medium text-cage-dark dark:text-cage-text-dark">{partnerName}</span> is requesting confirmation of your age verification.
        </p>
        <p className="text-sm text-cage-mid mb-6">
          CAGE will share only that you are age-verified and your age bracket. No other personal information is shared.
        </p>

        <form action="/api/oauth/consent" method="POST">
          <input type="hidden" name="consent_token" value={consentToken} />
          <button
            type="submit"
            className="w-full rounded-lg bg-cage-dark py-2.5 text-sm font-medium text-cage-accent transition-colors hover:bg-cage-dark/90"
          >
            Confirm — share age verification
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-cage-mid">
          <a href="javascript:history.back()" className="underline underline-offset-2 hover:text-cage-dark dark:hover:text-cage-text-dark transition-colors">
            Cancel
          </a>
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Verify the page**

```bash
pnpm dev --filter=web
```

Open http://localhost:3000/consent?consent_token=test123&partner_name=Acme+Corp — should show the consent page with partner name and confirm button.

**Step 3: Commit**

```bash
git add apps/web/app/consent/
git commit -m "feat(web): consent page for OAuth partner age-verification sharing"
```

---

### Task 13: Sign Out Handler Fix

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`

The sign out form uses `action="/api/auth/logout"` with `method="POST"`, but native form POST to the Hono API returns JSON, not a redirect. We need a client component for sign out.

**Step 1: Create a SignOutButton client component**

Create `apps/web/app/dashboard/sign-out-button.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the request fails, clear client state
    }
    router.push("/");
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="text-sm text-cage-mid underline underline-offset-2 hover:text-cage-dark dark:hover:text-cage-text-dark transition-colors disabled:opacity-50"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
```

**Step 2: Update dashboard to use SignOutButton**

In `apps/web/app/dashboard/page.tsx`, replace the `<form action="/api/auth/logout">` block with the `<SignOutButton />` component. Import it at the top.

**Step 3: Commit**

```bash
git add apps/web/app/dashboard/
git commit -m "feat(web): client-side sign out button on dashboard"
```

---

### Task 14: Final Verification

**Step 1: Run lint across the monorepo**

```bash
pnpm lint
```

Expected: Zero warnings, zero errors.

**Step 2: Run type check**

```bash
pnpm check-types
```

Expected: Clean.

**Step 3: Run server tests**

```bash
cd apps/server && pnpm vitest run
```

Expected: All tests pass (including updated consent and callback URL tests).

**Step 4: Build the entire monorepo**

```bash
pnpm build
```

Expected: All packages and apps build successfully.

**Step 5: Fix any issues found in steps 1-4**

If lint, types, tests, or build fail, fix the issues and commit.

**Step 6: Final commit (if any fixes)**

```bash
git add -A
git commit -m "fix(web): resolve lint/type/build issues"
```
