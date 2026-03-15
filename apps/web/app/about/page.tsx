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
            How it&apos;s built
          </h2>
          <div className="space-y-4 text-cage-mid leading-relaxed" style={{ letterSpacing: "-0.2px" }}>
            <p>CAGE uses a trusted third party — <a href="https://veriff.com" className="text-cage-text-dark hover:text-cage-accent transition-colors">Veriff</a> — to check your government ID. CAGE never receives the document itself. Veriff processes it, confirms your age, and discards the data on their own schedule.</p>
            <p>CAGE stores only the result: you&apos;re 18+ or 21+. No name. No birthdate. No document images. Just a flag.</p>
            <p>When a website needs to confirm your age, CAGE issues a signed token confirming the result — anonymously. The site never learns who you are, and it can&apos;t connect your identity to any other site you&apos;ve verified through.</p>
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
            <p>CAGE is an early-stage project built by a small team. We&apos;re moving fast and building in the open.</p>
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
