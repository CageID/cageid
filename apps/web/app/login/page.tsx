import { Suspense } from "react";
import { redirect } from "next/navigation";
import { checkAuth } from "../lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const auth = await checkAuth();

  // If already logged in and there's a `next` URL (e.g. from OAuth flow),
  // redirect through the web proxy so the session cookie is included.
  if (auth.authenticated && params.next) {
    const appBase = process.env["APP_BASE_URL"] ?? "http://localhost:3001";
    if (params.next.startsWith(appBase)) {
      const nextPath = params.next.slice(appBase.length);
      redirect(`/api${nextPath}`);
    }
    redirect(params.next);
  }

  // If already logged in with no next, go to dashboard
  if (auth.authenticated) {
    redirect("/dashboard");
  }

  return (
    <div className="py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-cage-dark dark:text-cage-text-dark mb-2">
          Sign in to CAGE
        </h1>
        <p className="text-sm text-cage-mid">
          Enter your email and we&apos;ll send you a sign-in link.
        </p>
      </div>

      <div className="rounded-xl border border-cage-border bg-white p-6 dark:bg-cage-dark/30 dark:border-cage-mid/20">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-xs text-cage-mid">
        No password needed — we&apos;ll email you a secure link.
      </p>
    </div>
  );
}
