// apps/server/src/routes/oauth.ts
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { getJwks, generateAuthCode } from "../services/token.service.js";
import {
  findActivePartner,
  validateRedirectUri,
} from "../services/partner.service.js";
import { redis } from "../lib/redis.js";
import { db } from "../db/index.js";
import { partnerSubs } from "../db/schema.js";
import { randomUUID } from "crypto";

export const oauthRoutes = new Hono();

const ISSUER = process.env["OIDC_ISSUER"] ?? "https://cageid.app";

// ─── OIDC Discovery ────────────────────────────────────────────────────────

oauthRoutes.get("/.well-known/openid-configuration", (c) => {
  return c.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/oauth/authorize`,
    token_endpoint: `${ISSUER}/oauth/token`,
    jwks_uri: `${ISSUER}/oauth/.well-known/jwks.json`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    claims_supported: [
      "sub",
      "iss",
      "aud",
      "exp",
      "iat",
      "age_verified",
      "age_floor",
    ],
  });
});

// ─── JWKS ──────────────────────────────────────────────────────────────────

oauthRoutes.get("/.well-known/jwks.json", async (c) => {
  const jwks = await getJwks();
  return c.json(jwks);
});

// ─── Authorize ─────────────────────────────────────────────────────────────

oauthRoutes.get("/authorize", async (c) => {
  const { client_id, redirect_uri, state, response_type } = c.req.query();

  // 1. Basic param validation
  if (!client_id || !redirect_uri || !response_type) {
    return c.text("Missing required parameters: client_id, redirect_uri, response_type", 400);
  }
  if (response_type !== "code") {
    return c.text("Unsupported response_type. Only 'code' is supported.", 400);
  }

  // 2. Validate partner — show error page on failure, never redirect (untrusted redirect_uri)
  const partner = await findActivePartner(client_id);
  if (!partner) {
    return c.html("<h1>Error</h1><p>Unknown or inactive client</p>", 400);
  }
  if (!validateRedirectUri(partner, redirect_uri)) {
    return c.html("<h1>Error</h1><p>Invalid redirect URI</p>", 400);
  }

  // 3. Check session cookie — redirect_uri is trusted from this point on
  const sessionId = getCookie(c, "cage_session");
  if (!sessionId) {
    return c.redirect(`/login?next=${encodeURIComponent(c.req.url)}`);
  }
  const session = await redis.get<{ userId: string }>(`session:${sessionId}`);
  if (!session?.userId) {
    return c.redirect(`/login?next=${encodeURIComponent(c.req.url)}`);
  }
  const userId = session.userId;

  // 4. Check verification status
  const verification = await db.query.verifications.findFirst({
    where: (v, { eq, and, gt }) =>
      and(
        eq(v.userId, userId),
        eq(v.status, "approved"),
        gt(v.expiresAt!, new Date())
      ),
    orderBy: (v, { desc }) => [desc(v.createdAt)],
  });

  if (!verification) {
    // Store OAuth params in session for flow resumption after verification
    await redis.set(
      `session:${sessionId}`,
      { userId, pending_oauth: { client_id, redirect_uri, state } },
      { ex: 1800 }
    );
    return c.redirect("/verify");
  }

  // 5. Age floor check
  if ((verification.ageFloor ?? 0) < partner.ageFloorRequired) {
    const url = new URL(redirect_uri);
    url.searchParams.set("error", "access_denied");
    if (state) url.searchParams.set("state", state);
    return c.redirect(url.toString());
  }

  // 6. Check for existing partner_subs (consent already granted)
  const existingSub = await db.query.partnerSubs.findFirst({
    where: (ps, { eq, and }) =>
      and(eq(ps.userId, userId), eq(ps.partnerId, partner.id)),
  });

  if (!existingSub) {
    // First visit — store consent state in Redis and show consent page
    const consentToken = randomUUID();
    await redis.set(
      `oauth_consent:${consentToken}`,
      { userId, partnerId: partner.id, redirectUri: redirect_uri, state },
      { ex: 300 }
    );
    return c.html(consentPage(partner.name, consentToken));
  }

  return issueAuthCode(c, userId, partner.id, redirect_uri, state ?? "");
});

// ─── Consent POST ──────────────────────────────────────────────────────────

oauthRoutes.post("/consent", async (c) => {
  const body = await c.req.parseBody();
  const consentToken = body["consent_token"] as string;

  if (!consentToken) {
    return c.text("Missing consent_token", 400);
  }

  const stored = await redis.get<{
    userId: string;
    partnerId: string;
    redirectUri: string;
    state: string;
  }>(`oauth_consent:${consentToken}`);

  if (!stored) {
    return c.html(
      "<h1>Error</h1><p>Consent session expired. Please return to the partner site and try again.</p>",
      400
    );
  }

  // Single-use: delete immediately
  await redis.del(`oauth_consent:${consentToken}`);

  // Create partner_subs row — permanent record of consent
  await db.insert(partnerSubs).values({
    userId: stored.userId,
    partnerId: stored.partnerId,
    subHash: randomUUID(),
  });

  return issueAuthCode(c, stored.userId, stored.partnerId, stored.redirectUri, stored.state ?? "");
});

// ─── Helpers ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function issueAuthCode(c: any, userId: string, partnerId: string, redirectUri: string, state: string) {
  const code = generateAuthCode();
  await redis.set(
    `oauth_code:${code}`,
    { userId, partnerId, redirectUri },
    { ex: 60 }
  );
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  return c.redirect(url.toString());
}

function consentPage(partnerName: string, consentToken: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>CAGE — Share Age Verification</title></head>
<body>
  <h1>Share your age verification</h1>
  <p><strong>${partnerName}</strong> is requesting confirmation of your age verification.</p>
  <p>CAGE will share only that you are age-verified and your age bracket. No other personal information is shared.</p>
  <form method="POST" action="/oauth/consent">
    <input type="hidden" name="consent_token" value="${consentToken}" />
    <button type="submit">Confirm — share age verification</button>
  </form>
  <p><a href="javascript:history.back()">Cancel</a></p>
</body>
</html>`;
}
