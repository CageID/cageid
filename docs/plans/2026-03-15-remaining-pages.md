# Remaining Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build four new pages (/about, /privacy, /terms, /docs) and wire up all footer links and partner section buttons across the site.

**Architecture:** All pages are Next.js 14 App Router server components. They share the same Premium Dark design system as the landing and pricing pages — glassmorphism nav, dot-grid hero, Syne font nav labels, Geist Sans body. The /docs page adds a sticky left sidebar for desktop navigation (pure CSS, no JS). No API calls, no auth checks, fully static.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v4 with CAGE tokens, Geist Sans, Syne, TypeScript with moduleResolution: NodeNext.

---

### Shared patterns (reference for all tasks)

**Nav** — copy from pricing page exactly. Same glassmorphism border trick, same link order (HOW IT WORKS → PARTNERS → TRUST → PRICING → SIGN IN).

**Footer** — UPDATED footer for all new pages (and backfilled to landing + pricing in Task 5):
```tsx
<footer className="py-8 px-6 border-t border-cage-accent/5">
  <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
    <div className="flex items-center gap-2">
      <CageLogo className="h-5 w-auto" />
      <span className="text-xs text-cage-mid/50">Confirmed Age, Granted Entry</span>
    </div>
    <div className="flex items-center gap-6 text-xs text-cage-mid/50">
      <Link href="/about" className="hover:text-cage-text-dark transition-colors">About</Link>
      <Link href="/privacy" className="hover:text-cage-text-dark transition-colors">Privacy</Link>
      <Link href="/terms" className="hover:text-cage-text-dark transition-colors">Terms</Link>
      <Link href="/docs" className="hover:text-cage-text-dark transition-colors">Docs</Link>
      <a href="https://github.com/CageID/cageid" className="hover:text-cage-text-dark transition-colors">GitHub</a>
    </div>
  </div>
</footer>
```

**Glass card constant:**
```tsx
const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.07)",
} as const;
```

**NAV_LINK constant:**
```tsx
const NAV_LINK = {
  fontFamily: "var(--font-syne)",
  fontWeight: 650,
  letterSpacing: "1px",
  fontSize: "0.8em",
} as const;
```

**Hero band pattern (compact, ~30-40vh):**
```tsx
<section className="relative flex items-center justify-center overflow-hidden pt-28 pb-20 min-h-[35vh]">
  {/* Dot grid */}
  <div aria-hidden="true" className="absolute inset-0 pointer-events-none select-none"
    style={{
      backgroundImage: "radial-gradient(circle, rgba(160,255,87,0.12) 1px, transparent 1px)",
      backgroundSize: "32px 32px",
      maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
      WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
    }} />
  {/* Radial glow */}
  <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
    style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(160,255,87,0.07) 0%, transparent 70%)" }} />
  <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
    <h1 className="leading-[1.05] mb-6"
      style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.04em", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, textWrap: "balance" }}>
      {/* headline */}
    </h1>
    {/* subtext */}
  </div>
</section>
```

---

### Task 1: Create `/about` page

**Files:**
- Create: `apps/web/app/about/page.tsx`

**Step 1: Create the file**

