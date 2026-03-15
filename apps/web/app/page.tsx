import Link from "next/link";
import { checkAuth } from "./lib/auth";
import { CageLogo } from "./components/cage-logo";

// ─── ASCII Birdcage ──────────────────────────────────────────────────────────
const ASCII_CAGE = `
                            ___
                          /  |  \\
                        /    |    \\
                      /      |      \\
                    /________|________\\
                   |  |            |  |
                   |  |            |  |
                   |  |    .--.    |  |
                   |  |   /    \\   |  |
                   |  |  |      |  |  |
                   |  |  |      |  |  |
                   |  |   \\    /   |  |
                   |  |    '--'    |  |
                   |  |            |  |
                   |  |    .--.    |  |
                   |  |   /    \\   |  |
                   |  |  |      |  |  |
                   |  |  |      |  |  |
                   |  |   \\    /   |  |
                   |  |    '--'    |  |
                   |  |            |  |
                   |  |    .--.    |  |
                   |  |   /    \\   |  |
                   |  |  |      |  |  |
                   |  |  |      |  |  |
                   |  |   \\    /   |  |
                   |  |    '--'    |  |
                   |  |            |  |
                   |__|____________|__|
                  /                    \\
                 /______________________\\
`;

export default async function LandingPage() {
  const auth = await checkAuth();
  const isLoggedIn = auth.authenticated;

  return (
    <div className="bg-cage-bg-dark text-cage-text-dark min-h-screen" style={{ letterSpacing: "-0.5px" }}>
      {/* ─── Nav ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cage-bg-dark/80 border-b border-cage-accent/10">
        <div className="max-w-6xl mx-auto px-6 h-28 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <CageLogo className="h-24 w-auto" />
          </Link>
          <div className="flex items-center gap-6">
            <a
              href="#how-it-works"
              className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block"
              style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
            >
              HOW IT WORKS
            </a>
            <a
              href="#for-partners"
              className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block"
              style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
            >
              PARTNERS
            </a>
            <a
              href="#trust"
              className="text-sm text-cage-mid hover:text-cage-text-dark transition-colors hidden sm:block"
              style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
            >
              TRUST
            </a>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="text-sm text-cage-dark bg-cage-accent px-4 py-2 rounded-lg hover:brightness-110 transition"
                style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
              >
                DASHBOARD
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm text-cage-dark bg-cage-accent px-4 py-2 rounded-lg hover:brightness-110 transition"
                style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
              >
                SIGN IN
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Section 1: Hero ──────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* ASCII art background */}
        <pre
          className="absolute inset-0 flex items-center justify-center text-cage-accent pointer-events-none select-none leading-tight"
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "clamp(6px, 1.1vw, 14px)",
            opacity: 0.07,
            letterSpacing: "0px",
          }}
          aria-hidden="true"
        >
          {ASCII_CAGE}
        </pre>

        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(160, 255, 87, 0.04) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
            style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-2px" }}
          >
            Stop uploading your ID
            <br />
            <span className="text-cage-accent">to every website.</span>
          </h1>

          <p className="text-lg sm:text-xl text-cage-mid max-w-xl mx-auto mb-10 leading-relaxed" style={{ letterSpacing: "-0.5px" }}>
            Verify your age once. Use it everywhere.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-3.5 text-base text-cage-dark bg-cage-accent rounded-xl hover:brightness-110 transition-all shadow-[0_0_30px_rgba(160,255,87,0.2)]"
                style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
              >
                DASHBOARD
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-3.5 text-base text-cage-dark bg-cage-accent rounded-xl hover:brightness-110 transition-all shadow-[0_0_30px_rgba(160,255,87,0.2)]"
                style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
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
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-cage-mid/40"
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ─── Section 2: How It Works ──────────────────────────── */}
      <section id="how-it-works" className="py-24 sm:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-sm uppercase tracking-[0.2em] text-cage-accent mb-4 text-center"
            style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
          >
            HOW IT WORKS
          </h2>
          <p className="text-3xl sm:text-4xl font-bold text-center mb-16 max-w-2xl mx-auto" style={{ letterSpacing: "-1px" }}>
            Three steps. Sixty seconds. Never again.
          </p>

          <div className="grid md:grid-cols-3 gap-8 md:gap-4 relative">
            {/* Connecting line (desktop only) — spans between step circle centers */}
            <div
              className="hidden md:block absolute h-px bg-gradient-to-r from-cage-accent/30 via-cage-accent/50 to-cage-accent/30"
              style={{
                top: "24px",
                left: "calc(100% / 6)",
                right: "calc(100% / 6)",
              }}
            />

            {/* Step 1 */}
            <div className="relative text-center group">
              <div className="w-12 h-12 rounded-full bg-[#2a370a] border border-cage-accent/30 flex items-center justify-center mx-auto mb-6 text-cage-accent font-mono text-lg font-bold group-hover:bg-[#354510] transition-colors relative z-10">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Verify once</h3>
              <p className="text-sm text-cage-mid leading-relaxed">
                Scan your government ID through our secure partner Veriff. Takes
                60 seconds.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center group">
              <div className="w-12 h-12 rounded-full bg-[#2a370a] border border-cage-accent/30 flex items-center justify-center mx-auto mb-6 text-cage-accent font-mono text-lg font-bold group-hover:bg-[#354510] transition-colors relative z-10">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">
                CAGE forgets your ID
              </h3>
              <p className="text-sm text-cage-mid leading-relaxed">
                We store only that you&apos;re 18+ or 21+. No name, no
                birthday, no document.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center group">
              <div className="w-12 h-12 rounded-full bg-[#2a370a] border border-cage-accent/30 flex items-center justify-center mx-auto mb-6 text-cage-accent font-mono text-lg font-bold group-hover:bg-[#354510] transition-colors relative z-10">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Use it everywhere</h3>
              <p className="text-sm text-cage-mid leading-relaxed">
                Sites check your age instantly and anonymously. You never
                re-verify.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 3: For Users ─────────────────────────────── */}
      <section className="py-24 sm:py-32 px-6 border-t border-cage-accent/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2
                className="text-sm uppercase tracking-[0.2em] text-cage-accent mb-4"
                style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
              >
                FOR USERS
              </h2>
              <p className="text-3xl sm:text-4xl font-bold mb-6 leading-tight" style={{ letterSpacing: "-1px" }}>
                Your ID is none of
                <br />
                their business.
              </p>
              <div className="space-y-4 text-cage-mid leading-relaxed">
                <p>
                  One verification works across every partner site. Install the
                  browser extension and never see a verification screen again.
                </p>
                <p>
                  No personal data is ever shared with any site — they only
                  learn that you meet their age requirement. Nothing else.
                </p>
                <p>
                  Delete your account and everything disappears. No traces, no
                  records, no data broker honeypots.
                </p>
              </div>
            </div>

            {/* What partners actually receive */}
            <div className="relative">
              <div className="absolute -inset-4 bg-cage-accent/5 rounded-2xl blur-xl" />
              <div className="relative bg-[#0d0f00] border border-cage-accent/20 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-cage-accent/5 border-b border-cage-accent/10">
                  <div className="w-2.5 h-2.5 rounded-full bg-cage-error/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-cage-amber/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-cage-accent/60" />
                  <span className="ml-2 text-xs text-cage-mid/60 font-mono" style={{ letterSpacing: "0px" }}>
                    decoded_token.json
                  </span>
                </div>
                <pre className="p-6 text-sm leading-relaxed font-mono overflow-x-auto" style={{ letterSpacing: "0px" }}>
                  <code>
                    <span className="text-cage-mid/50">{"{"}</span>
                    {"\n"}
                    <span className="text-cage-mid/50">{"  "}</span>
                    <span className="text-cage-accent/80">
                      &quot;age_verified&quot;
                    </span>
                    <span className="text-cage-mid/50">: </span>
                    <span className="text-green-400">true</span>
                    <span className="text-cage-mid/50">,</span>
                    {"\n"}
                    <span className="text-cage-mid/50">{"  "}</span>
                    <span className="text-cage-accent/80">
                      &quot;age_floor&quot;
                    </span>
                    <span className="text-cage-mid/50">:{" "}</span>
                    <span className="text-amber-300">18</span>
                    <span className="text-cage-mid/50">,</span>
                    {"\n"}
                    <span className="text-cage-mid/50">{"  "}</span>
                    <span className="text-cage-accent/80">
                      &quot;sub&quot;
                    </span>
                    <span className="text-cage-mid/50">:{" "}</span>
                    <span className="text-cage-mid/70">
                      &quot;anon_d945ddc7...&quot;
                    </span>
                    {"\n"}
                    <span className="text-cage-mid/50">{"}"}</span>
                  </code>
                </pre>
                <div className="px-6 pb-4">
                  <p className="text-xs text-cage-mid/40 font-mono" style={{ letterSpacing: "0px" }}>
                    ↑ That&apos;s it. That&apos;s all they get.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 4: For Partners ──────────────────────────── */}
      <section
        id="for-partners"
        className="py-24 sm:py-32 px-6 border-t border-cage-accent/5"
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Code snippet */}
            <div className="relative order-2 lg:order-1">
              <div className="absolute -inset-4 bg-cage-accent/5 rounded-2xl blur-xl" />
              <div className="relative bg-[#0d0f00] border border-cage-accent/20 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-cage-accent/5 border-b border-cage-accent/10">
                  <div className="w-2.5 h-2.5 rounded-full bg-cage-error/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-cage-amber/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-cage-accent/60" />
                  <span className="ml-2 text-xs text-cage-mid/60 font-mono" style={{ letterSpacing: "0px" }}>
                    integration.js
                  </span>
                </div>
                <pre className="p-6 text-sm leading-relaxed font-mono overflow-x-auto" style={{ letterSpacing: "0px" }}>
                  <code>
                    <span className="text-cage-mid/50">
                      {"// Add age-gating in 3 lines"}
                    </span>
                    {"\n"}
                    <span className="text-purple-400">const</span>{" "}
                    <span className="text-cage-text-dark">url</span>{" "}
                    <span className="text-cage-mid/50">=</span>
                    {"\n"}
                    {"  "}
                    <span className="text-amber-300">
                      {"`https://cageid.app/api/oauth/authorize"}
                    </span>
                    {"\n"}
                    {"  "}
                    <span className="text-amber-300">
                      {"?client_id=${CLIENT_ID}"}
                    </span>
                    {"\n"}
                    {"  "}
                    <span className="text-amber-300">
                      {"&response_type=code`"}
                    </span>
                    <span className="text-cage-mid/50">;</span>
                    {"\n\n"}
                    <span className="text-purple-400">window</span>
                    <span className="text-cage-mid/50">.</span>
                    <span className="text-cage-text-dark">location</span>
                    <span className="text-cage-mid/50">.</span>
                    <span className="text-cage-text-dark">href</span>{" "}
                    <span className="text-cage-mid/50">=</span>{" "}
                    <span className="text-cage-text-dark">url</span>
                    <span className="text-cage-mid/50">;</span>
                  </code>
                </pre>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2
                className="text-sm uppercase tracking-[0.2em] text-cage-accent mb-4"
                style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
              >
                FOR PARTNERS
              </h2>
              <p className="text-3xl sm:text-4xl font-bold mb-6 leading-tight" style={{ letterSpacing: "-1px" }}>
                Add age verification in minutes, not months.
              </p>
              <div className="space-y-4 text-cage-mid leading-relaxed mb-8">
                <p>
                  Standard OAuth 2.0 / OpenID Connect. If your platform supports
                  &ldquo;Sign in with Google,&rdquo; it supports CAGE.
                </p>
                <p>
                  No sensitive data to store or protect. No liability. Two age
                  tiers: 18+ and 21+.
                </p>
                <p>Works with any platform, any language, any framework.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="#"
                  className="inline-flex items-center justify-center px-6 py-3 text-sm text-cage-dark bg-cage-accent rounded-xl hover:brightness-110 transition-all"
                  style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
                >
                  READ THE DOCS
                </a>
                <a
                  href="#"
                  className="inline-flex items-center justify-center px-6 py-3 text-sm text-cage-mid border border-cage-mid/30 rounded-xl hover:border-cage-accent/50 hover:text-cage-text-dark transition-all"
                  style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
                >
                  GET API ACCESS
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 5: Trust ─────────────────────────────────── */}
      <section
        id="trust"
        className="py-24 sm:py-32 px-6 border-t border-cage-accent/5"
      >
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-sm uppercase tracking-[0.2em] text-cage-accent mb-4 text-center"
            style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
          >
            TRUST
          </h2>
          <p className="text-3xl sm:text-4xl font-bold text-center mb-4 max-w-2xl mx-auto" style={{ letterSpacing: "-1px" }}>
            Making the internet safer for young people.
          </p>
          <p className="text-cage-mid text-center max-w-2xl mx-auto mb-16 leading-relaxed">
            Age verification should be universal and private — not a choice
            between safety and surveillance. CAGE proves you can have both.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Column 1: CAGE stores */}
            <div className="bg-cage-accent/5 border border-cage-accent/15 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-cage-accent"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <h3 className="font-semibold text-cage-accent">CAGE stores</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "Anonymous ID",
                  "Age bracket (18+ / 21+)",
                  "Verification timestamp",
                  "Per-site anonymous tokens",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-cage-accent mt-0.5 shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-cage-text-dark/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Processed then deleted */}
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-amber-400"
                >
                  <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <h3 className="font-semibold text-amber-400">
                  Processed, then deleted
                </h3>
              </div>
              <ul className="space-y-3">
                {[
                  "ID document images",
                  "Selfie video",
                  "Personal details",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-amber-400 mt-0.5 shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-cage-text-dark/80">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-cage-mid/60 leading-relaxed">
                Handled by Veriff. Never touches CAGE servers.
              </p>
            </div>

            {/* Column 3: Never collected */}
            <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-red-400"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <h3 className="font-semibold text-red-400">Never collected</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "Your name",
                  "Birthday",
                  "Address",
                  "Face data",
                  "Browsing history",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-red-400 mt-0.5 shrink-0"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span className="text-cage-text-dark/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 6: Footer CTA ────────────────────────────── */}
      <section className="py-24 sm:py-32 px-6 border-t border-cage-accent/5">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-3xl sm:text-4xl font-bold mb-8" style={{ letterSpacing: "-1px" }}>
            Ready to verify once?
          </p>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-10 py-4 text-base text-cage-dark bg-cage-accent rounded-xl hover:brightness-110 transition-all shadow-[0_0_40px_rgba(160,255,87,0.15)]"
              style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
            >
              GO TO DASHBOARD
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-10 py-4 text-base text-cage-dark bg-cage-accent rounded-xl hover:brightness-110 transition-all shadow-[0_0_40px_rgba(160,255,87,0.15)]"
              style={{ fontFamily: "var(--font-syne)", fontWeight: 650, letterSpacing: "1px", fontSize: "0.8em" }}
            >
              GET STARTED
            </Link>
          )}
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────── */}
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
