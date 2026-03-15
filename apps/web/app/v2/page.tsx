import Link from "next/link";
import { checkAuth } from "../lib/auth";
import { CageLogo } from "../components/cage-logo";

export default async function LandingPageV2() {
  const auth = await checkAuth();
  const isLoggedIn = auth.authenticated;

  return (
    <div className="bg-cage-bg-dark text-cage-text-dark min-h-screen" style={{ letterSpacing: "-0.5px" }}>
      <p className="text-cage-accent p-8">v2 scaffold — replace me</p>
    </div>
  );
}
