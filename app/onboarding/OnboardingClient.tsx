"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

type StarterProgram = {
  id: number;
  slug: string;
  name: string;
  level: string;
  daysPerWeek: number;
  workoutNames: string[];
};

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
          <div key={p.id} className="card !py-3 !px-4 mb-2.5">
            <div className="flex items-start justify-between gap-3 mb-1">
              <span className="font-display text-lg leading-tight">{p.name}</span>
              <span className="font-label text-[10px] uppercase tracking-wide text-[var(--muted)] whitespace-nowrap shrink-0 mt-1">
                {p.daysPerWeek}x/week · {p.level}
              </span>
            </div>
            <p className="font-label text-[11px] text-[var(--chalk-dim)] mb-3">{p.workoutNames.join(" · ")}</p>
            <button className="btn-ghost w-full rounded" onClick={() => applyProgram(p.id)} disabled={applyingId !== null}>
              {applyingId === p.id ? "Setting up…" : "Use This Program"}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
