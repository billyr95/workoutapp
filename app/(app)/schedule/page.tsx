"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppData } from "@/lib/useAppData";
import NewProgramModal from "./NewProgramModal";
import LoadingMark from "@/components/LoadingMark";
import Chevron from "@/components/Chevron";

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
  return (
    <Suspense fallback={null}>
      <ScheduleContent />
    </Suspense>
  );
}

function ScheduleContent() {
  const { data, refetch } = useAppData();
  const searchParams = useSearchParams();
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sets: "", repMin: "", repMax: "" });
  const [dayForm, setDayForm] = useState<DayForm>({ type: "Rest", name: "", category: "Strength" });
  const [savingDay, setSavingDay] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", sets: "", repMin: "", repMax: "" });
  const [savingExercise, setSavingExercise] = useState(false);

  const [programs, setPrograms] = useState<SavedProgram[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  // Coming from onboarding's "Build Your Own" opens this straight away instead of landing on
  // an otherwise-empty schedule with no obvious next step.
  const [showNewProgramModal, setShowNewProgramModal] = useState(() => searchParams.get("newProgram") === "1");
  const [programName, setProgramName] = useState("");
  const [savingProgram, setSavingProgram] = useState(false);
  // null = no explicit choice yet — default to whichever program is currently active
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(false);

  useEffect(() => {
    fetch("/api/programs")
      .then((res) => res.json())
      .then(setPrograms);
  }, []);

  const editingSched = data && editingDay ? data.schedule.find((s) => s.day === editingDay) : null;
  const editingWorkout = data && editingSched ? data.workouts.find((w) => w.name === editingSched.workoutType) : null;
  const isConfigurableWorkout = !!(editingSched?.category && editingWorkout);

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <LoadingMark className="h-10 w-auto" />
      </div>
    );
  }

  const today = DAYS[new Date().getDay()];
  const activeIdStr = data.user.activeProgramId != null ? String(data.user.activeProgramId) : null;
  const effectiveProgramId =
    selectedProgramId ?? (activeIdStr && programs.some((p) => String(p.id) === activeIdStr) ? activeIdStr : "");

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

  function startEditExercise(ex: { id: number; name: string; sets: number; repMin: number; repMax: number }) {
    setEditingExerciseId(ex.id);
    setEditForm({ name: ex.name, sets: String(ex.sets), repMin: String(ex.repMin), repMax: String(ex.repMax) });
  }

  async function saveExerciseEdit() {
    if (editingExerciseId == null || !editForm.name || !editForm.sets || !editForm.repMin) return;
    setSavingExercise(true);
    await fetch("/api/exercises", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingExerciseId,
        name: editForm.name,
        sets: Number(editForm.sets),
        repMin: Number(editForm.repMin),
        repMax: Number(editForm.repMax || editForm.repMin),
      }),
    });
    setSavingExercise(false);
    setEditingExerciseId(null);
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
    setSelectedProgramId(String(saved.id));
    setProgramName("");
    setShowSaveForm(false);
    setSavingProgram(false);
    await refetch();
  }

  async function loadProgram() {
    if (!effectiveProgramId) return;
    setLoadingProgram(true);
    await fetch("/api/programs/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: Number(effectiveProgramId) }),
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
    if (effectiveProgramId === String(id)) setSelectedProgramId("");
  }

  return (
    <div>
      <div className="section-label mb-3 flex items-center justify-between !gap-3">
        <span>Programs</span>
        <div className="flex gap-1.5 shrink-0">
          <button
            className="btn-ghost !py-1 !px-2.5 !text-[11px] normal-case tracking-normal rounded"
            onClick={() => setShowNewProgramModal(true)}
          >
            New Program
          </button>
          <button
            className="btn-ghost !py-1 !px-2.5 !text-[11px] normal-case tracking-normal rounded"
            onClick={() => setShowSaveForm((v) => !v)}
          >
            Save Current Setup
          </button>
        </div>
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
          <p className="font-label text-xs text-[var(--muted)]">No saved programs yet.</p>
        ) : (
          <div className="flex gap-2">
            <select value={effectiveProgramId} onChange={(e) => setSelectedProgramId(e.target.value)} className="flex-1">
              <option value="">Select a saved program…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {activeIdStr === String(p.id) ? " (current)" : ""}
                </option>
              ))}
            </select>
            <button
              className="btn !py-1.5 !px-3 !text-[11px] shrink-0"
              onClick={loadProgram}
              disabled={!effectiveProgramId || loadingProgram}
            >
              {loadingProgram ? "Loading…" : "Load"}
            </button>
            {effectiveProgramId && (
              <span
                className="text-[var(--muted)] hover:text-[var(--red)] cursor-pointer font-label text-sm px-1 self-center"
                onClick={() => deleteProgram(Number(effectiveProgramId))}
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
          const isEditing = d === editingDay;
          return (
            <div key={d} className={`card !py-3 !px-3.5 ${isEditing || (!editingDay && d === today) ? "!border-[var(--red)]" : ""}`}>
              <button
                type="button"
                onClick={() => (isEditing ? setEditingDay(null) : selectDay(d))}
                className="w-full flex justify-between items-center text-left"
              >
                <span className="font-display text-lg w-24">{d}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="font-label text-xs text-[var(--chalk-dim)]">{label}</span>
                  <Chevron open={isEditing} className="text-[var(--muted)]" />
                </span>
              </button>

              {isEditing && (
                <div className="mt-3 pt-3 border-t border-[var(--line)]">
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
                    <p className="font-label text-[10px] text-[var(--muted)] mb-2">
                      Reuses one of your existing workouts if the name matches exactly.
                    </p>
                  )}

                  <button className="btn !py-1.5 !px-3 !text-[11px] mt-1" onClick={saveDay} disabled={savingDay}>
                    {savingDay ? "Saving…" : "Save Day"}
                  </button>

                  {isConfigurableWorkout && editingWorkout ? (
                    <div className="mt-3 pt-3 border-t border-[var(--line)]">
                      <div className="font-display text-xl mb-2">{editingWorkout.name}</div>
                      {editingWorkout.exercises.map((ex) =>
                        editingExerciseId === ex.id ? (
                          <div key={ex.id} className="mb-2.5 p-2.5 rounded border border-[var(--line)]">
                            <input
                              placeholder="Exercise name"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="mb-2"
                            />
                            <div className="flex gap-2 mb-2">
                              <input type="number" placeholder="Sets" value={editForm.sets} onChange={(e) => setEditForm({ ...editForm, sets: e.target.value })} />
                              <input type="number" placeholder="Min reps" value={editForm.repMin} onChange={(e) => setEditForm({ ...editForm, repMin: e.target.value })} />
                              <input type="number" placeholder="Max reps" value={editForm.repMax} onChange={(e) => setEditForm({ ...editForm, repMax: e.target.value })} />
                            </div>
                            <div className="flex gap-2">
                              <button className="btn !py-1.5 !px-3 !text-[11px]" onClick={saveExerciseEdit} disabled={savingExercise}>
                                {savingExercise ? "Saving…" : "Save"}
                              </button>
                              <button className="btn-ghost !py-1.5 !px-3 !text-[11px] rounded" onClick={() => setEditingExerciseId(null)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div key={ex.id} className="flex items-center gap-2 mb-1.5">
                            <span className="font-label text-[13px] flex-[2]">{ex.name}</span>
                            <span className="font-label text-xs text-[var(--chalk-dim)] flex-1">
                              {ex.sets}×{ex.repMin}-{ex.repMax}
                            </span>
                            <span
                              className="font-label text-xs text-[var(--muted)] hover:text-[var(--chalk)] underline cursor-pointer shrink-0"
                              onClick={() => startEditExercise(ex)}
                            >
                              Edit
                            </span>
                            <span
                              className="text-[var(--muted)] hover:text-[var(--red)] cursor-pointer font-label text-sm pl-3 pr-1"
                              onClick={() => removeExercise(ex.id)}
                            >
                              ✕
                            </span>
                          </div>
                        )
                      )}
                      <div className="mt-3">
                        <input placeholder="Exercise name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mb-2" />
                        <div className="flex gap-2">
                          <input type="number" placeholder="Sets" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} />
                          <input type="number" placeholder="Min reps" value={form.repMin} onChange={(e) => setForm({ ...form, repMin: e.target.value })} />
                          <input type="number" placeholder="Max reps" value={form.repMax} onChange={(e) => setForm({ ...form, repMax: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2.5">
                        <button className="btn !py-1.5 !px-3 !text-[11px]" onClick={addExercise}>Add Exercise</button>
                        <button className="btn-ghost !py-1.5 !px-3 !text-[11px] rounded" onClick={() => setEditingDay(null)}>Close</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn-ghost !py-1.5 !px-3 !text-[11px] rounded mt-2.5" onClick={() => setEditingDay(null)}>Close</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNewProgramModal && (
        <NewProgramModal
          onClose={() => setShowNewProgramModal(false)}
          onSaved={(saved) => {
            setPrograms((prev) => [saved, ...prev]);
            setSelectedProgramId(String(saved.id));
          }}
          onLoaded={refetch}
        />
      )}
    </div>
  );
}