```tsx
import Link from "next/link";
import { CageLogo } from "../components/cage-logo";

const NAV_LINK = {
  fontFamily: "var(--font-syne)",
  fontWeight: 650,
  letterSpacing: "1px",
  fontSize: "0.8em",
} as const;

export default function AboutPage() {
  return (
    <div className="bg-cage-bg-dark text-cage-text-dark min-h-screen" style={{ letterSpacing: "-0.5px" }}>

      {/* ─── Nav ──────────────────────────────────────────────────── */}
      {/* Same nav as landing/pricing — glassmorphism, gradient border bottom */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cage-bg-dark/80"
        style={{
          borderBottom: "1px solid transparent",
          backgroundImage: "linear-gradient(var(--color-cage-bg-dark), var(--color-cage-bg-dark)), linear-gradient(to right, transparent, rgba(160,255,87,0.3), transparent)",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
        }}>
        <div className="max-w-6xl mx-auto px-6 h-28 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <CageLogo className="h-24 w-auto transition-all group-hover:[filter:drop-shadow(0_0_8px_rgba(160,255,87,0.5))]" />
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/#how-it-works" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>HOW IT WORKS</Link>
            <Link href="/#for-partners" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>PARTNERS</Link>
            <Link href="/#trust" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>TRUST</Link>
            <Link href="/pricing" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>PRICING</Link>
            <Link href="/login" className="text-sm text-cage-dark bg-cage-accent px-4 py-2 rounded-lg hover:brightness-110 transition" style={NAV_LINK}>SIGN IN</Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center overflow-hidden pt-28 pb-20 min-h-[35vh]">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none select-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(160,255,87,0.12) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
          }} />
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(160,255,87,0.07) 0%, transparent 70%)" }} />
        <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
          <h1 className="leading-[1.05] mb-4"
            style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.04em", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800 }}>
            Why CAGE exists.
          </h1>
        </div>
      </section>

      {/* ─── Content ──────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 pb-24 space-y-20">

        {/* The problem */}
        <section>
          <h2 className="text-xl font-bold mb-6 text-cage-accent" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
            The problem
          </h2>
          <div className="space-y-4 text-cage-mid leading-relaxed" style={{ letterSpacing: "-0.2px" }}>
            <p>Every website that needs to verify age makes users upload a government ID. That means dozens of companies storing sensitive identity documents — each one a breach waiting to happen.</p>
            <p>Users have no visibility into where their data ends up, how long it's kept, or who has access to it. A driver's license submitted for one site might sit on servers you've never heard of.</p>
            <p>And despite all this friction, young people still access age-restricted content — because the verification experience is so bad that many sites don't bother enforcing it.</p>
            <p>The current system is broken for everyone: it's invasive for users, liability-heavy for sites, and ineffective at its stated goal.</p>
          </div>
        </section>

        {/* The idea */}
        <section>
          <h2 className="text-xl font-bold mb-6 text-cage-accent" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
            The idea
          </h2>
          <div className="space-y-4 text-cage-mid leading-relaxed" style={{ letterSpacing: "-0.2px" }}>
            <p>What if you only had to verify your age once?</p>
            <p>What if the sites that need your age never saw your ID?</p>
            <p>What if the whole thing was invisible after the first time?</p>
            <p className="text-cage-text-dark font-medium">That's CAGE: Confirmed Age, Granted Entry.</p>
            <p>Verify once. Use everywhere. No repeat uploads. No site ever sees your documents. Your identity stays yours.</p>
          </div>
        </section>

        {/* How it's built */}
        <section>
          <h2 className="text-xl font-bold mb-6 text-cage-accent" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
            How it's built
          </h2>
          <div className="space-y-4 text-cage-mid leading-relaxed" style={{ letterSpacing: "-0.2px" }}>
            <p>CAGE uses a trusted third party — <a href="https://veriff.com" className="text-cage-text-dark hover:text-cage-accent transition-colors">Veriff</a> — to check your government ID. CAGE never receives the document itself. Veriff processes it, confirms your age, and discards the data on their own schedule.</p>
            <p>CAGE stores only the result: you're 18+ or 21+. No name. No birthdate. No document images. Just a flag.</p>
            <p>When a website needs to confirm your age, CAGE issues a signed token confirming the result — anonymously. The site never learns who you are, and it can't connect your identity to any other site you've verified through.</p>
            <p>The browser extension makes repeat verifications invisible. On your second visit to any partner site, CAGE confirms your age in the background without interrupting you.</p>
            <p>The project is <a href="https://github.com/CageID/cageid" className="text-cage-text-dark hover:text-cage-accent transition-colors">open source on GitHub</a>.</p>
          </div>
        </section>

        {/* The team */}
        <section>
          <h2 className="text-xl font-bold mb-6 text-cage-accent" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
            The team
          </h2>
          <div className="space-y-4 text-cage-mid leading-relaxed" style={{ letterSpacing: "-0.2px" }}>
            <p>CAGE is an early-stage project built by a small team. We're moving fast and building in the open.</p>
            <p>Interested in contributing or partnering? Reach out at <a href="mailto:hello@cageid.app" className="text-cage-text-dark hover:text-cage-accent transition-colors">hello@cageid.app</a> or find us on <a href="https://github.com/CageID/cageid" className="text-cage-text-dark hover:text-cage-accent transition-colors">GitHub</a>.</p>
          </div>
        </section>

      </div>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-cage-accent/5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CageLogo className="h-5 w-auto" />
            <span className="text-xs text-cage-mid/50">Confirmed Age, Granted Entry</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-cage-mid/50">
            <Link href="/about" className="hover:text-cage-text-dark transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-cage-text-dark transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-cage-text-dark transition-colors">Terms</Link>
            <Link href="/docs" className="hover:text-cage-text-dark transition-colors">Docs</Link>
            <a href="https://github.com/CageID/cageid" className="hover:text-cage-text-dark transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
```

**Step 2: Type-check**
```bash
pnpm check-types --filter=web
```
Expected: 2 successful, 0 errors.

**Step 3: Commit**
```bash
git add apps/web/app/about/page.tsx
git commit -m "feat: add /about page — mission and story"
```

---

### Task 2: Create `/privacy` page

**Files:**
- Create: `apps/web/app/privacy/page.tsx`

**Step 1: Create the file**

