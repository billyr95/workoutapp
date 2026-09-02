"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppData, Workout, WorkoutLog } from "@/lib/useAppData";
import LoadingMark from "@/components/LoadingMark";
import { LiftPoint, SessionSetGroup, buildLiftSeries, MAX_SELECTED_LIFTS, WeightChart, LiftProgressChart, SessionSetsChart, formatDate } from "@/components/ProgressCharts";

const RANGE_OPTIONS = [
  { value: "14", label: "14 Days" },
  { value: "30", label: "30 Days" },
  { value: "60", label: "60 Days" },
  { value: "90", label: "90 Days" },
  { value: "ytd", label: "This Year" },
  { value: "365", label: "365 Days" },
  { value: "730", label: "2 Years" },
  { value: "1825", label: "5 Years" },
  { value: "all", label: "All Time" },
];
const DEFAULT_RANGE = "30";

const WORKOUT_RANGE_OPTIONS = [
  { value: "30", label: "30 Days" },
  { value: "60", label: "60 Days" },
  { value: "90", label: "90 Days" },
  { value: "ytd", label: "This Year" },
  { value: "all", label: "All Time" },
];
const DEFAULT_WORKOUT_RANGE = "30";

// ISO date (YYYY-MM-DD) marking the start of the selected range, or null for "All Time".
function rangeStartDate(range: string): string | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "ytd") return `${now.getFullYear()}-01-01`;
  const d = new Date(now);
  d.setDate(d.getDate() - Number(range));
  return d.toISOString().slice(0, 10);
}

