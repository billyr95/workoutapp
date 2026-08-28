"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GoogleButton from "@/components/GoogleButton";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, email, password }),
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/repra-full-logo.svg" alt="Repra" className="h-8 w-auto mx-auto" />
          <h1 className="font-display text-4xl leading-none mt-3">Create Account</h1>
        </div>
        <GoogleButton />
        <p className="text-center font-label text-[10px] text-[var(--muted)] mt-2.5 leading-relaxed">
          By continuing with Google you agree to our{" "}
          <Link href="/terms" className="text-[var(--chalk-dim)] underline">Terms</Link> and{" "}
          <Link href="/privacy" className="text-[var(--chalk-dim)] underline">Privacy Policy</Link>.
        </p>
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[var(--line)]" />
          <span className="font-label text-[10px] tracking-[0.15em] uppercase text-[var(--muted)]">or</span>
          <div className="flex-1 h-px bg-[var(--line)]" />
        </div>
        <form onSubmit={handleSubmit} className="card">
          <div className="mb-3">
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="mb-3">
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              pattern="[a-z0-9_]{3,20}"
              title="3-20 characters: lowercase letters, numbers, underscores"
            />
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
          <label className="flex items-start gap-2 mb-3 font-label text-[11px] text-[var(--chalk-dim)] leading-snug cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              required
              className="!w-auto mt-0.5 shrink-0"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="text-[var(--chalk)] underline" onClick={(e) => e.stopPropagation()}>Terms of Service</Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-[var(--chalk)] underline" onClick={(e) => e.stopPropagation()}>Privacy Policy</Link>.
            </span>
          </label>
          {error && <p className="font-label text-xs text-[var(--red)] mb-3">{error}</p>}
          <button type="submit" className="btn w-full" disabled={loading || !agreed}>
            {loading ? "Creating account…" : "Sign Up"}
          </button>
        </form>
        <p className="text-center font-label text-xs text-[var(--muted)] mt-4">
          Already have an account? <Link href="/auth/sign-in" className="text-[var(--chalk)] underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
