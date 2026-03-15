import Link from "next/link";
import { CageLogo } from "../components/cage-logo";

const NAV_LINK = {
  fontFamily: "var(--font-syne)",
  fontWeight: 650,
  letterSpacing: "1px",
  fontSize: "0.8em",
} as const;

const GLASS_CODE = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(160,255,87,0.15)",
} as const;

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.07)",
} as const;

const docSections = [
  { id: "quick-start", label: "Quick Start" },
  { id: "step-1", label: "1. Register as a partner" },
  { id: "step-2", label: "2. Redirect to CAGE" },
  { id: "step-3", label: "3. Exchange the code" },
  { id: "step-4", label: "4. Read the claims" },
  { id: "verify-tokens", label: "Verify tokens" },
  { id: "user-flow", label: "User flow" },
  { id: "configuration", label: "Configuration" },
  { id: "help", label: "Need help?" },
];

function CodeBlock({ filename, code }: { filename?: string; code: string }) {
  return (
    <div className="rounded-xl overflow-hidden my-4" style={GLASS_CODE}>
      {filename && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-cage-accent/10"
          style={{ background: "rgba(160,255,87,0.04)" }}>
          <span className="text-xs text-cage-mid" style={{ fontFamily: "var(--font-geist-mono)" }}>
            {filename}
          </span>
        </div>
      )}
      <pre className="p-4 text-sm overflow-x-auto" style={{ fontFamily: "var(--font-geist-mono)", lineHeight: 1.7 }}>
        <code className="text-cage-text-dark/90">{code}</code>
      </pre>
    </div>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code
      className="text-cage-accent px-1 rounded"
      style={{ fontFamily: "var(--font-geist-mono)", background: "rgba(160,255,87,0.08)" }}
    >
      {children}
    </code>
  );
}

function ParamTable({ rows }: { rows: { param: string; desc: string }[] }) {
  return (
    <div className="rounded-xl overflow-hidden my-4" style={GLASS}>
      {rows.map(({ param, desc }, i) => (
        <div key={param} className={`flex gap-4 px-4 py-3 text-sm ${i < rows.length - 1 ? "border-b border-cage-accent/5" : ""}`}>
          <code className="text-cage-accent shrink-0 w-40" style={{ fontFamily: "var(--font-geist-mono)" }}>{param}</code>
          <span className="text-cage-mid">{desc}</span>
        </div>
      ))}
    </div>
  );
}

