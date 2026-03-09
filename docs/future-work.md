# CAGE — Future Work

Items noted during development that aren't needed for v1 but should be built before launch.

---

## Account Deletion Confirmation Email

**Priority:** Pre-launch
**Trigger:** After successful account deletion via `DELETE /auth/account`

Send a confirmation email via Resend after the account is fully deleted. Contents:

- Confirm the account and all associated data has been permanently removed
- Clarify what was deleted: email address, verification status, per-partner anonymous IDs (sub hashes)
- Reassure the user: CAGE never stored government IDs, face scans, or exact dates of birth — there is nothing lingering
- Note that Veriff handles its own data retention separately (link to their privacy policy)
- "This is an automated message — no need to reply"

Implementation notes:
- Must send the email *before* deleting the user row (need the email address)
- Fire-and-forget — don't block deletion if the email fails to send
- Consider a simple branded HTML template consistent with the magic link email

---

## Token Renewal Flow

**Priority:** Post-v1

Users whose verification has expired (12 months) should be able to re-verify without starting from scratch. The dashboard should detect expired status and prompt re-verification. No new Veriff session needed if the original is still valid on Veriff's side — TBD based on Veriff's API capabilities.

---

## Missing DOB Handling in Production

**Priority:** Pre-launch

Veriff's sandbox/test mode returns `dateOfBirth: null` even on approved verifications. Currently we default to `ageFloor: 18` when DOB is missing. In production with real government IDs, Veriff should reliably extract DOB — but we need a strategy for edge cases where it doesn't:

- Option A: Require DOB — decline the verification and prompt the user to re-verify with a clearer document
- Option B: Flag for manual review — mark as approved but flag the record so an admin can investigate
- Option C: Keep the default of 18 — accept the risk that some 21+ users get under-classified

Decision needed before launch. The current default-to-18 behavior is fine for development and testing.

---

## Age Floor Upgrade (18 → 21)

**Priority:** Post-v1

Users who originally verified at 18+ and have since turned 21 should be able to upgrade their age floor. This avoids a full re-verification — compute the new age floor from the original date of birth stored in the verification record. Requires a lightweight confirmation flow, not a new Veriff session.
