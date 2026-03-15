import { redirect } from "next/navigation";
import { checkAuth } from "../../lib/auth";

export default async function VerifyPage() {
  const auth = await checkAuth();
  if (!auth.authenticated) {
    redirect("/login");
  }

  // Redirect to the server's verify/start endpoint which creates a Veriff session
  redirect("/api/verify/start");
}
