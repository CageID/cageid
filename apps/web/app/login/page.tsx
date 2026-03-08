import { LoginForm } from "./login-form";

export default function LoginPage() {
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
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-cage-mid">
        No password needed — we&apos;ll email you a secure link.
      </p>
    </div>
  );
}
