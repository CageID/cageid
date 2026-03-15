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
    </div>
  );
}
