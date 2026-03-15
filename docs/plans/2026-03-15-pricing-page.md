# Pricing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/pricing` page showing CAGE's partner pricing tiers, link it from the landing nav, and add a "See pricing" link in the For Partners section.

**Architecture:** Three files touched — one new page created, one existing page edited. No client state, no API calls, fully server-rendered. Matches Premium Dark design system exactly (glassmorphism cards, gradient CTA button, dot-grid hero).

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v4 with CAGE tokens, Geist Sans, Syne — all already in the project.

---

### Task 1: Create `apps/web/app/pricing/page.tsx`

**Files:**
- Create: `apps/web/app/pricing/page.tsx`

**Step 1: Create the file**

```tsx
import Link from "next/link";
import { CageLogo } from "../components/cage-logo";

// ─── Data ────────────────────────────────────────────────────────────────────

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.07)",
} as const;

const NAV_LINK = {
  fontFamily: "var(--font-syne)",
  fontWeight: 650,
  letterSpacing: "1px",
  fontSize: "0.8em",
} as const;

const tiers = [
  {
    name: "Starter",
    price: 99,
    annualPrice: 990,
    description: "For small sites getting started with age gating.",
    features: [
      "Up to 500 verified users",
      "50 new ID verifications/mo",
      "$1.50 per extra verification",
      "Standard OAuth/OIDC integration",
      "Email support",
    ],
    cta: "Get Started",
    ctaHref: "#",
    highlight: false,
  },
  {
    name: "Growth",
    price: 299,
    annualPrice: 2990,
    description: "For growing platforms with active user bases.",
    features: [
      "Up to 5,000 verified users",
      "200 new ID verifications/mo",
      "$1.25 per extra verification",
      "Priority email support",
      "Usage dashboard",
    ],
    cta: "Get Started",
    ctaHref: "#",
    highlight: true,
  },
  {
    name: "Scale",
    price: 799,
    annualPrice: 7990,
    description: "For high-traffic platforms that need more.",
    features: [
      "Up to 50,000 verified users",
      "500 new ID verifications/mo",
      "$1.00 per extra verification",
      "Dedicated support channel",
      "Custom redirect branding",
      "Usage dashboard + API analytics",
    ],
    cta: "Get Started",
    ctaHref: "#",
    highlight: false,
  },
] as const;

const faqs = [
  {
    q: "What's a verified user?",
    a: "A unique user who has authenticated via CAGE for your site. Once verified, they can re-authenticate unlimited times at no extra cost.",
  },
  {
    q: "What's a new ID verification?",
    a: "When a user verifies their identity with CAGE for the first time via government ID scan. This only happens once per user, ever — not once per partner. If a user already verified through another partner site, they cost you nothing.",
  },
  {
    q: "What happens if I exceed my verification limit?",
    a: "You're billed per additional verification at your tier's overage rate. No service interruption.",
  },
  {
    q: "Do end users pay anything?",
    a: "No. CAGE is always free for end users.",
  },
  {
    q: "Can I switch tiers?",
    a: "Upgrade or downgrade anytime. Changes take effect on your next billing cycle.",
  },
  {
    q: "What's included in every plan?",
    a: "Standard OAuth 2.0 / OpenID Connect integration, JWKS endpoint for token verification, two age tiers (18+ and 21+), browser extension support for silent verification, and full API documentation.",
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div
      className="bg-cage-bg-dark text-cage-text-dark min-h-screen"
      style={{ letterSpacing: "-0.5px" }}
    >
      {/* ─── Nav ────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cage-bg-dark/80"
        style={{
          borderBottom: "1px solid transparent",
          backgroundImage:
            "linear-gradient(var(--color-cage-bg-dark), var(--color-cage-bg-dark)), linear-gradient(to right, transparent, rgba(160,255,87,0.3), transparent)",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-28 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <CageLogo className="h-24 w-auto transition-all group-hover:[filter:drop-shadow(0_0_8px_rgba(160,255,87,0.5))]" />
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/#how-it-works"
              className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block"
              style={NAV_LINK}
            >
              HOW IT WORKS
            </Link>
            <Link
              href="/#for-partners"
              className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block"
              style={NAV_LINK}
            >
              PARTNERS
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-cage-accent transition-colors hidden sm:block"
              style={NAV_LINK}
            >
              PRICING
            </Link>
            <Link
              href="/#trust"
              className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block"
              style={NAV_LINK}
            >
              TRUST
            </Link>
            <Link
              href="/login"
              className="text-sm text-cage-dark bg-cage-accent px-4 py-2 rounded-lg hover:brightness-110 transition"
              style={NAV_LINK}
            >
              SIGN IN
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero band ──────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center overflow-hidden pt-28 pb-20 min-h-[40vh]">
        {/* Dot grid */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(160,255,87,0.12) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
          }}
        />
        {/* Radial glow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(160,255,87,0.07) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
          <h1
            className="leading-[1.05] mb-6"
            style={{
              fontFamily: "var(--font-geist-sans)",
              letterSpacing: "-0.04em",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 800,
              textWrap: "balance",
            }}
          >
            Simple pricing that{" "}
            <span className="text-cage-accent">scales with you.</span>
          </h1>
          <p
            className="text-lg sm:text-xl text-cage-mid max-w-xl mx-auto leading-relaxed"
            style={{ letterSpacing: "-0.3px" }}
          >
            Pay a flat monthly fee. Unlimited re-verifications for existing
            users. New ID checks included up to your tier — overage billed
            fairly.
          </p>
        </div>
      </section>

      {/* ─── Pricing cards ──────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Starter / Growth / Scale */}
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="relative rounded-2xl p-6 flex flex-col"
                style={
                  tier.highlight
                    ? {
                        ...GLASS,
                        border: "1px solid rgba(160,255,87,0.4)",
                        boxShadow:
                          "0 0 40px rgba(160,255,87,0.08), 0 0 0 1px rgba(160,255,87,0.15)",
                      }
                    : GLASS
                }
              >
                {/* Most Popular badge */}
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="px-3 py-1 text-xs text-cage-dark rounded-full"
                      style={{
                        ...NAV_LINK,
                        background: "linear-gradient(135deg, #a0ff57, #6dff00)",
                        fontSize: "0.7em",
                      }}
                    >
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Tier name */}
                <p
                  className="text-xs text-cage-mid mb-4"
                  style={{ ...NAV_LINK, fontSize: "0.75em" }}
                >
                  {tier.name.toUpperCase()}
                </p>

                {/* Price */}
                <div className="mb-1">
                  <span
                    className="text-4xl font-bold"
                    style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.04em" }}
                  >
                    ${tier.price}
                  </span>
                  <span className="text-cage-mid text-sm ml-1">/mo</span>
                </div>

                {/* Annual */}
                <p className="text-xs text-cage-mid mb-4">
                  ${tier.annualPrice.toLocaleString()}/yr — 2 months free
                </p>

                {/* Description */}
                <p className="text-sm text-cage-mid leading-relaxed mb-6">
                  {tier.description}
                </p>

                {/* Features */}
                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-cage-accent mt-0.5 shrink-0"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-cage-text-dark/80">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {tier.highlight ? (
                  <a
                    href={tier.ctaHref}
                    className="inline-flex items-center justify-center px-5 py-3 text-sm text-cage-dark rounded-xl hover:brightness-110 transition-all"
                    style={{
                      ...NAV_LINK,
                      fontSize: "0.8em",
                      background: "linear-gradient(135deg, #a0ff57, #6dff00)",
                      boxShadow: "0 0 30px rgba(160,255,87,0.25)",
                    }}
                  >
                    {tier.cta.toUpperCase()}
                  </a>
                ) : (
                  <a
                    href={tier.ctaHref}
                    className="inline-flex items-center justify-center px-5 py-3 text-sm text-cage-accent border border-cage-accent/40 rounded-xl hover:bg-cage-accent/10 transition-all"
                    style={NAV_LINK}
                  >
                    {tier.cta.toUpperCase()}
                  </a>
                )}
              </div>
            ))}

            {/* Enterprise */}
            <div
              className="rounded-2xl p-6 flex flex-col"
              style={{
                ...GLASS,
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p
                className="text-xs text-cage-mid mb-4"
                style={{ ...NAV_LINK, fontSize: "0.75em" }}
              >
                ENTERPRISE
              </p>
              <div className="mb-1">
                <span
                  className="text-4xl font-bold"
                  style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.04em" }}
                >
                  Custom
                </span>
              </div>
              <p className="text-xs text-cage-mid mb-4">Volume pricing</p>
              <p className="text-sm text-cage-mid leading-relaxed mb-6">
                For platforms that need unlimited scale and enterprise SLAs.
              </p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  "Unlimited users",
                  "Volume verification pricing",
                  "SLA guarantees",
                  "Dedicated account manager",
                  "Custom integration support",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-cage-accent mt-0.5 shrink-0"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-cage-text-dark/80">{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="mailto:partners@cageid.app"
                className="inline-flex items-center justify-center px-5 py-3 text-sm text-cage-accent border border-cage-accent/40 rounded-xl hover:bg-cage-accent/10 transition-all"
                style={NAV_LINK}
              >
                CONTACT US
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ────────────────────────────────────────────────── */}
      <section className="px-6 pb-24 border-t border-cage-accent/5 pt-24">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-sm uppercase text-cage-accent mb-4 text-center"
            style={{ ...NAV_LINK, fontSize: "0.8em" }}
          >
            FAQ
          </h2>
          <p
            className="text-3xl sm:text-4xl font-bold text-center mb-12"
            style={{ letterSpacing: "-1px", textWrap: "balance" }}
          >
            Common questions.
          </p>

          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <div key={q} className="rounded-xl p-6" style={GLASS}>
                <p
                  className="font-semibold mb-2"
                  style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.02em" }}
                >
                  {q}
                </p>
                <p className="text-sm text-cage-mid leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer CTA band ────────────────────────────────────── */}
      <section
        className="py-24 px-6 border-t border-cage-accent/5 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(to bottom, rgba(160,255,87,0.06) 0%, transparent 60%)",
        }}
      >
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <p
            className="text-3xl sm:text-4xl font-bold mb-8"
            style={{ letterSpacing: "-1px", textWrap: "balance" }}
          >
            Ready to integrate?
          </p>
          <a
            href="#"
            className="inline-flex items-center justify-center px-10 py-4 text-base text-cage-dark rounded-xl hover:brightness-110 transition-all"
            style={{
              ...NAV_LINK,
              fontSize: "0.9em",
              background: "linear-gradient(135deg, #a0ff57, #6dff00)",
              boxShadow:
                "0 0 60px rgba(160,255,87,0.25), 0 0 20px rgba(160,255,87,0.1)",
            }}
          >
            GET STARTED
          </a>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-cage-accent/5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CageLogo className="h-5 w-auto" />
            <span className="text-xs text-cage-mid/50">
              Confirmed Age, Granted Entry
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-cage-mid/50">
            <a href="#" className="hover:text-cage-text-dark transition-colors">
              About
            </a>
            <a href="#" className="hover:text-cage-text-dark transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-cage-text-dark transition-colors">
              Docs
            </a>
            <a
              href="https://github.com/CageID/cageid"
              className="hover:text-cage-text-dark transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

**Step 2: Verify types pass**

```bash
pnpm check-types --filter=web
```

Expected: `Tasks: 2 successful, 2 total` — no errors.

**Step 3: Commit**

```bash
git add apps/web/app/pricing/page.tsx
git commit -m "feat: add /pricing page with four partner tiers and FAQ"
```

---

### Task 2: Add "PRICING" nav link to landing page

**Files:**
- Modify: `apps/web/app/page.tsx` — nav section, lines ~27-30 (between PARTNERS and TRUST links)

**Step 1: Add the link**

In `apps/web/app/page.tsx`, find the TRUST nav link:
```tsx
<a href="#trust" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block"
  style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}>
  TRUST
