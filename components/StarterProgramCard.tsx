"use client";

import { useState } from "react";
import type { ProgramData } from "@/db/schema";
import Chevron from "./Chevron";

export type StarterProgram = { id: number; slug: string; name: string; level: string; daysPerWeek: number; data: ProgramData };

// Shared by the onboarding picker and the program builder's "Prebuilt Workouts" tab — click
// the header to expand the day-by-day schedule (with each day's exercises) before committing.
export default function StarterProgramCard({
  program,
  actionLabel,
  onUse,
  using,
}: {
  program: StarterProgram;
  actionLabel: string;
  onUse: () => void;
  using: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const workoutNames = program.data.workouts.map((w) => w.name);

  return (
    <div className="card !py-3 !px-4 mb-2.5">
      <button type="button" className="w-full text-left" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-start justify-between gap-3 mb-1">
          <span className="font-display text-lg leading-tight flex items-center gap-1.5">
            {program.name}
            <Chevron open={expanded} className="text-[var(--muted)]" />
          </span>
          <span className="font-label text-[10px] uppercase tracking-wide text-[var(--muted)] whitespace-nowrap shrink-0 mt-1">
            {program.daysPerWeek}x/week · {program.level}
          </span>
        </div>
        <p className="font-label text-[11px] text-[var(--chalk-dim)]">{workoutNames.join(" · ")}</p>
      </button>

      {expanded && (
        <div className="grid gap-2 mt-3">
          {program.data.schedule.map((s) => {
            const workout = program.data.workouts.find((w) => w.name === s.workoutType);
            return (
              <div key={s.day} className="card !py-2.5 !px-3 !bg-[var(--surface2)]">
                <div className="flex justify-between items-center">
                  <span className="font-display text-base w-24">{s.day}</span>
                  <span className="font-label text-xs text-[var(--chalk-dim)]">
                    {s.workoutType}{s.category ? ` · ${s.category}` : ""}
                  </span>
                </div>
                {workout && workout.exercises.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-[var(--line)]">
                    {workout.exercises.map((ex) => (
                      <div key={ex.name} className="font-label text-[11px] text-[var(--chalk-dim)]">
                        {ex.name} — {ex.sets}×{ex.repMin}{ex.repMax !== ex.repMin ? `-${ex.repMax}` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button className="btn-ghost w-full rounded mt-3" onClick={onUse} disabled={using}>
        {using ? "Setting up…" : actionLabel}
      </button>
    </div>
  );
}
