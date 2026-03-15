"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the request fails, clear client state
    }
    router.push("/");
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="text-sm text-cage-mid underline underline-offset-2 hover:text-cage-dark dark:hover:text-cage-text-dark transition-colors disabled:opacity-50"
    >
      {loading ? "Signing out\u2026" : "Sign out"}
    </button>
  );
}