```tsx
import Link from "next/link";
import { CageLogo } from "../components/cage-logo";

const NAV_LINK = {
  fontFamily: "var(--font-syne)",
  fontWeight: 650,
  letterSpacing: "1px",
  fontSize: "0.8em",
} as const;

const sections = [
  { id: "what-we-collect", label: "What we collect" },
  { id: "what-we-never-collect", label: "What we never collect" },
  { id: "third-parties", label: "Third-party services" },
  { id: "retention", label: "How long we keep your data" },
  { id: "partners", label: "What partners receive" },
  { id: "your-rights", label: "Your rights" },
  { id: "extension", label: "Browser extension" },
  { id: "changes", label: "Changes to this policy" },
];

export default function PrivacyPage() {
  return (
    <div className="bg-cage-bg-dark text-cage-text-dark min-h-screen" style={{ letterSpacing: "-0.5px" }}>

      {/* ─── Nav ──────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cage-bg-dark/80"
        style={{
          borderBottom: "1px solid transparent",
          backgroundImage: "linear-gradient(var(--color-cage-bg-dark), var(--color-cage-bg-dark)), linear-gradient(to right, transparent, rgba(160,255,87,0.3), transparent)",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
        }}>
        <div className="max-w-6xl mx-auto px-6 h-28 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <CageLogo className="h-24 w-auto transition-all group-hover:[filter:drop-shadow(0_0_8px_rgba(160,255,87,0.5))]" />
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/#how-it-works" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>HOW IT WORKS</Link>
            <Link href="/#for-partners" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>PARTNERS</Link>
            <Link href="/#trust" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>TRUST</Link>
            <Link href="/pricing" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>PRICING</Link>
            <Link href="/login" className="text-sm text-cage-dark bg-cage-accent px-4 py-2 rounded-lg hover:brightness-110 transition" style={NAV_LINK}>SIGN IN</Link>
          </div>
        </div>
      </nav>

      {/* ─── Header ───────────────────────────────────────────────── */}
      <div className="pt-40 pb-12 px-6 border-b border-cage-accent/5">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-cage-mid mb-3" style={NAV_LINK}>LEGAL</p>
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.04em" }}>Privacy Policy</h1>
          <p className="text-sm text-cage-mid mb-4">Last updated: March 2026</p>
          <p className="text-cage-mid leading-relaxed">
            CAGE is designed to know as little about you as possible. Here's exactly what we collect, why, and how long we keep it.
          </p>
        </div>
      </div>

      {/* ─── Table of contents ────────────────────────────────────── */}
      <div className="px-6 py-8 border-b border-cage-accent/5">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-cage-mid mb-4" style={NAV_LINK}>CONTENTS</p>
          <ol className="space-y-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm text-cage-mid hover:text-cage-accent transition-colors">
                  {i + 1}. {s.label}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ─── Content ──────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 pb-24 space-y-16 pt-16">

        <section id="what-we-collect">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>What we collect</h2>
          <div className="space-y-3 text-cage-mid leading-relaxed">
            <p>We collect the minimum possible to operate the service:</p>
            <ul className="space-y-2 mt-4">
              {[
                "Email address (hashed — used only for magic link login, never shared)",
                "Age verification result (18+ or 21+ — no exact age, no birthday)",
                "Verification timestamp and expiry date",
                "Anonymous per-partner identifiers (so partner sites cannot track you across other sites)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <span className="text-cage-accent mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-cage-text-dark font-medium pt-2">That's it. No name, no address, no government ID images, no biometric data.</p>
          </div>
        </section>

        <section id="what-we-never-collect">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>What we never collect</h2>
          <div className="space-y-3 text-cage-mid leading-relaxed">
            <ul className="space-y-2">
              {[
                "Government ID document images (handled entirely by Veriff — see their privacy policy)",
                "Full legal name",
                "Date of birth",
                "Facial biometric data",
                "Browsing history or location data",
                "IP addresses (used only for in-memory rate limiting — never stored)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <span className="text-cage-error mt-0.5 shrink-0">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="third-parties">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>Third-party services</h2>
          <div className="space-y-4 text-cage-mid leading-relaxed text-sm">
            {[
              { name: "Veriff", desc: "Handles identity document verification. They temporarily store document images and selfie data per their own retention policy (default 7 days). CAGE never receives or stores this data." },
              { name: "Neon (PostgreSQL)", desc: "Stores our database. Data is encrypted at rest." },
              { name: "Upstash (Redis)", desc: "Temporary session and auth code storage only. No long-term personal data." },
              { name: "Resend", desc: "Sends magic link emails. Processes email addresses for delivery only." },
              { name: "Vercel", desc: "Hosts the frontend. Standard CDN request logging." },
              { name: "Railway", desc: "Hosts the backend API." },
            ].map(({ name, desc }) => (
              <div key={name}>
                <p className="font-semibold text-cage-text-dark mb-1">{name}</p>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="retention">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>How long we keep your data</h2>
          <div className="space-y-2 text-sm text-cage-mid">
            {[
              ["Session data", "90 days"],
              ["Verification result", "12 months from verification, or until you delete your account"],
              ["Auth codes", "60 seconds (auto-deleted)"],
            ].map(([item, duration]) => (
              <div key={item} className="flex justify-between py-3 border-b border-cage-accent/5">
                <span>{item}</span>
                <span className="text-cage-text-dark">{duration}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="partners">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>What partners receive</h2>
          <div className="space-y-3 text-cage-mid leading-relaxed text-sm">
            <p>When a partner site requests your age verification, they receive only:</p>
            <ul className="space-y-2 mt-2">
              {[
                "An anonymous ID — unique to that partner, cannot be used to identify you elsewhere",
                "A boolean age_verified flag (always true if the token was issued)",
                "An age_floor (18 or 21)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-cage-accent mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="pt-2">Partners cannot see your email, name, or any personal information. They cannot correlate your identity across other partner sites.</p>
          </div>
        </section>

        <section id="your-rights">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>Your rights</h2>
          <div className="space-y-3 text-cage-mid leading-relaxed text-sm">
            <p>You can delete your account at any time from your dashboard. This is a hard delete — all data is permanently and immediately removed, including your verification result, partner connections, and session data.</p>
            <p>For any data requests or questions, email us at <a href="mailto:privacy@cageid.app" className="text-cage-text-dark hover:text-cage-accent transition-colors">privacy@cageid.app</a>.</p>
          </div>
        </section>

        <section id="extension">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>Browser extension</h2>
          <div className="space-y-3 text-cage-mid leading-relaxed text-sm">
            <ul className="space-y-2">
              {[
                "The extension stores your session token locally in chrome.storage.local on your device only",
                "It does not track your browsing history",
                "It only activates when a partner site initiates a CAGE OAuth flow",
                "No data is sent to CAGE servers except during active OAuth flows",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-cage-accent mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="changes">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>Changes to this policy</h2>
          <div className="space-y-3 text-cage-mid leading-relaxed text-sm">
            <p>We'll update this page if anything changes. Major changes will be communicated via email to registered users.</p>
          </div>
        </section>

      </div>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-cage-accent/5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CageLogo className="h-5 w-auto" />
            <span className="text-xs text-cage-mid/50">Confirmed Age, Granted Entry</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-cage-mid/50">
            <Link href="/about" className="hover:text-cage-text-dark transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-cage-text-dark transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-cage-text-dark transition-colors">Terms</Link>
            <Link href="/docs" className="hover:text-cage-text-dark transition-colors">Docs</Link>
            <a href="https://github.com/CageID/cageid" className="hover:text-cage-text-dark transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
```

