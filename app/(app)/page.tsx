"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppData, Exercise } from "@/lib/useAppData";
import LoadingMark from "@/components/LoadingMark";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type DraftSet = { weight?: number; reps?: number };
type StoredDraft = { draft: Record<number, DraftSet[]>; skipped: Record<number, boolean> };

// In-progress sets are mirrored to localStorage as you go, keyed per workout+date,
// so a page reload mid-session doesn't wipe out what's already been logged.
function draftStorageKey(workoutId: number, date: string) {
  return `workout-draft:${workoutId}:${date}`;
}
function loadDraft(workoutId: number, date: string): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(draftStorageKey(workoutId, date));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveDraft(workoutId: number, date: string, data: StoredDraft) {
  try {
    window.localStorage.setItem(draftStorageKey(workoutId, date), JSON.stringify(data));
  } catch {}
}
function clearDraft(workoutId: number, date: string) {
  try {
    window.localStorage.removeItem(draftStorageKey(workoutId, date));
  } catch {}
}

export default function TodayPage() {
  const { data, loading, refetch } = useAppData();
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay()]);
  const [draft, setDraft] = useState<Record<number, DraftSet[]>>({});
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});
  const [loadedForWorkoutId, setLoadedForWorkoutId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [cardioForm, setCardioForm] = useState({ type: "", durationMinutes: "", distance: "", averageHeartRate: "", calories: "" });

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const sched = useMemo(
    () => data?.schedule.find((s) => s.day === selectedDay),
    [data, selectedDay]
  );
  const workout = useMemo(
    () => data?.workouts.find((w) => w.name === sched?.workoutType),
    [data, sched]
  );
  const workoutId = workout?.id ?? null;

  // Switching to a different workout loads whatever was already in progress for it today —
  // adjusted during render (not an effect) so it lands before the first paint of the new workout.
  if (workoutId !== null && workoutId !== loadedForWorkoutId) {
    const saved = loadDraft(workoutId, todayStr());
    setDraft(saved?.draft ?? {});
    setSkipped(saved?.skipped ?? {});
    setLoadedForWorkoutId(workoutId);
  }

  useEffect(() => {
    if (workoutId === null) return;
    saveDraft(workoutId, todayStr(), { draft, skipped });
  }, [workoutId, draft, skipped]);

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <LoadingMark className="h-10 w-auto" />
      </div>
    );
  }

  function lastSetsFor(exerciseId: number) {
    const logs = [...data!.workoutLogs].sort((a, b) => b.date.localeCompare(a.date));
    for (const log of logs) {
      const sets = log.sets.filter((s) => s.exerciseId === exerciseId).sort((a, b) => a.setNumber - b.setNumber);
      if (sets.length) return sets;
    }
    return null;
  }

  function prFor(name: string) {
    return data!.personalRecords.find((p) => p.exerciseName === name);
  }

  function updateSet(exerciseId: number, idx: number, field: keyof DraftSet, value: string) {
    setDraft((prev) => {
      const arr = [...(prev[exerciseId] || [])];
      arr[idx] = { ...arr[idx], [field]: value === "" ? undefined : Number(value) };
      return { ...prev, [exerciseId]: arr };
    });
  }

  function toggleExerciseSkip(exerciseId: number) {
    setSkipped((prev) => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
    setDraft((prev) => ({ ...prev, [exerciseId]: [] }));
  }

  async function saveWorkout() {
    if (!workout) return;
    const sets: any[] = [];
    workout.exercises.forEach((ex) => {
      if (skipped[ex.id]) return;
      // Sets the user never touched still count if they match last week's autofilled numbers.
      const last = lastSetsFor(ex.id);
      for (let i = 0; i < ex.sets; i++) {
        const d = draft[ex.id]?.[i];
        const weight = d?.weight ?? last?.[i]?.weight;
        const reps = d?.reps ?? last?.[i]?.reps;
        if (weight && reps) sets.push({ exerciseId: ex.id, setNumber: i + 1, weight, reps });
      }
    });
    if (!sets.length) {
      flash("Log at least one set first");
      return;
    }
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workoutId: workout.id, date: todayStr(), sets }),
    });
    const json = await res.json();
    setDraft({});
    setSkipped({});
    clearDraft(workout.id, todayStr());
    await refetch();
    flash(json.newPRs?.length ? `Saved — new PR: ${json.newPRs.map((p: any) => p.exercise).join(", ")}` : "Workout saved");
  }

  async function saveCardio() {
    if (!cardioForm.durationMinutes) {
      flash("Enter a duration");
      return;
    }
    await fetch("/api/cardio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: cardioForm.type || "Cardio",
        durationMinutes: Number(cardioForm.durationMinutes),
        distance: cardioForm.distance ? Number(cardioForm.distance) : null,
        averageHeartRate: cardioForm.averageHeartRate ? Number(cardioForm.averageHeartRate) : null,
        calories: cardioForm.calories ? Number(cardioForm.calories) : null,
      }),
    });
    setCardioForm({ type: "", durationMinutes: "", distance: "", averageHeartRate: "", calories: "" });
    await refetch();
    flash("Cardio logged");
  }

  return (
    <div>
      <div className="section-label mb-3">Session</div>
      <select
        value={selectedDay}
        onChange={(e) => setSelectedDay(e.target.value)}
        className="mb-4"
      >
        {DAYS.map((d) => (
          <option key={d} value={d}>
            {d}
            {d === DAYS[new Date().getDay()] ? " (Today)" : ""}
          </option>
        ))}
      </select>

      {!sched && <div className="card text-center text-[var(--muted)] font-label text-xs">No session scheduled.</div>}

      {sched?.workoutType === "Rest" && (
        <div className="card text-center">
          <div className="font-display text-3xl">Rest Day</div>
          <div className="font-label text-xs text-[var(--chalk-dim)] mt-1">
            Recovery is training. Eat your protein, sleep 8 hours.
          </div>
        </div>
      )}

      {sched?.workoutType === "Cardio" && (
        <div className="card">
          <div className="font-display text-2xl">Cardio</div>
          <div className="font-label text-xs text-[var(--chalk-dim)] mb-3">Log today&apos;s session</div>
          <div className="flex gap-2 mb-2">
            <input placeholder="Type (e.g. Bike, Run)" value={cardioForm.type} onChange={(e) => setCardioForm({ ...cardioForm, type: e.target.value })} />
            <input type="number" placeholder="Minutes" value={cardioForm.durationMinutes} onChange={(e) => setCardioForm({ ...cardioForm, durationMinutes: e.target.value })} />
          </div>
          <div className="flex gap-2 mb-3">
            <input type="number" step="0.1" placeholder="Distance (mi)" value={cardioForm.distance} onChange={(e) => setCardioForm({ ...cardioForm, distance: e.target.value })} />
            <input type="number" placeholder="Avg HR" value={cardioForm.averageHeartRate} onChange={(e) => setCardioForm({ ...cardioForm, averageHeartRate: e.target.value })} />
            <input type="number" placeholder="Calories" value={cardioForm.calories} onChange={(e) => setCardioForm({ ...cardioForm, calories: e.target.value })} />
          </div>
          <button className="btn w-full" onClick={saveCardio}>Save Cardio</button>
        </div>
      )}

      {sched?.category && workout && (
        <>
          <div className="card mb-3">
            <span className="inline-block font-display text-[13px] px-2.5 py-0.5 border border-[var(--red-dim)] text-[var(--red)] rounded bg-[rgba(200,16,46,0.08)]">
              {sched.category}
            </span>
            <div className="font-display text-3xl mt-1">{sched.workoutType}</div>
            <div className="font-label text-xs text-[var(--chalk-dim)]">{workout.exercises.length} exercises</div>
          </div>

          {workout.exercises.length === 0 && (
            <div className="card text-center text-[var(--muted)] font-label text-xs">
              No exercises set for {sched.workoutType} yet. Add them in the Schedule tab.
            </div>
          )}

          {workout.exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              lastSets={lastSetsFor(ex.id)}
              pr={prFor(ex.name)}
              draft={draft[ex.id] || []}
              skipped={!!skipped[ex.id]}
              onChange={(idx, field, value) => updateSet(ex.id, idx, field, value)}
              onToggleSkip={() => toggleExerciseSkip(ex.id)}
            />
          ))}

          {workout.exercises.length > 0 && (
            <button className="btn w-full mt-1" onClick={saveWorkout}>Save Workout</button>
          )}
        </>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--olive)] text-[#101410] font-label text-xs px-4 py-2.5 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  exercise,
  lastSets,
  pr,
  draft,
  skipped,
  onChange,
  onToggleSkip,
}: {
  exercise: Exercise;
  lastSets: { weight: number; reps: number }[] | null;
  pr?: { weight: number; reps: number };
  draft: DraftSet[];
  skipped: boolean;
  onChange: (idx: number, field: keyof DraftSet, value: string) => void;
  onToggleSkip: () => void;
}) {
  // Autofilled (untouched) fields clear on focus instead of forcing the user to
  // select/backspace over the suggested number just to replace the first digit.
  const [clearedFields, setClearedFields] = useState<Set<string>>(new Set());

  function handleFocus(key: string, touched: boolean, hasPrefill: boolean) {
    if (touched || !hasPrefill) return;
    setClearedFields((prev) => new Set(prev).add(key));
  }
  function handleBlur(key: string) {
    setClearedFields((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  return (
    <div className="card mb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-xl">{exercise.name}</div>
          <div className="font-label text-[11px] text-[var(--chalk-dim)] mb-2">
            {exercise.sets} sets · {exercise.repMin}
            {exercise.repMax !== exercise.repMin ? `–${exercise.repMax}` : ""} reps
            {exercise.restSeconds ? ` · ${exercise.restSeconds}s rest` : ""}
            {pr ? <span className="text-[var(--olive)]"> · PR {pr.weight}×{pr.reps}</span> : ""}
            {lastSets ? ` · last: ${lastSets.map((s) => `${s.weight}×${s.reps}`).join(", ")}` : ""}
          </div>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
          <input type="checkbox" checked={skipped} onChange={onToggleSkip} className="!w-auto" />
          <span className="font-label text-[11px] text-[var(--chalk-dim)]">Skip</span>
        </label>
      </div>

      {skipped ? (
        <div className="text-center text-[var(--muted)] font-label text-xs py-2">Skipped — won&apos;t be logged.</div>
      ) : (
        Array.from({ length: exercise.sets }).map((_, i) => {
          const lastW = lastSets?.[i]?.weight;
          const lastR = lastSets?.[i]?.reps;
          const weightTouched = draft[i]?.weight !== undefined;
          const repsTouched = draft[i]?.reps !== undefined;
          const weightKey = `${i}-weight`;
          const repsKey = `${i}-reps`;
          const weightValue = weightTouched ? draft[i]!.weight : clearedFields.has(weightKey) ? "" : lastW ?? "";
          const repsValue = repsTouched ? draft[i]!.reps : clearedFields.has(repsKey) ? "" : lastR ?? "";
          return (
            <div key={i} className="grid grid-cols-[26px_1fr_1fr] gap-2 items-center mb-1.5">
              <span className="font-label text-xs text-[var(--muted)]">{i + 1}</span>
              <input
                type="number"
                step="0.1"
                placeholder="lb"
                value={weightValue}
                onChange={(e) => onChange(i, "weight", e.target.value)}
                onFocus={() => handleFocus(weightKey, weightTouched, lastW !== undefined)}
                onBlur={() => handleBlur(weightKey)}
                className={`transition-opacity ${!weightTouched && lastW !== undefined ? "opacity-50" : ""}`}
              />
              <input
                type="number"
                placeholder="reps"
                value={repsValue}
                onChange={(e) => onChange(i, "reps", e.target.value)}
                onFocus={() => handleFocus(repsKey, repsTouched, lastR !== undefined)}
                onBlur={() => handleBlur(repsKey)}
                className={`transition-opacity ${!repsTouched && lastR !== undefined ? "opacity-50" : ""}`}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
