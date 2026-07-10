"use client";

import { useState } from "react";
import { useAppData } from "@/lib/useAppData";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SchedulePage() {
  const { data, loading, refetch } = useAppData();
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sets: "", repMin: "", repMax: "" });

  if (loading || !data) return <p className="font-mono text-sm text-[var(--muted)]">Loading…</p>;

  const today = DAYS[new Date().getDay()];
  const editingSched = editingDay ? data.schedule.find((s) => s.day === editingDay) : null;
  const editingWorkout = editingSched ? data.workouts.find((w) => w.name === editingSched.workoutType) : null;

  async function addExercise() {
    if (!editingWorkout) return;
    if (!form.name || !form.sets || !form.repMin) return;
    await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workoutId: editingWorkout.id,
        name: form.name,
        sets: Number(form.sets),
        repMin: Number(form.repMin),
        repMax: Number(form.repMax || form.repMin),
      }),
    });
    setForm({ name: "", sets: "", repMin: "", repMax: "" });
    await refetch();
  }

  async function removeExercise(id: number) {
    await fetch("/api/exercises", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refetch();
  }

  return (
    <div>
      <div className="section-label mb-3">Weekly Split</div>
      <div className="grid gap-2">
        {DAYS.map((d) => {
          const sched = data.schedule.find((s) => s.day === d);
          const label = sched ? `${sched.workoutType}${sched.category ? " · " + sched.category : ""}` : "Unscheduled";
          return (
            <button
              key={d}
              onClick={() => setEditingDay(d)}
              className={`flex justify-between items-center card !py-3 !px-3.5 text-left ${d === (editingDay ?? today) ? "!border-[var(--red)]" : ""}`}
            >
              <span className="font-display text-lg w-24">{d}</span>
              <span className="font-mono text-xs text-[var(--chalk-dim)]">{label}</span>
            </button>
          );
        })}
      </div>

      {editingDay && (
        <div className="mt-6">
          <div className="section-label mb-3">Editing — {editingDay}</div>
          {editingSched?.category && editingWorkout ? (
            <div className="card">
              <div className="font-display text-xl mb-2">{editingWorkout.name}</div>
              {editingWorkout.exercises.map((ex) => (
                <div key={ex.id} className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[13px] flex-[2]">{ex.name}</span>
                  <span className="font-mono text-xs text-[var(--chalk-dim)] flex-1">
                    {ex.sets}×{ex.repMin}-{ex.repMax}
                  </span>
                  <span
                    className="text-[var(--muted)] hover:text-[var(--red)] cursor-pointer font-mono text-sm px-1.5"
                    onClick={() => removeExercise(ex.id)}
                  >
                    ✕
                  </span>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <input placeholder="Exercise name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input type="number" placeholder="Sets" className="max-w-[70px]" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} />
                <input type="number" placeholder="Min reps" className="max-w-[80px]" value={form.repMin} onChange={(e) => setForm({ ...form, repMin: e.target.value })} />
                <input type="number" placeholder="Max reps" className="max-w-[80px]" value={form.repMax} onChange={(e) => setForm({ ...form, repMax: e.target.value })} />
              </div>
              <div className="flex gap-2 mt-2.5">
                <button className="btn !py-1.5 !px-3 !text-[11px]" onClick={addExercise}>Add Exercise</button>
                <button className="btn-ghost !py-1.5 !px-3 !text-[11px] rounded" onClick={() => setEditingDay(null)}>Close</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="card text-center text-[var(--muted)] font-mono text-xs">
                {editingSched ? editingSched.workoutType : "Rest"} day — nothing to edit.
              </div>
              <button className="btn-ghost !py-1.5 !px-3 !text-[11px] rounded mt-2.5" onClick={() => setEditingDay(null)}>Close</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
