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
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.04em" }}>Terms of Service</h1>
          <p className="text-sm text-cage-mid mb-4">Last updated: March 2026</p>
          <p className="text-cage-mid leading-relaxed">
            The short version: use CAGE honestly, and we&apos;ll do our best to keep it running and your data safe.
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

        <section id="what-cage-is">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>What CAGE is</h2>
          <div className="space-y-3 text-cage-mid leading-relaxed text-sm">
            <p>CAGE is an age verification service. We confirm that users meet a minimum age threshold (18+ or 21+) and share that result with partner websites via standard OAuth 2.0 / OpenID Connect.</p>
            <p>We are not an identity provider in the traditional sense — we don&apos;t store or share personal identity information. We store only that a verification occurred and its outcome.</p>
          </div>
        </section>

        <section id="accounts">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>Accounts</h2>
          <ul className="space-y-2 text-cage-mid text-sm">
            {[
              "You need a valid email address to create an account",
              "One account per person",
              "You\u2019re responsible for keeping your login credentials secure",
              "You must be at least 13 years old to create an account (your verification will confirm your age status)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-cage-accent mt-0.5 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="acceptable-use">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>Acceptable use</h2>
          <div className="text-cage-mid text-sm">
            <p className="mb-3">The following are not permitted:</p>
            <ul className="space-y-2">
              {[
                "Attempting to fraudulently verify your age",
                "Using someone else\u2019s identity documents",
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
          <ul className="space-y-2 text-cage-mid text-sm">
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
        </section>

        <section id="availability">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>Availability</h2>
          <div className="space-y-3 text-cage-mid leading-relaxed text-sm">
            <p>We aim for high availability but do not guarantee 100% uptime. SLA guarantees are only available on Enterprise plans.</p>
            <p>We&apos;ll communicate planned downtime in advance when possible.</p>
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
            <p>CAGE is provided &quot;as is&quot; without warranty of any kind. We are not liable for any indirect, incidental, or consequential damages arising from use of the service.</p>
            <p>We are not liable for partner sites&apos; decisions made based on age verification results, or for any actions taken by partner sites against their users.</p>
            <p>Our total liability to you for any claims arising from use of CAGE shall not exceed the amounts you paid us in the three months preceding the claim.</p>
          </div>
        </section>

        <section id="changes">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>Changes</h2>
          <div className="space-y-3 text-cage-mid leading-relaxed text-sm">
            <p>We may update these terms from time to time. Continued use of CAGE after changes are posted constitutes acceptance of the updated terms.</p>
            <p>We&apos;ll notify registered users by email for material changes.</p>
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
