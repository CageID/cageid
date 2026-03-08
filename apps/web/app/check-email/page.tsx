import Link from "next/link";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const email =
    typeof params["email"] === "string" ? params["email"] : "your email";

  return (
    <div className="py-16 text-center">
      <div className="mb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cage-dark/10 dark:bg-cage-accent/10">
          <svg
            className="h-6 w-6 text-cage-dark dark:text-cage-accent"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-cage-dark dark:text-cage-text-dark mb-2">
          Check your inbox
        </h1>
        <p className="text-sm text-cage-mid">
          We sent a sign-in link to{" "}
          <span className="font-medium text-cage-dark dark:text-cage-text-dark">
            {email}
          </span>
          .
        </p>
      </div>

      <div className="rounded-xl border border-cage-border bg-white p-6 dark:bg-cage-dark/30 dark:border-cage-mid/20">
        <p className="text-sm text-cage-mid mb-4">
          Click the link in the email to sign in. The link expires in 15
          minutes.
        </p>
        <p className="text-sm text-cage-mid">
          Didn&apos;t get it?{" "}
          <Link
            href="/login"
            className="font-medium text-cage-dark underline underline-offset-2 hover:text-cage-accent dark:text-cage-text-dark"
          >
            Try again
          </Link>
        </p>
      </div>
    </div>
  );
}
