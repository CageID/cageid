import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "CAGE — Confirmed Age, Granted Entry",
  description: "Verify your age once. Access everywhere.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="py-6 text-center">
            <a href="/" className="text-xl font-semibold tracking-tight text-cage-dark dark:text-cage-text-dark">
              CAGE
            </a>
          </header>

          {/* Main content — narrow centered column */}
          <main className="flex-1 flex items-start justify-center px-4 pb-16">
            <div className="w-full max-w-md">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="py-6 text-center text-sm text-cage-mid">
            CAGE — Confirmed Age, Granted Entry
          </footer>
        </div>
      </body>
    </html>
  );
}
