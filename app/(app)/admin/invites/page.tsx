import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AdminInvitesClient from "./AdminInvitesClient";

export default async function AdminInvitesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/sign-in");
  if (!session.user.isAdmin) redirect("/");

  return (
    <div>
      <div className="section-label mb-3">Coach Invite Codes</div>
      <AdminInvitesClient />
    </div>
  );
}
