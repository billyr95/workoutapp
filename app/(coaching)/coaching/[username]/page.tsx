"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LoadingMark from "@/components/LoadingMark";
import { withMinDuration } from "@/lib/minDuration";
import { buildLiftSeries, colorForLift, MAX_SELECTED_LIFTS, WeightChart, LiftProgressChart, formatDate } from "@/components/ProgressCharts";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type DayType = "Rest" | "Cardio" | "Workout";
type DayForm = { type: DayType; name: string; category: "Strength" | "Hypertrophy" };

type Exercise = { id: number; name: string; sets: number; repMin: number; repMax: number; sortOrder: number };
type Workout = { id: number; name: string; exercises: Exercise[] };
type ScheduleDay = { day: string; workoutType: string; category: string | null };
type SavedProgram = { id: number; name: string; createdAt: string };
type SetLog = { exerciseId: number; setNumber: number; weight: number; reps: number };
type ClientData = {
  client: { id: number; name: string; username: string | null; avatarUrl: string | null; activeProgramId: number | null };
  schedule: ScheduleDay[];
  workouts: Workout[];
  personalRecords: { id: number; exerciseName: string; weight: number; reps: number; date: string }[];
  weightLogs: { id: number; date: string; weight: number }[];
  workoutLogs: { id: number; date: string; workoutId: number; sets: SetLog[] }[];
  cardioLogs: { id: number; date: string; type: string; durationMinutes: number }[];
  notes: { id: number; content: string; createdAt: string; workoutLogId: number | null }[];
  editLog: { id: number; summary: string; createdAt: string; flagged: boolean; flagNote: string | null }[];
};

function dayFormFor(sched: ScheduleDay | undefined): DayForm {
  if (!sched || sched.workoutType === "Rest") return { type: "Rest", name: "", category: "Strength" };
  if (sched.workoutType === "Cardio") return { type: "Cardio", name: "", category: "Strength" };
  return { type: "Workout", name: sched.workoutType, category: (sched.category as "Strength" | "Hypertrophy") || "Strength" };
}

// One row per exercise, sets in order — same grouping used on public profiles' workout history.
function groupSetsByExercise(sets: { exerciseName: string; setNumber: number; weight: number; reps: number }[]) {
  const order: string[] = [];
  const byExercise = new Map<string, typeof sets>();
  for (const s of sets) {
    if (!byExercise.has(s.exerciseName)) {
      byExercise.set(s.exerciseName, []);
      order.push(s.exerciseName);
    }
    byExercise.get(s.exerciseName)!.push(s);
  }
  return order.map((name) => ({ name, sets: byExercise.get(name)! }));
}

export default function CoachClientPage() {
  const params = useParams<{ username: string }>();
  // Keyed on username so navigating between two clients remounts this component and resets state.
  return <ClientDetail key={params.username} username={params.username} />;
}

