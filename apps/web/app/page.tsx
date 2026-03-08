import { redirect } from "next/navigation";
import { checkAuth } from "./lib/auth";
import { LoginForm } from "./login/login-form";

export default async function Home() {
  const auth = await checkAuth();
  if (auth.authenticated) {
    redirect("/dashboard");
  }

  return (
    <div className="py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-cage-dark dark:text-cage-text-dark mb-2">
          Check Age, Go Everywhere
        </h1>
        <p className="text-sm text-cage-mid">
          Verify your age once. Access age-restricted sites without
          re-verifying.
        </p>
      </div>

      <div className="rounded-xl border border-cage-border bg-white p-6 dark:bg-cage-dark/30 dark:border-cage-mid/20">
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-cage-mid">
        No password needed — we&apos;ll email you a secure link.
      </p>
    </div>
  );
}
