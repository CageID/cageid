import Link from "next/link";
import { CageLogo } from "../components/cage-logo";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="py-6 flex justify-center">
        <Link href="/">
          <CageLogo className="h-[100px] w-auto" />
        </Link>
      </header>

      {/* Main content — narrow centered column */}
      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-cage-mid">
        CAGE — Confirmed Age, Granted Entry
      </footer>
    </div>
  );
}
