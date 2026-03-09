export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const consentToken =
    typeof params["consent_token"] === "string" ? params["consent_token"] : "";
  const partnerName =
    typeof params["partner_name"] === "string"
      ? params["partner_name"]
      : "Unknown";

  if (!consentToken) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold text-cage-dark dark:text-cage-text-dark mb-2">
          Invalid request
        </h1>
        <p className="text-sm text-cage-mid">
          This consent link is missing required parameters. Please return to the
          partner site and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="mb-8 text-center">
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
              d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-cage-dark dark:text-cage-text-dark mb-2">
          Share your age verification
        </h1>
      </div>

      <div className="rounded-xl border border-cage-border bg-white p-6 dark:bg-cage-dark/30 dark:border-cage-mid/20">
        <p className="text-sm text-cage-mid mb-2">
          <span className="font-medium text-cage-dark dark:text-cage-text-dark">
            {partnerName}
          </span>{" "}
          is requesting confirmation of your age verification.
        </p>
        <p className="text-sm text-cage-mid mb-6">
          CAGE will share only that you are age-verified and your age bracket.
          No other personal information is shared.
        </p>

        <form action="/api/oauth/consent" method="POST">
          <input type="hidden" name="consent_token" value={consentToken} />
          <button
            type="submit"
            className="w-full cursor-pointer rounded-lg bg-cage-dark py-2.5 text-sm font-medium text-cage-accent transition-colors hover:bg-cage-dark/90"
          >
            Confirm — share age verification
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-cage-mid">
          <a
            href="javascript:history.back()"
            className="underline underline-offset-2 hover:text-cage-dark dark:hover:text-cage-text-dark transition-colors"
          >
            Cancel
          </a>
        </p>
      </div>
    </div>
  );
}
