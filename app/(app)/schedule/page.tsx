"use client";

import { useEffect, useState } from "react";
import { useAppData } from "@/lib/useAppData";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type DayType = "Rest" | "Cardio" | "Workout";
type DayForm = { type: DayType; name: string; category: "Strength" | "Hypertrophy" };
type SavedProgram = { id: number; name: string; createdAt: string };

function dayFormFor(sched: { workoutType: string; category: string | null } | undefined): DayForm {
  if (!sched || sched.workoutType === "Rest") return { type: "Rest", name: "", category: "Strength" };
  if (sched.workoutType === "Cardio") return { type: "Cardio", name: "", category: "Strength" };
  return { type: "Workout", name: sched.workoutType, category: (sched.category as "Strength" | "Hypertrophy") || "Strength" };
}

export default function SchedulePage() {
  const { data, loading, refetch } = useAppData();
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sets: "", repMin: "", repMax: "" });
  const [dayForm, setDayForm] = useState<DayForm>({ type: "Rest", name: "", category: "Strength" });
  const [savingDay, setSavingDay] = useState(false);

  const [programs, setPrograms] = useState<SavedProgram[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [programName, setProgramName] = useState("");
  const [savingProgram, setSavingProgram] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [loadingProgram, setLoadingProgram] = useState(false);

  useEffect(() => {
    fetch("/api/programs")
      .then((res) => res.json())
      .then(setPrograms);
  }, []);

  const editingSched = data && editingDay ? data.schedule.find((s) => s.day === editingDay) : null;
  const editingWorkout = data && editingSched ? data.workouts.find((w) => w.name === editingSched.workoutType) : null;
  const isConfigurableWorkout = !!(editingSched?.category && editingWorkout);

  if (loading || !data) return <p className="font-mono text-sm text-[var(--muted)]">Loading…</p>;

  const today = DAYS[new Date().getDay()];

  function selectDay(d: string) {
    setEditingDay(d);
    setDayForm(dayFormFor(data!.schedule.find((s) => s.day === d)));
  }

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

  async function saveDay() {
    if (!editingDay) return;
    if (dayForm.type === "Workout" && !dayForm.name.trim()) return;
    setSavingDay(true);
    await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day: editingDay,
        type: dayForm.type,
        name: dayForm.name,
        category: dayForm.category,
      }),
    });
    setSavingDay(false);
    await refetch();
  }

  async function saveProgram() {
    if (!programName.trim()) return;
    setSavingProgram(true);
    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: programName.trim() }),
    });
    const saved = await res.json();
    setPrograms((prev) => [saved, ...prev]);
    setProgramName("");
    setShowSaveForm(false);
    setSavingProgram(false);
  }

  async function loadProgram() {
    if (!selectedProgramId) return;
    setLoadingProgram(true);
    await fetch("/api/programs/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: Number(selectedProgramId) }),
    });
    setLoadingProgram(false);
    await refetch();
  }

  async function deleteProgram(id: number) {
    await fetch("/api/programs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setPrograms((prev) => prev.filter((p) => p.id !== id));
    if (selectedProgramId === String(id)) setSelectedProgramId("");
  }

  return (
    <div>
      <div className="section-label mb-3 flex items-center justify-between !gap-3">
        <span>Programs</span>
        <button
          className="btn-ghost !py-1 !px-2.5 !text-[11px] normal-case tracking-normal rounded shrink-0"
          onClick={() => setShowSaveForm((v) => !v)}
        >
          Save Program
        </button>
      </div>
      <div className="card mb-3.5">
        {showSaveForm && (
          <div className="flex gap-2 mb-2.5">
            <input
              placeholder="Program name (e.g. Push Pull Legs)"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
            />
            <button className="btn !py-1.5 !px-3 !text-[11px] shrink-0" onClick={saveProgram} disabled={savingProgram}>
              {savingProgram ? "Saving…" : "Save"}
            </button>
          </div>
        )}

        {programs.length === 0 ? (
          <p className="font-mono text-xs text-[var(--muted)]">No saved programs yet.</p>
        ) : (
          <div className="flex gap-2">
            <select value={selectedProgramId} onChange={(e) => setSelectedProgramId(e.target.value)} className="flex-1">
              <option value="">Select a saved program…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              className="btn !py-1.5 !px-3 !text-[11px] shrink-0"
              onClick={loadProgram}
              disabled={!selectedProgramId || loadingProgram}
            >
              {loadingProgram ? "Loading…" : "Load"}
            </button>
            {selectedProgramId && (
              <span
                className="text-[var(--muted)] hover:text-[var(--red)] cursor-pointer font-mono text-sm px-1 self-center"
                onClick={() => deleteProgram(Number(selectedProgramId))}
                title="Delete this saved program"
              >
                ✕
              </span>
            )}
          </div>
        )}
      </div>

      <div className="section-label mb-3">Weekly Split</div>
      <div className="grid gap-2">
        {DAYS.map((d) => {
          const sched = data.schedule.find((s) => s.day === d);
          const label = sched ? `${sched.workoutType}${sched.category ? " · " + sched.category : ""}` : "Unscheduled";
          return (
            <button
              key={d}
              onClick={() => selectDay(d)}
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

          <div className="card mb-3">
            <div className="flex gap-2 mb-3">
              {(["Rest", "Cardio", "Workout"] as DayType[]).map((t) => (
                <button
                  key={t}
                  className={`btn-ghost !py-1.5 !px-3 !text-[11px] rounded flex-1 ${dayForm.type === t ? "!border-[var(--red)] !text-[var(--chalk)]" : ""}`}
                  onClick={() => setDayForm({ ...dayForm, type: t })}
                >
                  {t}
                </button>
              ))}
            </div>

            {dayForm.type === "Workout" && (
              <div className="flex gap-2 mb-1">
                <input
                  placeholder="Workout name (e.g. Upper A)"
                  value={dayForm.name}
                  onChange={(e) => setDayForm({ ...dayForm, name: e.target.value })}
                />
                <select
                  value={dayForm.category}
                  onChange={(e) => setDayForm({ ...dayForm, category: e.target.value as "Strength" | "Hypertrophy" })}
                  className="max-w-[140px]"
                >
                  <option value="Strength">Strength</option>
                  <option value="Hypertrophy">Hypertrophy</option>
                </select>
              </div>
            )}
            {dayForm.type === "Workout" && (
              <p className="font-mono text-[10px] text-[var(--muted)] mb-2">
                Reuses one of your existing workouts if the name matches exactly.
              </p>
            )}

            <button className="btn !py-1.5 !px-3 !text-[11px] mt-1" onClick={saveDay} disabled={savingDay}>
              {savingDay ? "Saving…" : "Save Day"}
            </button>
          </div>

          {isConfigurableWorkout && editingWorkout ? (
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
            <button className="btn-ghost !py-1.5 !px-3 !text-[11px] rounded" onClick={() => setEditingDay(null)}>Close</button>
          )}
        </div>
      )}
    </div>
  );
}
