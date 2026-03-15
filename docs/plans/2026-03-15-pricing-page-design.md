# Pricing Page Design — 2026-03-15

## Overview

Add a `/pricing` page to `apps/web` presenting CAGE's partner pricing tiers. Also add a "Pricing" nav link to the landing page and a "See pricing →" link in the For Partners section.

## Design Decisions

- **Annual billing display:** Show both monthly price and annual equivalent as a static second line ("$X,XXX/yr — 2 months free") in `cage-mid`. No toggle, no JS, fully server-rendered.
- **FAQ format:** Stacked glass cards (all answers visible), matching the landing page glass card pattern. No accordion, no client state.

## Page Layout

### 1. Nav
Same fixed glassmorphism nav as landing page. Add "PRICING" link (Syne font, weight 650, letterSpacing 1px, 0.8em) between PARTNERS and TRUST.

### 2. Hero Band
Compact (~40vh), not full-screen. Dot-grid background + radial glow (same as landing hero). Headline: "Simple pricing that scales with you." Subtext: "Pay a flat monthly fee. Unlimited re-verifications for existing users. New ID checks included up to your tier — overage billed fairly."

### 3. Pricing Cards
Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. Glass cards (`rgba(255,255,255,0.04)` + `backdrop-blur(12px)` + `border: 1px solid rgba(255,255,255,0.07)`).

**Growth card** is highlighted: `cage-accent` border glow + "Most Popular" badge (pill in top-right corner of card).

Each card contains:
- Tier name (Syne font, uppercase, `cage-mid`)
- Monthly price (large, bold, Geist Sans)
- Annual equivalent line (e.g. "$2,990/yr — 2 months free") in `cage-mid`, small
- Short description (1 sentence)
- Feature bullets with `✓` checkmarks
- CTA button

**Tiers:**

| Tier       | Monthly | Annual equiv | Overage |
|------------|---------|-------------|---------|
| Starter    | $99     | $990/yr     | $1.50/verification |
| Growth     | $299    | $2,990/yr   | $1.25/verification |
| Scale      | $799    | $7,990/yr   | $1.00/verification |
| Enterprise | Custom  | —           | Volume pricing |

**CTA buttons:**
- Starter / Scale: ghost outline (border `cage-accent`, transparent bg, `cage-accent` text, hover fills with accent)
- Growth: filled gradient (`linear-gradient(135deg, #a0ff57, #6dff00)` + glow shadow) — visually dominant
- Enterprise: ghost outline, `href="mailto:partners@cageid.app"`

### 4. FAQ Section
Headline: "Common questions." Max-width `max-w-3xl` centered. Six glass cards stacked, each with bold Q and `cage-mid` A.

Questions:
1. What's a verified user?
2. What's a new ID verification?
3. What happens if I exceed my verification limit?
4. Do end users pay anything?
5. Can I switch tiers?
6. What's included in every plan?

### 5. Footer CTA Band
Same gradient footer band as landing page: "Ready to integrate?" with a "Get Started" button.

## Landing Page Edits

1. **Nav:** Add "PRICING" link (`href="/pricing"`) between PARTNERS and TRUST — same Syne style as other nav links.
2. **For Partners section:** Add `"See pricing →"` text link below the existing CTA button, linking to `/pricing`. Style: `cage-mid` text, hover to `cage-text-dark`.

## File Changes

1. `apps/web/app/pricing/page.tsx` — new file
2. `apps/web/app/page.tsx` — add nav link + "See pricing" link in For Partners section

## Constraints

- No payment processing, no Stripe
- No partner signup flow
- No usage dashboard
- Page is fully informational and server-rendered (no `"use client"`)
