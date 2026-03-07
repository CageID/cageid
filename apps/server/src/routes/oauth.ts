// apps/server/src/routes/oauth.ts
import { Hono } from "hono";
import { getJwks } from "../services/token.service.js";

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