export default function DocsPage() {
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

      {/* ─── Hero band ────────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center overflow-hidden pt-28 pb-16 min-h-[30vh]">
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
            Integrate CAGE in minutes.
          </h1>
          <p className="text-lg text-cage-mid max-w-xl mx-auto leading-relaxed" style={{ letterSpacing: "-0.3px" }}>
            Standard OAuth 2.0 / OpenID Connect. If you&apos;ve integrated &quot;Sign in with Google&quot;, you already know how this works.
          </p>
        </div>
      </section>

      {/* ─── Two-column layout ────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="lg:flex lg:gap-16">

          {/* Sticky sidebar — desktop only */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-36">
              <p className="text-xs text-cage-mid mb-4" style={NAV_LINK}>ON THIS PAGE</p>
              <nav className="space-y-1">
                {docSections.map((s) => (
                  <a key={s.id} href={`#${s.id}`}
                    className="block text-sm text-cage-mid hover:text-cage-accent transition-colors py-1">
                    {s.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-20 pt-2">

            {/* Quick Start */}
            <section id="quick-start">
              <p className="text-xs text-cage-accent mb-3" style={NAV_LINK}>QUICK START</p>
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                Four steps to age verification
              </h2>
              <p className="text-cage-mid text-sm leading-relaxed">
                CAGE implements standard OAuth 2.0 with OpenID Connect extensions. The flow is identical to any OAuth provider: redirect, callback, token exchange, claims read.
              </p>
            </section>

            {/* Step 1 */}
            <section id="step-1">
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                1. Register as a partner
              </h2>
              <p className="text-cage-mid text-sm leading-relaxed mb-4">
                Contact us at <a href="mailto:partners@cageid.app" className="text-cage-text-dark hover:text-cage-accent transition-colors">partners@cageid.app</a> to get your credentials. Self-serve registration is coming soon.
              </p>
              <p className="text-cage-mid text-sm mb-3">You&apos;ll receive:</p>
              <CodeBlock filename="credentials" code={`client_id:     cage_partner_abc123\nclient_secret: sk_live_xxxxxxxxxxxx`} />
              <p className="text-cage-mid text-sm mt-3">
                Keep your <InlineCode>client_secret</InlineCode> secure — treat it like a password. Never expose it in client-side code.
              </p>
            </section>

            {/* Step 2 */}
            <section id="step-2">
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                2. Redirect to CAGE
              </h2>
              <p className="text-cage-mid text-sm leading-relaxed mb-4">
                When a user needs to verify their age, redirect them to the CAGE authorization endpoint:
              </p>
              <CodeBlock code={`GET https://api.cageid.app/oauth/authorize\n  ?client_id=YOUR_CLIENT_ID\n  &redirect_uri=https://yoursite.com/callback\n  &response_type=code\n  &state=RANDOM_STATE_STRING\n  &scope=openid age_verification`} />
              <ParamTable rows={[
                { param: "client_id", desc: "Your partner client ID from registration" },
                { param: "redirect_uri", desc: "Must be pre-registered and match exactly" },
                { param: "response_type", desc: "Always code" },
                { param: "state", desc: "Random string — verify on callback to prevent CSRF" },
                { param: "scope", desc: "Always openid age_verification" },
              ]} />
            </section>

            {/* Step 3 */}
            <section id="step-3">
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                3. Exchange the code for a token
              </h2>
              <p className="text-cage-mid text-sm leading-relaxed mb-4">
                After the user authenticates, CAGE redirects back to your <InlineCode>redirect_uri</InlineCode> with a short-lived auth code. Exchange it server-side:
              </p>
              <CodeBlock code={`POST https://api.cageid.app/oauth/token\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=authorization_code\n&code=AUTH_CODE_FROM_CALLBACK\n&redirect_uri=https://yoursite.com/callback\n&client_id=YOUR_CLIENT_ID\n&client_secret=YOUR_CLIENT_SECRET`} />
              <p className="text-cage-mid text-sm my-4">Response:</p>
              <CodeBlock filename="response.json" code={`{\n  "id_token": "eyJhbGciOiJSUzI1NiIs...",\n  "token_type": "Bearer"\n}`} />
              <p className="text-cage-mid text-sm mt-3">Auth codes expire after 60 seconds and are single-use.</p>
            </section>

            {/* Step 4 */}
            <section id="step-4">
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                4. Read the claims
              </h2>
              <p className="text-cage-mid text-sm leading-relaxed mb-4">
                Decode and verify the ID token (see <a href="#verify-tokens" className="text-cage-text-dark hover:text-cage-accent transition-colors">Verify tokens</a> below). The decoded payload:
              </p>
              <CodeBlock filename="id_token (decoded)" code={`{\n  "iss": "https://api.cageid.app",\n  "sub": "anon_partner_scoped_hash",\n  "aud": "YOUR_CLIENT_ID",\n  "age_verified": true,\n  "age_floor": 18,\n  "iat": 1741910400,\n  "exp": 1741996800\n}`} />
              <ParamTable rows={[
                { param: "sub", desc: "Anonymous user ID — unique per partner. Cannot be correlated across partners." },
                { param: "age_verified", desc: "Always true if the token was issued." },
                { param: "age_floor", desc: "18 or 21 — matches your registered age requirement." },
                { param: "iss", desc: "Token issuer — always https://api.cageid.app" },
                { param: "aud", desc: "Your client_id" },
                { param: "iat / exp", desc: "Standard issued-at and expiry timestamps." },
              ]} />
            </section>

            {/* Verify tokens */}
            <section id="verify-tokens">
              <p className="text-xs text-cage-accent mb-3" style={NAV_LINK}>SECURITY</p>
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                Verify tokens
              </h2>
              <p className="text-cage-mid text-sm leading-relaxed mb-4">
                Always verify the JWT signature before trusting the claims. Use any standard OIDC/JWT library (<InlineCode>jose</InlineCode>, <InlineCode>jsonwebtoken</InlineCode>, etc.) with CAGE&apos;s public keys.
              </p>
              <ParamTable rows={[
                { param: "JWKS endpoint", desc: "https://api.cageid.app/oauth/.well-known/jwks.json" },
                { param: "Discovery doc", desc: "https://api.cageid.app/oauth/.well-known/openid-configuration" },
              ]} />
              <p className="text-cage-mid text-sm mt-3">
                Verify: signature, <InlineCode>iss</InlineCode>, <InlineCode>aud</InlineCode> (must equal your client_id), and <InlineCode>exp</InlineCode>.
              </p>
            </section>

            {/* User flow */}
            <section id="user-flow">
              <p className="text-xs text-cage-accent mb-3" style={NAV_LINK}>OVERVIEW</p>
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                User flow
              </h2>
              <div className="space-y-3">
                {[
                  "User clicks \u2018Verify Age\u2019 on your site",
                  "Browser redirects to CAGE authorization endpoint",
                  "User logs in and consents \u2014 or the CAGE browser extension handles it silently",
                  "CAGE redirects back to your redirect_uri with an auth code",
                  "Your server exchanges the code for an ID token",
                  "Your server reads the age_verified and age_floor claims",
                ].map((step, i) => (
                  <div key={step} className="flex items-start gap-4">
                    <span className="text-xs text-cage-dark bg-cage-accent rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                    <p className="text-cage-mid text-sm leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Configuration */}
            <section id="configuration">
              <p className="text-xs text-cage-accent mb-3" style={NAV_LINK}>REFERENCE</p>
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                Configuration
              </h2>
              <div className="space-y-4 text-cage-mid text-sm leading-relaxed">
                <div>
                  <p className="text-cage-text-dark font-medium mb-1">Redirect URIs</p>
                  <p>Must be pre-registered with CAGE and match exactly — including trailing slashes and protocol. No wildcards.</p>
                </div>
                <div>
                  <p className="text-cage-text-dark font-medium mb-1">Age floor</p>
                  <p>Set during partner registration. Either 18 or 21. Contact us to change it.</p>
                </div>
                <div>
                  <p className="text-cage-text-dark font-medium mb-1">Refresh tokens</p>
                  <p>Not supported at this time. Users re-authenticate when their session expires.</p>
                </div>
                <div>
                  <p className="text-cage-text-dark font-medium mb-1">Auth code expiry</p>
                  <p>60 seconds. Single-use. Exchange immediately after receiving.</p>
                </div>
              </div>
            </section>

            {/* Help */}
            <section id="help">
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-geist-sans)", letterSpacing: "-0.03em" }}>
                Need help?
              </h2>
              <div className="space-y-3 text-cage-mid text-sm leading-relaxed">
                <p>Email us at <a href="mailto:partners@cageid.app" className="text-cage-text-dark hover:text-cage-accent transition-colors">partners@cageid.app</a> — we respond to integration questions within one business day.</p>
                <p>The server source code is <a href="https://github.com/CageID/cageid" className="text-cage-text-dark hover:text-cage-accent transition-colors">open source on GitHub</a> if you want to inspect the exact endpoint behavior.</p>
              </div>
            </section>

          </div>
        </div>
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
