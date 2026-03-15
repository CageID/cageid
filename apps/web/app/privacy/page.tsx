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
            CAGE is designed to know as little about you as possible. Here&apos;s exactly what we collect, why, and how long we keep it.
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
            <p className="text-cage-text-dark font-medium pt-2">That&apos;s it. No name, no address, no government ID images, no biometric data.</p>
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
            <p>We&apos;ll update this page if anything changes. Major changes will be communicated via email to registered users.</p>
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