export default function ProgressPage() {
  const { data, loading, refetch } = useAppData();
  const [weightInput, setWeightInput] = useState("");
  const [measureForm, setMeasureForm] = useState({ waist: "", chest: "", leftArm: "", rightArm: "", leftThigh: "", rightThigh: "" });
  const [toast, setToast] = useState<string | null>(null);
  const [range, setRange] = useState(DEFAULT_RANGE);
  const rangeStart = rangeStartDate(range);
  // null = user hasn't touched the picker yet; fall back to the most-logged workout.
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);

  const liftSeries = useMemo(() => (data ? buildLiftSeries(data.workouts, data.workoutLogs) : new Map<string, LiftPoint[]>()), [data]);
  const logsByWorkoutId = useMemo(() => {
    const out = new Map<number, WorkoutLog[]>();
    for (const log of data?.workoutLogs ?? []) {
      if (!out.has(log.workoutId)) out.set(log.workoutId, []);
      out.get(log.workoutId)!.push(log);
    }
    for (const logs of out.values()) logs.sort((a, b) => b.date.localeCompare(a.date));
    return out;
  }, [data]);
  const defaultWorkoutId = useMemo(() => {
    if (logsByWorkoutId.size === 0) return null;
    const [mostLogged] = [...logsByWorkoutId.entries()].sort((a, b) => b[1].length - a[1].length);
    return mostLogged[0];
  }, [logsByWorkoutId]);
  const effectiveWorkoutId = selectedWorkoutId ?? defaultWorkoutId;
  const effectiveWorkout = data?.workouts.find((w) => w.id === effectiveWorkoutId) ?? null;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <LoadingMark className="h-10 w-auto" />
      </div>
    );
  }

  const allWeights = [...data.weightLogs].sort((a, b) => a.date.localeCompare(b.date));
  const weights = rangeStart ? allWeights.filter((w) => w.date >= rangeStart) : allWeights;
  const lastM = [...data.measurements].sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0];

  async function saveWeight() {
    const v = Number(weightInput);
    if (!v) { flash("Enter a weight"); return; }
    await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: v }),
    });
    setWeightInput("");
    await refetch();
    flash("Weight logged");
  }

  async function saveMeasurements() {
    await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        waist: measureForm.waist ? Number(measureForm.waist) : null,
        chest: measureForm.chest ? Number(measureForm.chest) : null,
        leftArm: measureForm.leftArm ? Number(measureForm.leftArm) : null,
        rightArm: measureForm.rightArm ? Number(measureForm.rightArm) : null,
        leftThigh: measureForm.leftThigh ? Number(measureForm.leftThigh) : null,
        rightThigh: measureForm.rightThigh ? Number(measureForm.rightThigh) : null,
      }),
    });
    await refetch();
    flash("Measurements saved");
  }

  return (
    <div>
      <WeeklyReview />

      <div className="section-label mb-3 flex items-center justify-between !gap-3">
        <span>Weight Range</span>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="!w-auto max-w-[130px] !py-1 !px-2 !text-[11px] normal-case tracking-normal"
        >
          {RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="section-label mb-3">Weight Trend</div>
      <div className="card mb-3.5">
        <WeightChart weights={weights} hasHistory={allWeights.length >= 2} />
      </div>

      <div className="card mb-3.5">
        <div className="flex gap-2">
          <input type="number" step="0.1" placeholder="Weight (lb)" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} />
          <button className="btn" onClick={saveWeight}>Log Today&apos;s Weight</button>
        </div>
      </div>

      <div className="section-label mb-3 mt-5">By Workout</div>
      {data.workouts.length === 0 ? (
        <div className="card text-center text-[var(--muted)] font-label text-xs">No workouts set up yet.</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3.5">
            {data.workouts.map((w) => {
              const hasLogs = logsByWorkoutId.has(w.id);
              const active = w.id === effectiveWorkoutId;
              return (
                <button
                  key={w.id}
                  type="button"
                  disabled={!hasLogs}
                  onClick={() => setSelectedWorkoutId(w.id)}
                  className="btn-ghost !py-1.5 !px-3 !text-[12px] normal-case tracking-normal rounded disabled:opacity-40 disabled:cursor-default"
                  style={active ? { borderColor: "var(--olive)", color: "var(--olive)" } : undefined}
                >
                  {w.name}
                </button>
              );
            })}
          </div>
          {effectiveWorkout && (
            <WorkoutDetail key={effectiveWorkout.id} workout={effectiveWorkout} logs={logsByWorkoutId.get(effectiveWorkout.id) ?? []} liftSeries={liftSeries} />
          )}
        </>
      )}

      <div className="section-label mb-3 mt-5">Personal Records</div>
      {data.personalRecords.length === 0 ? (
        <div className="card text-center text-[var(--muted)] font-label text-xs">No PRs logged yet.</div>
      ) : (
        data.personalRecords.map((p) => (
          <div key={p.id} className="card !py-3 !px-4 flex justify-between items-center mb-2">
            <span className="font-label text-[13px]">{p.exerciseName}</span>
            <span className="font-label text-[11px] uppercase tracking-wide text-[var(--olive)]">
              {p.weight}lb × {p.reps} — {p.date}
            </span>
          </div>
        ))
      )}

      <div className="section-label mb-3 mt-5">Measurements</div>
      <div className="card">
        <div className="flex gap-2 mb-2">
          <input type="number" step="0.1" placeholder="Waist" defaultValue={lastM?.waist ?? ""} onChange={(e) => setMeasureForm({ ...measureForm, waist: e.target.value })} />
          <input type="number" step="0.1" placeholder="Chest" defaultValue={lastM?.chest ?? ""} onChange={(e) => setMeasureForm({ ...measureForm, chest: e.target.value })} />
        </div>
        <div className="flex gap-2 mb-2">
          <input type="number" step="0.1" placeholder="L Arm" defaultValue={lastM?.leftArm ?? ""} onChange={(e) => setMeasureForm({ ...measureForm, leftArm: e.target.value })} />
          <input type="number" step="0.1" placeholder="R Arm" defaultValue={lastM?.rightArm ?? ""} onChange={(e) => setMeasureForm({ ...measureForm, rightArm: e.target.value })} />
        </div>
        <div className="flex gap-2 mb-3">
          <input type="number" step="0.1" placeholder="L Thigh" defaultValue={lastM?.leftThigh ?? ""} onChange={(e) => setMeasureForm({ ...measureForm, leftThigh: e.target.value })} />
          <input type="number" step="0.1" placeholder="R Thigh" defaultValue={lastM?.rightThigh ?? ""} onChange={(e) => setMeasureForm({ ...measureForm, rightThigh: e.target.value })} />
        </div>
        <button className="btn-ghost w-full rounded" onClick={saveMeasurements}>Save Measurements</button>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--olive)] text-[#101410] font-label text-xs px-4 py-2.5 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// Every set from one logged session, grouped by exercise in the workout's own exercise order.
function buildSessionGroups(workout: Workout, session: WorkoutLog): SessionSetGroup[] {
  const exercisesInOrder = [...workout.exercises].sort((a, b) => a.sortOrder - b.sortOrder);
  return exercisesInOrder
    .map((ex) => ({
      name: ex.name,
      sets: session.sets.filter((s) => s.exerciseId === ex.id).sort((a, b) => a.setNumber - b.setNumber),
    }))
    .filter((g) => g.sets.length > 0);
}

// Keyed by workout id from the parent so switching workouts remounts this with fresh state,
// instead of stale range/session selections leaking across workouts.
function WorkoutDetail({ workout, logs, liftSeries }: { workout: Workout; logs: WorkoutLog[]; liftSeries: Map<string, LiftPoint[]> }) {
  const [range, setRange] = useState(DEFAULT_WORKOUT_RANGE);
  const [showLast, setShowLast] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(() => logs[0]?.id ?? null);

  const rangeStart = rangeStartDate(range);
  const exerciseNames = workout.exercises.map((e) => e.name).slice(0, MAX_SELECTED_LIFTS);
  const filteredSeries = new Map<string, LiftPoint[]>();
  for (const name of exerciseNames) {
    const points = liftSeries.get(name) ?? [];
    const filtered = rangeStart ? points.filter((p) => p.date >= rangeStart) : points;
    if (filtered.length) filteredSeries.set(name, filtered);
  }

  const session = logs.find((l) => l.id === sessionId) ?? logs[0] ?? null;
  const sessionGroups = session ? buildSessionGroups(workout, session) : [];

  return (
    <div>
      <div className="flex items-center justify-between !gap-3 mb-2">
        <span className="font-label text-[12px] text-[var(--muted)]">{workout.name}</span>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="!w-auto max-w-[130px] !py-1 !px-2 !text-[11px] normal-case tracking-normal"
        >
          {WORKOUT_RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="card mb-3">
        <LiftProgressChart series={filteredSeries} selected={exerciseNames} />
      </div>

      <button className="btn-ghost w-full rounded mb-3" onClick={() => setShowLast((v) => !v)}>
        {showLast ? "Hide Last Workout" : "Show Last Workout"}
      </button>

      {showLast && (
        logs.length === 0 ? (
          <div className="card text-center text-[var(--muted)] font-label text-xs">No sessions logged for this workout yet.</div>
        ) : (
          <div className="card">
            <div className="flex items-center justify-between !gap-3 mb-2">
              <span className="font-label text-[11px] text-[var(--muted)]">Session</span>
              <select
                value={session?.id}
                onChange={(e) => setSessionId(Number(e.target.value))}
                className="!w-auto max-w-[160px] !py-1 !px-2 !text-[11px] normal-case tracking-normal"
              >
                {logs.map((l) => (
                  <option key={l.id} value={l.id}>{formatDate(l.date, true)}</option>
                ))}
              </select>
            </div>
            <SessionSetsChart groups={sessionGroups} />
          </div>
        )
      )}
    </div>
  );
}

type ReviewState =
  | { status: "loading" }
  | { status: "ai"; content: string }
  | { status: "coach"; coachName: string; content: string | null; workoutDate: string | null }
  | { status: "error" };

// If the client has an active coach, their most recent note replaces the AI-generated
// review entirely — a real coach's take beats a generated one whenever one exists.
function WeeklyReview() {
  const [state, setState] = useState<ReviewState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/coach/my-coaches")
      .then((res) => res.json())
      .then((relationships: { status: string; coach: { name: string }; notes: { content: string; workoutDate: string | null }[] }[]) => {
        const active = relationships.find((r) => r.status === "active");
        if (active) {
          const latest = active.notes[0];
          if (!cancelled) {
            setState({ status: "coach", coachName: active.coach.name, content: latest?.content ?? null, workoutDate: latest?.workoutDate ?? null });
          }
          return;
        }
        return fetch("/api/progress/review").then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Couldn't load your review");
          if (!cancelled) setState({ status: "ai", content: json.content });
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "error") return null;

  if (state.status === "coach") {
    return (
      <div className="card mb-3.5 !border-[var(--coach-blue-dim)]">
        <div className="section-label mb-2 !text-[var(--coach-blue)]">Your Coach — {state.coachName}</div>
        {state.content ? (
          <>
            <p className="text-[13px] leading-relaxed">{state.content}</p>
            {state.workoutDate && <p className="font-label text-[10px] text-[var(--muted)] mt-1">re: {formatDate(state.workoutDate)} workout</p>}
          </>
        ) : (
          <p className="font-label text-xs text-[var(--muted)]">No notes yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="card mb-3.5 !border-[var(--olive)]">
      <div className="section-label mb-2 !text-[var(--olive)]">Coach&apos;s Take</div>
      {state.status === "loading" ? (
        <p className="font-label text-xs text-[var(--muted)]">Reviewing your week…</p>
      ) : (
        <p className="text-[13px] leading-relaxed">{state.content}</p>
      )}
    </div>
  );
}
