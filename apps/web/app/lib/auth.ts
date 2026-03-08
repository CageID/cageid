import { cookies } from "next/headers";

const API_BASE = process.env["API_BASE_URL"] ?? "http://localhost:3001";

interface VerifyStatusResponse {
  status: "pending" | "approved" | "declined" | "none";
}

interface AuthCheckResult {
  authenticated: false;
}

interface AuthCheckSuccess {
  authenticated: true;
  verification: VerifyStatusResponse;
}

export type AuthResult = AuthCheckResult | AuthCheckSuccess;

/**
 * Checks if the current request has a valid session by forwarding
 * the cage_session cookie to the Hono server.
 *
 * Returns authentication status and verification info if authenticated.
 */
export async function checkAuth(): Promise<AuthResult> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("cage_session");

  if (!sessionCookie) {
    return { authenticated: false };
  }

  try {
    const res = await fetch(`${API_BASE}/verify/status`, {
      headers: {
        cookie: `cage_session=${sessionCookie.value}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { authenticated: false };
    }

    const data = (await res.json()) as VerifyStatusResponse;
    return { authenticated: true, verification: data };
  } catch {
    return { authenticated: false };
  }
}
