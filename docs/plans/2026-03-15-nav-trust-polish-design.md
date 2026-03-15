# Nav + Trust Card Polish — Design Doc

**Date:** 2026-03-15

## Changes

### 1. Trust card borders — left edge → full box

**Current:** Each card has `borderLeft: "4px solid [color]"` overriding the base glass border, with a left-only box shadow.

**New:** Full subtle border around the whole card + all-around glow.

- Green card: `border: "1px solid rgba(160,255,87,0.3)"`, `boxShadow: "0 0 24px rgba(160,255,87,0.08)"`
- Amber card: `border: "1px solid rgba(217,119,6,0.3)"`, `boxShadow: "0 0 24px rgba(217,119,6,0.08)"`
- Red card: `border: "1px solid rgba(220,38,38,0.3)"`, `boxShadow: "0 0 24px rgba(220,38,38,0.08)"`

Remove `borderLeft` override from all three. Keep `background` and `backdropFilter` unchanged.

File: `apps/web/app/page.tsx` (Trust section, ~lines 382–452)

---

### 2. Nav reorder — PRICING moves next to SIGN IN

**Current order:** HOW IT WORKS | PARTNERS | PRICING | TRUST | SIGN IN

**New order:** HOW IT WORKS | PARTNERS | TRUST | PRICING | SIGN IN

Anchor-jump links cluster on the left; page links cluster on the right next to the CTA. No style changes — just move the PRICING `<Link>` after TRUST.

File: `apps/web/app/page.tsx` (Nav section, ~lines 19–42)

---

### 3. "MOST POPULAR" badge — fix word wrap

**Current:** The badge `<span>` wraps "MOST POPULAR" across two lines on narrow cards.

**Fix:** Add `whiteSpace: "nowrap"` to the badge inline style.

File: `apps/web/app/pricing/page.tsx` (Growth card badge, ~line 263)
