import Link from "next/link";
import { checkAuth } from "../lib/auth";
import { CageLogo } from "../components/cage-logo";

export default async function LandingPageV2() {
  const auth = await checkAuth();
  const isLoggedIn = auth.authenticated;

  return (
    <div className="bg-cage-bg-dark text-cage-text-dark min-h-screen" style={{ letterSpacing: "-0.5px" }}>
      {/* ─── Nav ──────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cage-bg-dark/80"
        style={{ borderBottom: "1px solid transparent", backgroundImage: "linear-gradient(var(--color-cage-bg-dark), var(--color-cage-bg-dark)), linear-gradient(to right, transparent, rgba(160,255,87,0.3), transparent)", backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box" }}>
        <div className="max-w-6xl mx-auto px-6 h-28 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <CageLogo className="h-24 w-auto transition-all group-hover:[filter:drop-shadow(0_0_8px_rgba(160,255,87,0.5))]" />
          </Link>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block"
              style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}>
              HOW IT WORKS
            </a>
            <a href="#for-partners" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block"
              style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}>
              PARTNERS
            </a>
            <a href="#trust" className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block"
              style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}>
              TRUST
            </a>
            {isLoggedIn ? (
              <Link href="/dashboard" className="text-sm text-cage-dark bg-cage-accent px-4 py-2 rounded-lg hover:brightness-110 transition"
                style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}>
                DASHBOARD
              </Link>
            ) : (
              <Link href="/login" className="text-sm text-cage-dark bg-cage-accent px-4 py-2 rounded-lg hover:brightness-110 transition"
                style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}>
                SIGN IN
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Section 1: Hero ──────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28">
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(160,255,87,0.12) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
          }}
        />

        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(160,255,87,0.07) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <h1
            className="font-bold leading-[1.05] mb-8"
            style={{
              fontFamily: "var(--font-geist-sans)",
              letterSpacing: "-0.04em",
              fontSize: "clamp(3.5rem, 9vw, 8rem)",
              fontWeight: 800,
            }}
          >
            Stop uploading your ID
            <br />
            <span className="text-cage-accent">to every website.</span>
          </h1>

          <p className="text-xl sm:text-2xl text-cage-mid max-w-xl mx-auto mb-12 leading-relaxed" style={{ letterSpacing: "-0.5px" }}>
            Verify your age once. Use it everywhere.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-3.5 text-base text-cage-dark rounded-xl hover:brightness-110 transition-all"
                style={{
                  fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em",
                  background: "linear-gradient(135deg, #a0ff57, #6dff00)",
                  boxShadow: "0 0 50px rgba(160,255,87,0.35), 0 0 20px rgba(160,255,87,0.15)",
                }}
              >
                DASHBOARD
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-3.5 text-base text-cage-dark rounded-xl hover:brightness-110 transition-all"
                style={{
                  fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em",
                  background: "linear-gradient(135deg, #a0ff57, #6dff00)",
                  boxShadow: "0 0 50px rgba(160,255,87,0.35), 0 0 20px rgba(160,255,87,0.15)",
                }}
              >
                GET VERIFIED
              </Link>
            )}
            <a
              href="#"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base text-cage-mid border border-cage-mid/30 rounded-xl hover:border-cage-accent/50 hover:text-cage-text-dark transition-all"
              style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
            >
              INSTALL EXTENSION
            </a>
            <a
              href="#for-partners"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base text-cage-mid border border-cage-mid/30 rounded-xl hover:border-cage-accent/50 hover:text-cage-text-dark transition-all"
              style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
            >
              FOR PARTNERS
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cage-mid/40">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
      </section>
    </div>
  );
}
