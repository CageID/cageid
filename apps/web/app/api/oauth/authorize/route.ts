import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const API_BASE = process.env["API_BASE_URL"] ?? "http://localhost:3001";

/**
 * Proxies GET /api/oauth/authorize to the Hono server, explicitly
 * forwarding the cage_session cookie. The generic next.config.js rewrite
 * doesn't reliably forward httpOnly cookies to external domains on Vercel.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("cage_session");

  const url = new URL(request.url);
  const serverUrl = `${API_BASE}/oauth/authorize${url.search}`;

  const headers: Record<string, string> = {};
  if (sessionCookie) {
    headers["cookie"] = `cage_session=${sessionCookie.value}`;
  }

  const res = await fetch(serverUrl, {
    headers,
    redirect: "manual",
    cache: "no-store",
  });

  // Forward redirects back to the browser
  const location = res.headers.get("location");
  if (location && res.status >= 300 && res.status < 400) {
    return NextResponse.redirect(location, res.status);
  }

  // Forward HTML/text responses (e.g. error pages)
  const contentType = res.headers.get("content-type") ?? "text/plain";
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "content-type": contentType },
  });
}
