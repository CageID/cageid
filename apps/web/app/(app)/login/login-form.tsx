"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload: Record<string, string> = { email };
      if (next) payload["next"] = next;

      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        setError("Too many requests. Please try again later.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-cage-dark dark:text-cage-text-dark mb-1"
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-cage-border bg-white px-3 py-2 text-cage-text placeholder:text-cage-mid focus:outline-none focus:ring-2 focus:ring-cage-dark dark:bg-cage-bg-dark dark:text-cage-text-dark dark:border-cage-mid/30"
        />
      </div>

      {error && <p className="text-sm text-cage-error">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-cage-dark py-2.5 text-sm font-medium text-cage-accent transition-colors hover:bg-cage-dark/90 disabled:bg-cage-mid disabled:text-cage-bg disabled:cursor-not-allowed"
      >
        {loading ? "Sending\u2026" : "Send sign-in link"}
      </button>
    </form>
  );
}
