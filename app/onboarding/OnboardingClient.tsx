"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import StarterProgramCard, { type StarterProgram } from "@/components/StarterProgramCard";

export default function OnboardingClient() {
  const router = useRouter();
  const [programs, setPrograms] = useState<StarterProgram[] | null>(null);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/starter-programs")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setPrograms(json);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function applyProgram(id: number) {
    setApplyingId(id);
    setError(null);
    const res = await fetch(`/api/starter-programs/${id}/apply`, { method: "POST" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Couldn't set up that program — try again.");
      setApplyingId(null);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto min-h-screen px-5 py-8">
      <div className="text-center mb-6">
        <BrandLogo className="h-8 w-auto mx-auto" />
        <h1 className="font-display text-3xl leading-none mt-3">Set Up Your Training</h1>
        <p className="font-label text-xs text-[var(--muted)] mt-2">Start from a proven program, or build your own from scratch.</p>
      </div>

      {error && <p className="font-label text-xs text-[var(--red)] text-center mb-3">{error}</p>}

      <button className="btn w-full mb-5" onClick={() => router.push("/schedule?newProgram=1")}>
        Build Your Own
      </button>

      <div className="section-label mb-3">Or Start From a Template</div>

      {!programs ? (
        <div className="card text-center text-[var(--muted)] font-label text-xs">Loading templates…</div>
      ) : (
        programs.map((p) => (
          <StarterProgramCard
            key={p.id}
            program={p}
            actionLabel="Use This Program"
            using={applyingId === p.id}
            onUse={() => applyProgram(p.id)}
          />
        ))
      )}
    </div>
  );
}