**Step 2: Type-check**
```bash
pnpm check-types --filter=web
```
Expected: 2 successful, 0 errors.

**Step 3: Commit**
```bash
git add apps/web/app/privacy/page.tsx
git commit -m "feat: add /privacy page — plain-language privacy policy"
```

---

### Task 3: Create `/terms` page

**Files:**
- Create: `apps/web/app/terms/page.tsx`

**Step 1: Create the file**

Same nav + footer pattern as /privacy. Structure:

```tsx
import Link from "next/link";
import { CageLogo } from "../components/cage-logo";

const NAV_LINK = {
  fontFamily: "var(--font-syne)",
  fontWeight: 650,
  letterSpacing: "1px",
  fontSize: "0.8em",
} as const;

const sections = [
  { id: "what-cage-is", label: "What CAGE is" },
  { id: "accounts", label: "Accounts" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "for-partners", label: "For partners" },
  { id: "availability", label: "Availability" },
  { id: "data-deletion", label: "Data and deletion" },
  { id: "liability", label: "Liability" },
  { id: "changes", label: "Changes" },
];

export default function TermsPage() {
  return (
    <div className="bg-cage-bg-dark text-cage-text-dark min-h-screen" style={{ letterSpacing: "-0.5px" }}>

      {/* Nav — identical to privacy page */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cage-bg-dark/80"
        style={{
          borderBottom: "1px solid transparent",
          backgroundImage: "linear-gradient(var(--color-cage-bg-dark), var(--color-cage-bg-dark)), linear-gradient(to right, transparent, rgba(160,255,87,0.3), transparent)",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
        }}>
        <div className="max-w-6xl mx-auto px-6 h-28 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <CageLogo className="h-24 w-auto transition-all group-hover:[filter:drop-shadow(0_0_8px_rgba(160,255,87,0.5))]" />
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/#how-it-works" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>HOW IT WORKS</Link>
            <Link href="/#for-partners" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>PARTNERS</Link>
            <Link href="/#trust" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>TRUST</Link>
            <Link href="/pricing" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>PRICING</Link>
            <Link href="/login" className="text-sm text-cage-dark bg-cage-accent px-4 py-2 rounded-lg hover:brightness-110 transition" style={NAV_LINK}>SIGN IN</Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="pt-40 pb-12 px-6 border-b border-cage-accent/5">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-cage-mid mb-3" style={NAV_LINK}>LEGAL</p>
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.04em" }}>Terms of Service</h1>
          <p className="text-sm text-cage-mid mb-4">Last updated: March 2026</p>
          <p className="text-cage-mid leading-relaxed">
            The short version: use CAGE honestly, and we'll do our best to keep it running and your data safe.
          </p>
        </div>
      </div>

      {/* Table of contents */}
      <div className="px-6 py-8 border-b border-cage-accent/5">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-cage-mid mb-4" style={NAV_LINK}>CONTENTS</p>
          <ol className="space-y-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm text-cage-mid hover:text-cage-accent transition-colors">
                  {i + 1}. {s.label}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 pb-24 space-y-16 pt-16">

        <section id="what-cage-is">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>What CAGE is</h2>
          <div className="space-y-3 text-cage-mid leading-relaxed text-sm">
            <p>CAGE is an age verification service. We confirm that users meet a minimum age threshold (18+ or 21+) and share that result with partner websites via standard OAuth 2.0 / OpenID Connect.</p>
            <p>We are not an identity provider in the traditional sense — we don't store or share personal identity information. We store only that a verification occurred and its outcome.</p>
          </div>
        </section>

        <section id="accounts">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>Accounts</h2>
          <div className="space-y-2 text-cage-mid text-sm">
            <ul className="space-y-2">
              {[
                "You need a valid email address to create an account",
                "One account per person",
                "You're responsible for keeping your login credentials secure",
                "You must be at least 13 years old to create an account (your verification will confirm your age status)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-cage-accent mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="acceptable-use">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>Acceptable use</h2>
          <div className="text-cage-mid text-sm">
            <p className="mb-3">The following are not permitted:</p>
            <ul className="space-y-2">
              {[
                "Attempting to fraudulently verify your age",
                "Using someone else's identity documents",
                "Attempting to reverse-engineer anonymous partner sub IDs",
                "Abusing the API or attempting to circumvent rate limits",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-cage-error mt-0.5 shrink-0">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="for-partners">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>For partners</h2>
          <div className="space-y-2 text-cage-mid text-sm">
            <ul className="space-y-2">
              {[
                "Partner credentials (client_id, client_secret) are confidential and must not be shared",
                "Partners must not attempt to correlate users across other partners using CAGE data",
                "Partners must not store the raw ID token beyond their immediate session needs",
                "CAGE reserves the right to revoke partner access for violations",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-cage-accent mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="availability">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>Availability</h2>
          <div className="space-y-3 text-cage-mid leading-relaxed text-sm">
            <p>We aim for high availability but do not guarantee 100% uptime. SLA guarantees are only available on Enterprise plans.</p>
            <p>We'll communicate planned downtime in advance when possible.</p>
          </div>
        </section>

        <section id="data-deletion">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>Data and deletion</h2>
          <div className="space-y-3 text-cage-mid leading-relaxed text-sm">
            <p>Users can delete their account and all associated data at any time from the dashboard. Deletion is permanent and irreversible — we do not maintain backups of deleted user data beyond standard infrastructure retention windows.</p>
            <p>See our <Link href="/privacy" className="text-cage-text-dark hover:text-cage-accent transition-colors">Privacy Policy</Link> for full data handling details.</p>
          </div>
        </section>

        <section id="liability">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>Liability</h2>
          <div className="space-y-3 text-cage-mid leading-relaxed text-sm">
            <p>CAGE is provided "as is" without warranty of any kind. We are not liable for any indirect, incidental, or consequential damages arising from use of the service.</p>
            <p>We are not liable for partner sites' decisions made based on age verification results, or for any actions taken by partner sites against their users.</p>
            <p>Our total liability to you for any claims arising from use of CAGE shall not exceed the amounts you paid us in the three months preceding the claim.</p>
          </div>
        </section>

        <section id="changes">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>Changes</h2>
          <div className="space-y-3 text-cage-mid leading-relaxed text-sm">
            <p>We may update these terms from time to time. Continued use of CAGE after changes are posted constitutes acceptance of the updated terms.</p>
            <p>We'll notify registered users by email for material changes.</p>
          </div>
        </section>

      </div>

      {/* Footer — same as privacy */}
      <footer className="py-8 px-6 border-t border-cage-accent/5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CageLogo className="h-5 w-auto" />
            <span className="text-xs text-cage-mid/50">Confirmed Age, Granted Entry</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-cage-mid/50">
            <Link href="/about" className="hover:text-cage-text-dark transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-cage-text-dark transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-cage-text-dark transition-colors">Terms</Link>
            <Link href="/docs" className="hover:text-cage-text-dark transition-colors">Docs</Link>
            <a href="https://github.com/CageID/cageid" className="hover:text-cage-text-dark transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
```

