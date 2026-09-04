import { redirect } from "next/navigation";
import { auth } from "@/auth";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/sign-in");

  return <OnboardingClient />;
}
