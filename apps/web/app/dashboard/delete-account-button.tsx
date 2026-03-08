"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteAccountButton() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/account", { method: "DELETE" });
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (!showModal) {
    return (
      <button
        onClick={() => setShowModal(true)}
        className="text-sm text-cage-mid underline underline-offset-2 hover:text-cage-error transition-colors"
      >
        Delete account
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-cage-error/30 bg-cage-error/5 p-4 dark:bg-cage-error/10">
      <p className="text-sm text-cage-dark dark:text-cage-text-dark mb-3">
        This will permanently delete your account and all verification data.
        Type <span className="font-mono font-semibold">DELETE</span> to
        confirm.
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="Type DELETE"
        className="w-full rounded-lg border border-cage-error/30 bg-white px-3 py-2 text-sm text-cage-text placeholder:text-cage-mid focus:outline-none focus:ring-2 focus:ring-cage-error dark:bg-cage-bg-dark dark:text-cage-text-dark mb-3"
      />
      {error && <p className="text-sm text-cage-error mb-3">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={confirmText !== "DELETE" || loading}
          className="rounded-lg bg-cage-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cage-error/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Deleting\u2026" : "Delete my account"}
        </button>
        <button
          onClick={() => {
            setShowModal(false);
            setConfirmText("");
            setError("");
          }}
          className="rounded-lg border border-cage-border px-4 py-2 text-sm text-cage-mid transition-colors hover:bg-cage-mid/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