**Step 2: Type-check**
```bash
pnpm check-types --filter=web
```
Expected: 2 successful, 0 errors.

**Step 3: Commit**
```bash
git add apps/web/app/terms/page.tsx
git commit -m "feat: add /terms page — terms of service"
```

---

### Task 4: Create `/docs` page

**Files:**
- Create: `apps/web/app/docs/page.tsx`

This is the most complex page. It uses a two-column layout on desktop: sticky left sidebar (table of contents) + scrollable content area. Pure CSS, no JS.

**Step 1: Create the file**

Layout pattern:
```tsx
{/* Two-column layout: sidebar + content */}
<div className="max-w-6xl mx-auto px-6 pb-24 pt-8">
  <div className="lg:flex lg:gap-16">

    {/* Sticky sidebar — desktop only */}
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-36">
        <p className="text-xs text-cage-mid mb-4" style={NAV_LINK}>ON THIS PAGE</p>
        <nav className="space-y-2">
          {docSections.map((s) => (
            <a key={s.id} href={`#${s.id}`}
              className="block text-sm text-cage-mid hover:text-cage-accent transition-colors py-0.5">
              {s.label}
            </a>
          ))}
        </nav>
      </div>
    </aside>

    {/* Main content */}
    <div className="flex-1 min-w-0 space-y-20">
      {/* sections... */}
    </div>

  </div>
</div>
```

Code block pattern (glass card + monospace):
```tsx
<div className="rounded-xl overflow-hidden" style={{
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(160,255,87,0.15)",
}}>
  {/* Optional filename bar */}
  <div className="flex items-center gap-2 px-4 py-3 border-b border-cage-accent/10"
    style={{ background: "rgba(160,255,87,0.04)" }}>
    <span className="text-xs text-cage-mid" style={{ fontFamily: "var(--font-geist-mono)" }}>
      filename.ext
    </span>
  </div>
  <pre className="p-4 text-sm overflow-x-auto" style={{ fontFamily: "var(--font-geist-mono)", lineHeight: 1.7 }}>
    <code className="text-cage-text-dark/90">{`code here`}</code>
  </pre>
</div>
```

Full file content:

```tsx
import Link from "next/link";
import { CageLogo } from "../components/cage-logo";

const NAV_LINK = {
  fontFamily: "var(--font-syne)",
  fontWeight: 650,
  letterSpacing: "1px",
  fontSize: "0.8em",
} as const;

const GLASS_CODE = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(160,255,87,0.15)",
} as const;