</a>
```

Insert this **before** the TRUST link:
```tsx
<Link href="/pricing" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block"
  style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}>
  PRICING
</Link>
```

**Step 2: Verify types pass**

```bash
pnpm check-types --filter=web
```

Expected: `Tasks: 2 successful, 2 total`

**Step 3: Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat: add Pricing nav link to landing page"
```

---

### Task 3: Add "See pricing →" link in For Partners section

**Files:**
- Modify: `apps/web/app/page.tsx` — For Partners section CTA buttons, lines ~327-346

**Step 1: Add the link**

In the For Partners section, find the flex container that holds the "READ THE DOCS" and "GET API ACCESS" buttons:
```tsx
<div className="flex flex-col sm:flex-row gap-3">
  <a href="#" ...>READ THE DOCS</a>
  <a href="#" ...>GET API ACCESS</a>
</div>
```

Add a "See pricing" link **after** the button flex container (not inside it):
```tsx
<div className="flex flex-col sm:flex-row gap-3">
  <a href="#" ...>READ THE DOCS</a>
  <a href="#" ...>GET API ACCESS</a>
</div>
<Link
  href="/pricing"
  className="mt-3 text-sm text-cage-mid hover:text-cage-text-dark transition-colors inline-flex items-center gap-1"
  style={{ letterSpacing: "-0.3px" }}
>
  See pricing
  <span aria-hidden="true">→</span>
</Link>
```

**Step 2: Verify types pass**

```bash
pnpm check-types --filter=web
```

Expected: `Tasks: 2 successful, 2 total`

**Step 3: Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat: add See pricing link in For Partners section"
```

---

### Task 4: Push and verify

**Step 1: Push branch**

```bash
git push
```

**Step 2: Confirm Vercel preview picks up the new commits**

Check the Vercel dashboard for a fresh preview deployment on `claude/trusting-chebyshev`. Once deployed, visit `/pricing` on the preview URL and confirm:
- [ ] 4 pricing cards render, Growth has "Most Popular" badge and green border glow
- [ ] Annual prices shown under each monthly price
- [ ] Enterprise "Contact Us" links to `mailto:partners@cageid.app`
- [ ] 6 FAQ glass cards visible
- [ ] Footer CTA band present
- [ ] Landing page nav has "PRICING" between PARTNERS and TRUST
- [ ] For Partners section has "See pricing →" link
