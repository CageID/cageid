"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL = 2000;
const MAX_FAILURES = 10;

export function PollingStatus() {
  const router = useRouter();
  const [message, setMessage] = useState(
    "Verifying your identity\u2026 This usually takes just a moment."
  );
  const [showSpinner, setShowSpinner] = useState(true);
  const [showRetry, setShowRetry] = useState(false);
  const failureCount = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startPolling() {
    setShowRetry(false);
    setShowSpinner(true);
    setMessage(
      "Verifying your identity\u2026 This usually takes just a moment."
    );
    failureCount.current = 0;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/verify/status");

        if (!res.ok) {
          if (res.status === 401) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            router.push("/login");
            return;
          }
          throw new Error("Non-OK response");
        }

        failureCount.current = 0;
        const data = (await res.json()) as { status: string };

        if (data.status === "approved") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setMessage("Verification successful! Redirecting\u2026");
          router.push("/dashboard");
          return;
        }

        if (data.status === "declined") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setShowSpinner(false);
          setMessage("Verification was not successful.");
          return;
        }
      } catch {
        failureCount.current++;
        if (failureCount.current >= MAX_FAILURES) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setShowSpinner(false);
          setShowRetry(true);
          setMessage(
            "Connection lost. Please check your internet connection."
          );
        }
      }
    }, POLL_INTERVAL);
  }

  useEffect(() => {
    startPolling();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="py-16 text-center">
      {showSpinner && (
        <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-[3px] border-cage-border border-t-cage-dark dark:border-cage-mid/30 dark:border-t-cage-accent" />
      )}

      <p className="text-sm text-cage-mid mb-4">{message}</p>

      {showRetry && (
        <button
          onClick={startPolling}
          className="rounded-lg bg-cage-dark px-4 py-2.5 text-sm font-medium text-cage-accent transition-colors hover:bg-cage-dark/90"
        >
          Retry
        </button>
      )}

      {!showSpinner && !showRetry && (
        <a
          href="/dashboard"
          className="inline-block rounded-lg bg-cage-dark px-4 py-2.5 text-sm font-medium text-cage-accent transition-colors hover:bg-cage-dark/90"
        >
          Go to dashboard
        </a>
      )}
    </div>
  );
}