const docSections = [
  { id: "quick-start", label: "Quick Start" },
  { id: "step-1", label: "1. Register as a partner" },
  { id: "step-2", label: "2. Redirect to CAGE" },
  { id: "step-3", label: "3. Exchange the code" },
  { id: "step-4", label: "4. Read the claims" },
  { id: "verify-tokens", label: "Verify tokens" },
  { id: "user-flow", label: "User flow" },
  { id: "configuration", label: "Configuration" },
  { id: "help", label: "Need help?" },
];

function CodeBlock({ filename, code }: { filename?: string; code: string }) {
  return (
    <div className="rounded-xl overflow-hidden my-4" style={GLASS_CODE}>
      {filename && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-cage-accent/10"
          style={{ background: "rgba(160,255,87,0.04)" }}>
          <span className="text-xs text-cage-mid" style={{ fontFamily: "var(--font-geist-mono)" }}>
            {filename}
          </span>
        </div>
      )}
      <pre className="p-4 text-sm overflow-x-auto" style={{ fontFamily: "var(--font-geist-mono)", lineHeight: 1.7 }}>
        <code className="text-cage-text-dark/90">{code}</code>
      </pre>
    </div>
  );
}

function ParamTable({ rows }: { rows: { param: string; desc: string }[] }) {
  return (
    <div className="rounded-xl overflow-hidden my-4" style={{
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.07)",
    }}>
      {rows.map(({ param, desc }, i) => (
        <div key={param} className={`flex gap-4 px-4 py-3 text-sm ${i < rows.length - 1 ? "border-b border-cage-accent/5" : ""}`}>
          <code className="text-cage-accent shrink-0 w-40" style={{ fontFamily: "var(--font-geist-mono)" }}>{param}</code>
          <span className="text-cage-mid">{desc}</span>
        </div>
      ))}
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="bg-cage-bg-dark text-cage-text-dark min-h-screen" style={{ letterSpacing: "-0.5px" }}>

      {/* ─── Nav ──────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cage-bg-dark/80"
        style={{
          borderBottom: "1px solid transparent",
          backgroundImage: "linear-gradient(var(--color-cage-bg-dark), var(--color-cage-bg-dark)), linear-gradient(to right, transparent, rgba(160,255,87,0.3), transparent)",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
        }}>
        <div className="max-w-6xl mx-auto px-6 h-28 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <CageLogo className="h-24 w-auto transition-all group-hover:[filter:drop-shadow(0_0_8px_rgba(160,255,87,0.5))]" />
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/#how-it-works" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>HOW IT WORKS</Link>
            <Link href="/#for-partners" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>PARTNERS</Link>
            <Link href="/#trust" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>TRUST</Link>
            <Link href="/pricing" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block" style={NAV_LINK}>PRICING</Link>
            <Link href="/login" className="text-sm text-cage-dark bg-cage-accent px-4 py-2 rounded-lg hover:brightness-110 transition" style={NAV_LINK}>SIGN IN</Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero band ────────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center overflow-hidden pt-28 pb-16 min-h-[30vh]">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none select-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(160,255,87,0.12) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
          }} />
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(160,255,87,0.07) 0%, transparent 70%)" }} />
        <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
          <h1 className="leading-[1.05] mb-4"
            style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.04em", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800 }}>
            Integrate CAGE in minutes.
          </h1>
          <p className="text-lg text-cage-mid max-w-xl mx-auto leading-relaxed" style={{ letterSpacing: "-0.3px" }}>
            Standard OAuth 2.0 / OpenID Connect. If you've integrated "Sign in with Google", you already know how this works.
          </p>
        </div>
      </section>

      {/* ─── Two-column layout ────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="lg:flex lg:gap-16">

          {/* Sticky sidebar */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-36">
              <p className="text-xs text-cage-mid mb-4" style={NAV_LINK}>ON THIS PAGE</p>
              <nav className="space-y-1">
                {docSections.map((s) => (
                  <a key={s.id} href={`#${s.id}`}
                    className="block text-sm text-cage-mid hover:text-cage-accent transition-colors py-1">
                    {s.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-20 pt-2">

            {/* Quick Start */}
            <section id="quick-start">
              <p className="text-xs text-cage-accent mb-3" style={NAV_LINK}>QUICK START</p>
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                Four steps to age verification
              </h2>
              <p className="text-cage-mid text-sm leading-relaxed">
                CAGE implements standard OAuth 2.0 with OpenID Connect extensions. The flow is identical to any OAuth provider: redirect, callback, token exchange, claims read.
              </p>
            </section>

            {/* Step 1 */}
            <section id="step-1">
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                1. Register as a partner
              </h2>
              <p className="text-cage-mid text-sm leading-relaxed mb-4">
                Contact us at <a href="mailto:partners@cageid.app" className="text-cage-text-dark hover:text-cage-accent transition-colors">partners@cageid.app</a> to get your credentials. Self-serve registration is coming soon.
              </p>
              <p className="text-cage-mid text-sm mb-3">You'll receive:</p>
              <CodeBlock filename="credentials" code={`client_id:     cage_partner_abc123\nclient_secret: sk_live_xxxxxxxxxxxx`} />
              <p className="text-cage-mid text-sm mt-3">
                Keep your <code className="text-cage-accent px-1 rounded" style={{ fontFamily: "var(--font-geist-mono)", background: "rgba(160,255,87,0.08)" }}>client_secret</code> secure — treat it like a password. Never expose it in client-side code.
              </p>
            </section>

            {/* Step 2 */}
            <section id="step-2">
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                2. Redirect to CAGE
              </h2>
              <p className="text-cage-mid text-sm leading-relaxed mb-4">
                When a user needs to verify their age, redirect them to the CAGE authorization endpoint:
              </p>
              <CodeBlock code={`GET https://api.cageid.app/oauth/authorize\n  ?client_id=YOUR_CLIENT_ID\n  &redirect_uri=https://yoursite.com/callback\n  &response_type=code\n  &state=RANDOM_STATE_STRING\n  &scope=openid age_verification`} />
              <ParamTable rows={[
                { param: "client_id", desc: "Your partner client ID from registration" },
                { param: "redirect_uri", desc: "Must be pre-registered and match exactly" },
                { param: "response_type", desc: "Always code" },
                { param: "state", desc: "Random string — you verify this on callback to prevent CSRF" },
                { param: "scope", desc: "Always openid age_verification" },
              ]} />
            </section>

            {/* Step 3 */}
            <section id="step-3">
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                3. Exchange the code for a token
              </h2>
              <p className="text-cage-mid text-sm leading-relaxed mb-4">
                After the user authenticates, CAGE redirects back to your <code className="text-cage-accent px-1 rounded" style={{ fontFamily: "var(--font-geist-mono)", background: "rgba(160,255,87,0.08)" }}>redirect_uri</code> with a short-lived auth code. Exchange it server-side:
              </p>
              <CodeBlock code={`POST https://api.cageid.app/oauth/token\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=authorization_code\n&code=AUTH_CODE_FROM_CALLBACK\n&redirect_uri=https://yoursite.com/callback\n&client_id=YOUR_CLIENT_ID\n&client_secret=YOUR_CLIENT_SECRET`} />
              <p className="text-cage-mid text-sm my-4">Response:</p>
              <CodeBlock filename="response.json" code={`{\n  "id_token": "eyJhbGciOiJSUzI1NiIs...",\n  "token_type": "Bearer"\n}`} />
              <p className="text-cage-mid text-sm mt-3">Auth codes expire after 60 seconds and are single-use.</p>
            </section>

            {/* Step 4 */}
            <section id="step-4">
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                4. Read the claims
              </h2>
              <p className="text-cage-mid text-sm leading-relaxed mb-4">
                Decode and verify the ID token (see <a href="#verify-tokens" className="text-cage-text-dark hover:text-cage-accent transition-colors">Verify tokens</a> below). The decoded payload looks like:
              </p>
              <CodeBlock filename="id_token (decoded)" code={`{\n  "iss": "https://api.cageid.app",\n  "sub": "anon_partner_scoped_hash",\n  "aud": "YOUR_CLIENT_ID",\n  "age_verified": true,\n  "age_floor": 18,\n  "iat": 1741910400,\n  "exp": 1741996800\n}`} />
              <ParamTable rows={[
                { param: "sub", desc: "Anonymous user ID — unique per partner. Cannot be correlated across partners." },
                { param: "age_verified", desc: "Always true if the token was issued." },
                { param: "age_floor", desc: "18 or 21 — matches your registered age requirement." },
                { param: "iss", desc: "Token issuer — always https://api.cageid.app" },
                { param: "aud", desc: "Your client_id" },
                { param: "iat / exp", desc: "Standard issued-at and expiry timestamps." },
              ]} />
            </section>

            {/* Verify tokens */}
            <section id="verify-tokens">
              <p className="text-xs text-cage-accent mb-3" style={NAV_LINK}>SECURITY</p>
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                Verify tokens
              </h2>
              <p className="text-cage-mid text-sm leading-relaxed mb-4">
                Always verify the JWT signature before trusting the claims. Use any standard OIDC/JWT library (<code className="text-cage-accent px-1 rounded" style={{ fontFamily: "var(--font-geist-mono)", background: "rgba(160,255,87,0.08)" }}>jose</code>, <code className="text-cage-accent px-1 rounded" style={{ fontFamily: "var(--font-geist-mono)", background: "rgba(160,255,87,0.08)" }}>jsonwebtoken</code>, etc.) with CAGE's public keys.
              </p>
              <ParamTable rows={[
                { param: "JWKS endpoint", desc: "https://api.cageid.app/oauth/.well-known/jwks.json" },
                { param: "Discovery doc", desc: "https://api.cageid.app/oauth/.well-known/openid-configuration" },
              ]} />
              <p className="text-cage-mid text-sm mt-3">
                Verify: signature, <code className="text-cage-accent px-1 rounded" style={{ fontFamily: "var(--font-geist-mono)", background: "rgba(160,255,87,0.08)" }}>iss</code>, <code className="text-cage-accent px-1 rounded" style={{ fontFamily: "var(--font-geist-mono)", background: "rgba(160,255,87,0.08)" }}>aud</code> (must equal your client_id), and <code className="text-cage-accent px-1 rounded" style={{ fontFamily: "var(--font-geist-mono)", background: "rgba(160,255,87,0.08)" }}>exp</code>.
              </p>
            </section>

            {/* User flow */}
            <section id="user-flow">
              <p className="text-xs text-cage-accent mb-3" style={NAV_LINK}>OVERVIEW</p>
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                User flow
              </h2>
              <div className="space-y-3">
                {[
                  "User clicks 'Verify Age' on your site",
                  "Browser redirects to CAGE authorization endpoint",
                  "User logs in and consents — or the CAGE browser extension handles it silently",
                  "CAGE redirects back to your redirect_uri with an auth code",
                  "Your server exchanges the code for an ID token",
                  "Your server reads the age_verified and age_floor claims",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <span className="text-xs text-cage-dark bg-cage-accent rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                    <p className="text-cage-mid text-sm leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Configuration */}
            <section id="configuration">
              <p className="text-xs text-cage-accent mb-3" style={NAV_LINK}>REFERENCE</p>
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                Configuration
              </h2>
              <div className="space-y-4 text-cage-mid text-sm leading-relaxed">
                <div>
                  <p className="text-cage-text-dark font-medium mb-1">Redirect URIs</p>
                  <p>Must be pre-registered with CAGE and match exactly — including trailing slashes and protocol. No wildcards.</p>
                </div>
                <div>
                  <p className="text-cage-text-dark font-medium mb-1">Age floor</p>
                  <p>Set during partner registration. Either 18 or 21. Contact us to change it.</p>
                </div>
                <div>
                  <p className="text-cage-text-dark font-medium mb-1">Refresh tokens</p>
                  <p>Not supported at this time. Users re-authenticate when their session expires.</p>
                </div>
                <div>
                  <p className="text-cage-text-dark font-medium mb-1">Auth code expiry</p>
                  <p>60 seconds. Single-use. Exchange immediately after receiving.</p>
                </div>
              </div>
            </section>

            {/* Help */}
            <section id="help">
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                Need help?
              </h2>
              <div className="space-y-3 text-cage-mid text-sm leading-relaxed">
                <p>Email us at <a href="mailto:partners@cageid.app" className="text-cage-text-dark hover:text-cage-accent transition-colors">partners@cageid.app</a> — we respond to integration questions within one business day.</p>
                <p>The server source code is <a href="https://github.com/CageID/cageid" className="text-cage-text-dark hover:text-cage-accent transition-colors">open source on GitHub</a> if you want to inspect the exact endpoint behavior.</p>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-cage-accent/5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CageLogo className="h-5 w-auto" />
            <span className="text-xs text-cage-mid/50">Confirmed Age, Granted Entry</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-cage-mid/50">
            <Link href="/about" className="hover:text-cage-text-dark transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-cage-text-dark transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-cage-text-dark transition-colors">Terms</Link>
            <Link href="/docs" className="hover:text-cage-text-dark transition-colors">Docs</Link>
            <a href="https://github.com/CageID/cageid" className="hover:text-cage-text-dark transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
```

**Step 2: Type-check**
```bash
pnpm check-types --filter=web
```
Expected: 2 successful, 0 errors.

**Step 3: Commit**
```bash
git add apps/web/app/docs/page.tsx
git commit -m "feat: add /docs page — developer integration guide with sticky sidebar"
```

---

### Task 5: Update footer links and partner section buttons on existing pages

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/pricing/page.tsx`

#### In `apps/web/app/page.tsx`

**Change 1 — Footer links** (around line 516): Replace all four footer `<a>` tags with:
```tsx
<Link href="/about" className="hover:text-cage-text-dark transition-colors">About</Link>
<Link href="/privacy" className="hover:text-cage-text-dark transition-colors">Privacy</Link>
<Link href="/terms" className="hover:text-cage-text-dark transition-colors">Terms</Link>
<Link href="/docs" className="hover:text-cage-text-dark transition-colors">Docs</Link>
<a href="https://github.com/CageID/cageid" className="hover:text-cage-text-dark transition-colors">GitHub</a>
```

**Change 2 — "READ THE DOCS" button** (around line 332): Change `href="#"` to `href="/docs"` and change the element from `<a>` to `<Link>`:
```tsx
<Link
  href="/docs"
  className="inline-flex items-center justify-center px-6 py-3 text-sm text-cage-dark rounded-xl hover:brightness-110 transition-all"
  style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em", background: "linear-gradient(135deg, #a0ff57, #6dff00)", boxShadow: "0 0 30px rgba(160,255,87,0.25)" }}
>
  READ THE DOCS
</Link>
```

**Change 3 — "GET API ACCESS" button** (around line 343): Change `href="#"` to `href="mailto:partners@cageid.app"` (keep as `<a>` since it's external):
```tsx
<a
  href="mailto:partners@cageid.app"
  className="inline-flex items-center justify-center px-6 py-3 text-sm text-cage-mid border border-cage-mid/30 rounded-xl hover:border-cage-accent/50 hover:text-cage-text-dark transition-all"
  style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
>
  GET API ACCESS
</a>
```

#### In `apps/web/app/pricing/page.tsx`

**Change — Footer links** (around line 454): Replace all four footer `<a>` tags with the same updated footer as above (About → /about, Privacy → /privacy, Terms → /terms, Docs → /docs, GitHub unchanged).

**Step 1: Make all four changes**

**Step 2: Type-check**
```bash
pnpm check-types --filter=web
```
Expected: 2 successful, 0 errors.

**Step 3: Commit**
```bash
git add apps/web/app/page.tsx apps/web/app/pricing/page.tsx
git commit -m "feat: wire footer links and partner section buttons to real routes"
```

---

### Task 6: Push

```bash
git push
```

Verify Vercel preview picks up all five new routes: `/about`, `/privacy`, `/terms`, `/docs`, and that footer links work across all pages.