function ClientDetail({ username }: { username: string }) {
  const [clientId, setClientId] = useState<number | null | "not-found">(null);
  const [data, setData] = useState<ClientData | null | "no-access">(null);

  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [dayForm, setDayForm] = useState<DayForm>({ type: "Rest", name: "", category: "Strength" });
  const [savingDay, setSavingDay] = useState(false);
  const [exerciseForm, setExerciseForm] = useState({ name: "", sets: "", repMin: "", repMax: "" });
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [postingNote, setPostingNote] = useState(false);

  const [programs, setPrograms] = useState<SavedProgram[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [programName, setProgramName] = useState("");
  const [savingProgram, setSavingProgram] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [selectedLifts, setSelectedLifts] = useState<string[] | null>(null);

  useEffect(() => {
    fetch(`/api/users/${username}`).then(async (res) => {
      if (!res.ok) {
        setClientId("not-found");
        return;
      }
      const json = await res.json();
      setClientId(json.id);
    });
  }, [username]);

  const refetch = () => {
    if (typeof clientId !== "number") return;
    const fetchData = fetch(`/api/coach/clients/${clientId}`).then(async (res) => {
      if (!res.ok) return "no-access" as const;
      return res.json();
    });
    withMinDuration(fetchData).then(setData);
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    if (typeof clientId !== "number") return;
    fetch(`/api/coach/clients/${clientId}/programs`).then((res) => res.json()).then(setPrograms);
  }, [clientId]);

  if (clientId === "not-found") {
    return <div className="card text-center text-[var(--muted)] font-label text-xs">No user found with that username.</div>;
  }
  if (data === null || clientId === null) {
    return (
      <div className="flex justify-center py-16">
        <LoadingMark className="h-10 w-auto" />
      </div>
    );
  }
  if (data === "no-access") {
    return (
      <div className="card text-center text-[var(--muted)] font-label text-xs">
        You don&apos;t have an active coaching relationship with this user.
      </div>
    );
  }

  const editingSched = editingDay ? data.schedule.find((s) => s.day === editingDay) : null;
  const editingWorkout = editingSched ? data.workouts.find((w) => w.name === editingSched.workoutType) : null;
  const isConfigurableWorkout = !!(editingSched?.category && editingWorkout);

  const activeIdStr = data.client.activeProgramId != null ? String(data.client.activeProgramId) : null;
  const effectiveProgramId = selectedProgramId ?? (activeIdStr && programs.some((p) => String(p.id) === activeIdStr) ? activeIdStr : "");

  function selectDay(d: string) {
    setEditingDay(d);
    setDayForm(dayFormFor((data as ClientData).schedule.find((s) => s.day === d)));
  }

  async function saveDay() {
    if (!editingDay) return;
    if (dayForm.type === "Workout" && !dayForm.name.trim()) return;
    setSavingDay(true);
    await fetch(`/api/coach/clients/${clientId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: editingDay, type: dayForm.type, name: dayForm.name, category: dayForm.category }),
    });
    setSavingDay(false);
    refetch();
  }

  async function addExercise() {
    if (!editingWorkout) return;
    if (!exerciseForm.name || !exerciseForm.sets || !exerciseForm.repMin) return;
    await fetch(`/api/coach/clients/${clientId}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workoutId: editingWorkout.id,
        name: exerciseForm.name,
        sets: Number(exerciseForm.sets),
        repMin: Number(exerciseForm.repMin),
        repMax: Number(exerciseForm.repMax || exerciseForm.repMin),
      }),
    });
    setExerciseForm({ name: "", sets: "", repMin: "", repMax: "" });
    refetch();
  }

  async function removeExercise(id: number) {
    await fetch(`/api/coach/clients/${clientId}/exercises`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    refetch();
  }

  async function saveProgramSnapshot() {
    if (!programName.trim()) return;
    setSavingProgram(true);
    const res = await fetch(`/api/coach/clients/${clientId}/programs`, {
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
    refetch();
  }

  async function loadSelectedProgram() {
    if (!effectiveProgramId) return;
    setLoadingProgram(true);
    await fetch(`/api/coach/clients/${clientId}/programs/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: Number(effectiveProgramId) }),
    });
    setLoadingProgram(false);
    refetch();
  }

  async function deleteSelectedProgram(id: number) {
    await fetch(`/api/coach/clients/${clientId}/programs`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setPrograms((prev) => prev.filter((p) => p.id !== id));
    if (effectiveProgramId === String(id)) setSelectedProgramId("");
  }

  async function postNoteForDay(workoutLogId: number) {
    if (!noteDraft.trim()) return;
    setPostingNote(true);
    await fetch(`/api/coach/clients/${clientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteDraft.trim(), workoutLogId }),
    });
    setNoteDraft("");
    setPostingNote(false);
    refetch();
  }

  const workoutNameById = new Map(data.workouts.map((w) => [w.id, w.name]));
  const exerciseNameById = new Map<number, string>();
  data.workouts.forEach((w) => w.exercises.forEach((e) => exerciseNameById.set(e.id, e.name)));
  const recentLogs = [...data.workoutLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  const recentPRs = [...data.personalRecords].sort((a, b) => b.date.localeCompare(a.date));

  const liftSeries = buildLiftSeries(data.workouts, data.workoutLogs);
  const defaultLift = liftSeries.size > 0 ? [...liftSeries.entries()].sort((a, b) => b[1].length - a[1].length)[0][0] : null;
  const effectiveSelected = selectedLifts ?? (defaultLift ? [defaultLift] : []);
  function toggleLift(name: string) {
    if (effectiveSelected.includes(name)) {
      setSelectedLifts(effectiveSelected.filter((n) => n !== name));
    } else if (effectiveSelected.length < MAX_SELECTED_LIFTS) {
      setSelectedLifts([...effectiveSelected, name]);
    }
  }

  return (
    <div>
      <Link href="/coaching" className="font-label text-[11px] text-[var(--muted)] hover:text-[var(--chalk)]">← Coaching</Link>

      <div className="card !border-[var(--coach-blue-dim)] mt-3 mb-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-[var(--line)] bg-[var(--surface2)] flex items-center justify-center">
          {data.client.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.client.avatarUrl} alt={data.client.name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-lg text-[var(--muted)]">{data.client.name[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-display text-xl truncate">{data.client.name}</div>
          <div className="font-label text-xs text-[var(--chalk-dim)]">@{data.client.username}</div>
        </div>
      </div>

      <div className="section-label mb-3 flex items-center justify-between !gap-3 !text-[var(--coach-blue)]">
        <span>Programs</span>
        <button
          className="btn-ghost !py-1 !px-2.5 !text-[11px] normal-case tracking-normal rounded !border-[var(--coach-blue-dim)]"
          onClick={() => setShowSaveForm((v) => !v)}
        >
          Save Current Setup
        </button>
      </div>
      <div className="card !border-[var(--coach-blue-dim)] mb-3.5">
        {showSaveForm && (
          <div className="flex gap-2 mb-2.5">
            <input
              placeholder="Program name (e.g. Push Pull Legs)"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
            />
            <button className="btn !bg-[var(--coach-blue)] !text-white !py-1.5 !px-3 !text-[11px] shrink-0" onClick={saveProgramSnapshot} disabled={savingProgram}>
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
              className="btn !bg-[var(--coach-blue)] !text-white !py-1.5 !px-3 !text-[11px] shrink-0"
              onClick={loadSelectedProgram}
              disabled={!effectiveProgramId || loadingProgram}
            >
              {loadingProgram ? "Loading…" : "Load"}
            </button>
            {effectiveProgramId && (
              <span
                className="text-[var(--muted)] hover:text-[var(--red)] cursor-pointer font-label text-sm px-1 self-center"
                onClick={() => deleteSelectedProgram(Number(effectiveProgramId))}
                title="Delete this saved program"
              >
                ✕
              </span>
            )}
          </div>
        )}
      </div>

      <div className="section-label mb-3 !text-[var(--coach-blue)]">Weekly Split</div>
      <div className="grid gap-2 mb-4">
        {DAYS.map((d) => {
          const sched = data.schedule.find((s) => s.day === d);
          const label = sched ? `${sched.workoutType}${sched.category ? " · " + sched.category : ""}` : "Unscheduled";
          return (
            <button
              key={d}
              onClick={() => selectDay(d)}
              className={`flex justify-between items-center card !py-3 !px-3.5 text-left ${d === editingDay ? "!border-[var(--coach-blue)]" : ""}`}
            >
              <span className="font-display text-lg w-24">{d}</span>
              <span className="font-label text-xs text-[var(--chalk-dim)]">{label}</span>
            </button>
          );
        })}
      </div>

      {editingDay && (
        <div className="mb-6">
          <div className="section-label mb-3 !text-[var(--coach-blue)]">Editing — {editingDay}</div>

          <div className="card !border-[var(--coach-blue-dim)] mb-3">
            <div className="flex gap-2 mb-3">
              {(["Rest", "Cardio", "Workout"] as DayType[]).map((t) => (
                <button
                  key={t}
                  className={`btn-ghost !py-1.5 !px-3 !text-[11px] rounded flex-1 ${dayForm.type === t ? "!border-[var(--coach-blue)] !text-[var(--chalk)]" : ""}`}
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

            <button className="btn !bg-[var(--coach-blue)] !text-white !py-1.5 !px-3 !text-[11px] mt-1" onClick={saveDay} disabled={savingDay}>
              {savingDay ? "Saving…" : "Save Day"}
            </button>
          </div>

          {isConfigurableWorkout && editingWorkout ? (
            <div className="card !border-[var(--coach-blue-dim)]">
              <div className="font-display text-xl mb-2">{editingWorkout.name}</div>
              {editingWorkout.exercises.map((ex) => (
                <div key={ex.id} className="flex items-center gap-2 mb-1.5">
                  <span className="font-label text-[13px] flex-[2]">{ex.name}</span>
                  <span className="font-label text-xs text-[var(--chalk-dim)] flex-1">{ex.sets}×{ex.repMin}-{ex.repMax}</span>
                  <span
                    className="text-[var(--muted)] hover:text-[var(--red)] cursor-pointer font-label text-sm px-1.5"
                    onClick={() => removeExercise(ex.id)}
                  >
                    ✕
                  </span>
                </div>
              ))}
              <div className="mt-3">
                <input
                  placeholder="Exercise name"
                  value={exerciseForm.name}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
                  className="mb-2"
                />
                <div className="flex gap-2">
                  <input type="number" placeholder="Sets" value={exerciseForm.sets} onChange={(e) => setExerciseForm({ ...exerciseForm, sets: e.target.value })} />
                  <input type="number" placeholder="Min reps" value={exerciseForm.repMin} onChange={(e) => setExerciseForm({ ...exerciseForm, repMin: e.target.value })} />
                  <input type="number" placeholder="Max reps" value={exerciseForm.repMax} onChange={(e) => setExerciseForm({ ...exerciseForm, repMax: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 mt-2.5">
                <button className="btn !bg-[var(--coach-blue)] !text-white !py-1.5 !px-3 !text-[11px]" onClick={addExercise}>Add Exercise</button>
                <button className="btn-ghost !py-1.5 !px-3 !text-[11px] rounded" onClick={() => setEditingDay(null)}>Close</button>
              </div>
            </div>
          ) : (
            <button className="btn-ghost !py-1.5 !px-3 !text-[11px] rounded" onClick={() => setEditingDay(null)}>Close</button>
          )}
        </div>
      )}

      <div className="section-label mb-3 !text-[var(--coach-blue)]">Weight Trend</div>
      <div className="card !border-[var(--coach-blue-dim)] mb-3.5">
        <WeightChart weights={data.weightLogs} hasHistory={data.weightLogs.length >= 2} />
      </div>

      <div className="section-label mb-3 !text-[var(--coach-blue)] flex items-center justify-between !gap-3">
        <span>Lift Progress</span>
        {effectiveSelected.length > 0 && (
          <button
            className="btn-ghost !py-1 !px-2.5 !text-[11px] normal-case tracking-normal rounded shrink-0"
            onClick={() => setSelectedLifts([])}
          >
            Clear
          </button>
        )}
      </div>
      <div className="card !border-[var(--coach-blue-dim)] mb-3.5">
        <LiftProgressChart series={liftSeries} selected={effectiveSelected} />
      </div>

      <div className="section-label mb-3 !text-[var(--coach-blue)]">Personal Records</div>
      {recentPRs.length === 0 ? (
        <div className="card !border-[var(--coach-blue-dim)] text-center text-[var(--muted)] font-label text-xs mb-4">No PRs yet.</div>
      ) : (
        <div className="mb-4">
          {recentPRs.map((p) => {
            const chartable = liftSeries.has(p.exerciseName);
            const active = effectiveSelected.includes(p.exerciseName);
            const color = colorForLift(p.exerciseName);
            return (
              <button
                key={p.id}
                type="button"
                disabled={!chartable}
                onClick={() => toggleLift(p.exerciseName)}
                className="card !py-3 !px-4 flex justify-between items-center mb-2 w-full text-left transition-colors disabled:cursor-default"
                style={{
                  borderColor: active ? color : "var(--coach-blue-dim)",
                  background: active ? "color-mix(in srgb, " + color + " 10%, var(--surface))" : "var(--surface)",
                }}
              >
                <span className="font-label text-[13px] flex items-center gap-2">
                  {chartable && <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: color, opacity: active ? 1 : 0.35 }} />}
                  {p.exerciseName}
                </span>
                <span className="font-label text-[11px] uppercase tracking-wide text-[var(--olive)]">
                  {p.weight}lb × {p.reps} — {formatDate(p.date)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="section-label mb-3 !text-[var(--coach-blue)]">Workout Days</div>
      {recentLogs.length === 0 && (
        <div className="card !border-[var(--coach-blue-dim)] text-center text-[var(--muted)] font-label text-xs mb-4">No workouts logged yet.</div>
      )}
      {recentLogs.map((l) => {
        const isOpen = expandedLogId === l.id;
        const notesForDay = data.notes.filter((n) => n.workoutLogId === l.id);
        const grouped = groupSetsByExercise(l.sets.map((s) => ({ ...s, exerciseName: exerciseNameById.get(s.exerciseId) ?? "Exercise" })));
        return (
          <div key={l.id} className="card !border-[var(--coach-blue-dim)] !py-3 !px-4 mb-2">
            <button className="flex justify-between w-full text-left" onClick={() => setExpandedLogId(isOpen ? null : l.id)}>
              <span className="font-label text-xs">{formatDate(l.date)}</span>
              <span className="font-label text-xs text-[var(--chalk-dim)] flex items-center gap-1.5">
                {workoutNameById.get(l.workoutId) ?? "Workout"}
                {notesForDay.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[var(--coach-blue)]" title="Has a note" />}
                <span className="text-[var(--muted)]">{isOpen ? "▲" : "▼"}</span>
              </span>
            </button>
            {isOpen && (
              <div className="mt-2.5 pt-2.5 border-t border-[var(--line)]">
                {grouped.map((ex) => (
                  <div key={ex.name} className="flex justify-between mb-1 last:mb-0">
                    <span className="font-label text-[12px]">{ex.name}</span>
                    <span className="font-label text-[11px] text-[var(--chalk-dim)]">
                      {ex.sets.map((s) => `${s.weight}×${s.reps}`).join(", ")}
                    </span>
                  </div>
                ))}

                {notesForDay.map((n) => (
                  <div key={n.id} className="mt-2.5 pt-2.5 border-t border-[var(--line)]">
                    <p className="text-[13px] leading-relaxed">{n.content}</p>
                  </div>
                ))}

                <div className="flex gap-2 mt-3">
                  <input placeholder="Leave feedback on this session…" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
                  <button
                    className="btn !bg-[var(--coach-blue)] !text-white shrink-0"
                    onClick={() => postNoteForDay(l.id)}
                    disabled={postingNote}
                  >
                    {postingNote ? "Posting…" : "Post"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="section-label mb-3 mt-4 !text-[var(--coach-blue)]">Edit History</div>
      <div className="card !border-[var(--coach-blue-dim)]">
        {data.editLog.length === 0 && <p className="font-label text-xs text-[var(--muted)]">No edits yet.</p>}
        {data.editLog.map((e) => (
          <div key={e.id} className="border-t border-[var(--line)] pt-2 mt-2 first:border-0 first:pt-0 first:mt-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-label text-[12px]">{e.summary}</p>
              {e.flagged && <span className="font-label text-[10px] uppercase tracking-wide text-[var(--red)] shrink-0">Flagged</span>}
            </div>
            {e.flagNote && <p className="font-label text-[11px] text-[var(--red)] mt-0.5">&ldquo;{e.flagNote}&rdquo;</p>}
            <p className="font-label text-[10px] text-[var(--muted)] mt-0.5">{formatDate(e.createdAt.slice(0, 10))}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
