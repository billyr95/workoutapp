"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Something went wrong");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      router.push("/auth/sign-in");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto min-h-screen flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-[var(--red)]">Training Log</div>
          <h1 className="font-display text-4xl leading-none mt-1">Create Account</h1>
        </div>
        <form onSubmit={handleSubmit} className="card">
          <div className="mb-3">
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="mb-3">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="mb-3">
            <input
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && <p className="font-mono text-xs text-[var(--red)] mb-3">{error}</p>}
          <button type="submit" className="btn w-full" disabled={loading}>
            {loading ? "Creating account…" : "Sign Up"}
          </button>
        </form>
        <p className="text-center font-mono text-xs text-[var(--muted)] mt-4">
          Already have an account? <Link href="/auth/sign-in" className="text-[var(--chalk)] underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
