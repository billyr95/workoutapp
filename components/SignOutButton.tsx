"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/auth/sign-in" })}
      className="btn-ghost !py-1.5 !px-3 !text-[11px] rounded shrink-0"
    >
      Sign Out
    </button>
  );
}
