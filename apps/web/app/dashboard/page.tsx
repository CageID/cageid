import { redirect } from "next/navigation";
import Link from "next/link";
import { checkAuth } from "../lib/auth";
import { DeleteAccountButton } from "./delete-account-button";
import { SignOutButton } from "./sign-out-button";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cage-accent/15 px-2.5 py-0.5 text-xs font-medium text-cage-dark dark:text-cage-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-cage-accent" />
          Verified
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cage-amber/15 px-2.5 py-0.5 text-xs font-medium text-cage-amber">
          <span className="h-1.5 w-1.5 rounded-full bg-cage-amber" />
          Verification in progress
        </span>
      );
    case "declined":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cage-error/15 px-2.5 py-0.5 text-xs font-medium text-cage-error">
          <span className="h-1.5 w-1.5 rounded-full bg-cage-error" />
          Verification unsuccessful
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cage-mid/15 px-2.5 py-0.5 text-xs font-medium text-cage-mid">
          <span className="h-1.5 w-1.5 rounded-full bg-cage-mid" />
          Not yet verified
        </span>
      );
  }
}

export default async function DashboardPage() {
  const auth = await checkAuth();
  if (!auth.authenticated) {
    redirect("/login");
  }

  const { status } = auth.verification;
  const needsVerification = status === "none" || status === "declined";

  return (
    <div className="py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-cage-dark dark:text-cage-text-dark mb-1">
          Dashboard
        </h1>
        <p className="text-sm text-cage-mid">Your CAGE verification status</p>
      </div>

      {/* Status card */}
      <div className="rounded-xl border border-cage-border bg-white p-6 dark:bg-cage-dark/30 dark:border-cage-mid/20 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-cage-dark dark:text-cage-text-dark">
            Age Verification
          </span>
          <StatusBadge status={status} />
        </div>

        {status === "approved" && (
          <div className="space-y-2 text-sm text-cage-mid">
            <p>
              Your age has been verified. Partner sites can confirm you meet
              their age requirements.
            </p>
          </div>
        )}

        {status === "pending" && (
          <p className="text-sm text-cage-mid">
            Your verification is being processed. This usually takes just a
            moment.
          </p>
        )}

        {needsVerification && (
          <div>
            <p className="text-sm text-cage-mid mb-4">
              {status === "declined"
                ? "Your previous verification was unsuccessful. You can try again."
                : "Verify your age to start using CAGE with partner sites."}
            </p>
            <Link
              href="/api/verify/start"
              className="inline-block rounded-lg bg-cage-dark px-4 py-2.5 text-sm font-medium text-cage-accent transition-colors hover:bg-cage-dark/90"
            >
              {status === "declined" ? "Try again" : "Verify your age"}
            </Link>
          </div>
        )}
      </div>

      {/* Account actions */}
      <div className="flex items-center justify-between pt-4">
        <SignOutButton />
        <DeleteAccountButton />
      </div>
    </div>
  );
}
