"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LoadingMark from "@/components/LoadingMark";
import { withMinDuration } from "@/lib/minDuration";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type DayType = "Rest" | "Cardio" | "Workout";
type DayForm = { type: DayType; name: string; category: "Strength" | "Hypertrophy" };

type Exercise = { id: number; name: string; sets: number; repMin: number; repMax: number };
type Workout = { id: number; name: string; exercises: Exercise[] };
type ScheduleDay = { day: string; workoutType: string; category: string | null };
type ClientData = {
  client: { id: number; name: string; username: string | null; avatarUrl: string | null };
  schedule: ScheduleDay[];
  workouts: Workout[];
  personalRecords: { id: number; exerciseName: string; weight: number; reps: number; date: string }[];
  weightLogs: { id: number; date: string; weight: number }[];
  workoutLogs: { id: number; date: string; workoutId: number; sets: unknown[] }[];
  cardioLogs: { id: number; date: string; type: string; durationMinutes: number }[];
  notes: { id: number; content: string; createdAt: string }[];
  editLog: { id: number; summary: string; createdAt: string; flagged: boolean; flagNote: string | null }[];
};

function dayFormFor(sched: ScheduleDay | undefined): DayForm {
  if (!sched || sched.workoutType === "Rest") return { type: "Rest", name: "", category: "Strength" };
  if (sched.workoutType === "Cardio") return { type: "Cardio", name: "", category: "Strength" };
  return { type: "Workout", name: sched.workoutType, category: (sched.category as "Strength" | "Hypertrophy") || "Strength" };
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const [noteText, setNoteText] = useState("");
  const [postingNote, setPostingNote] = useState(false);

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

  async function postNote() {
    if (!noteText.trim()) return;
    setPostingNote(true);
    await fetch(`/api/coach/clients/${clientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText.trim() }),
    });
    setNoteText("");
    setPostingNote(false);
    refetch();
  }

  const workoutNameById = new Map(data.workouts.map((w) => [w.id, w.name]));
  const recentLogs = [...data.workoutLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const recentWeights = [...data.weightLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const recentPRs = [...data.personalRecords].sort((a, b) => b.date.localeCompare(a.date));

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

      <div className="section-label mb-3 !text-[var(--coach-blue)]">Program</div>
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

      <div className="section-label mb-3 !text-[var(--coach-blue)]">Progress</div>
      <div className="card !border-[var(--coach-blue-dim)] mb-4">
        <div className="font-label text-[11px] text-[var(--chalk-dim)] mb-1.5">Recent PRs</div>
        {recentPRs.length === 0 && <p className="font-label text-xs text-[var(--muted)] mb-2">None yet.</p>}
        {recentPRs.slice(0, 5).map((p) => (
          <div key={p.id} className="flex justify-between font-label text-[12px] mb-1">
            <span>{p.exerciseName}</span>
            <span className="text-[var(--olive)]">{p.weight}lb × {p.reps} — {formatDate(p.date)}</span>
          </div>
        ))}

        <div className="font-label text-[11px] text-[var(--chalk-dim)] mt-3 mb-1.5">Recent Workouts</div>
        {recentLogs.length === 0 && <p className="font-label text-xs text-[var(--muted)] mb-2">None yet.</p>}
        {recentLogs.map((l) => (
          <div key={l.id} className="flex justify-between font-label text-[12px] mb-1">
            <span>{workoutNameById.get(l.workoutId) ?? "Workout"}</span>
            <span className="text-[var(--chalk-dim)]">{formatDate(l.date)}</span>
          </div>
        ))}

        <div className="font-label text-[11px] text-[var(--chalk-dim)] mt-3 mb-1.5">Weight Trend</div>
        {recentWeights.length === 0 && <p className="font-label text-xs text-[var(--muted)]">None logged yet.</p>}
        {recentWeights.map((w) => (
          <div key={w.id} className="flex justify-between font-label text-[12px] mb-1">
            <span>{w.weight}lb</span>
            <span className="text-[var(--chalk-dim)]">{formatDate(w.date)}</span>
          </div>
        ))}
      </div>

      <div className="section-label mb-3 !text-[var(--coach-blue)]">Notes</div>
      <div className="card !border-[var(--coach-blue-dim)] mb-4">
        <div className="flex gap-2 mb-3">
          <input placeholder="Leave feedback for your client…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          <button className="btn !bg-[var(--coach-blue)] !text-white shrink-0" onClick={postNote} disabled={postingNote}>
            {postingNote ? "Posting…" : "Post"}
          </button>
        </div>
        {data.notes.length === 0 && <p className="font-label text-xs text-[var(--muted)]">No notes yet.</p>}
        {data.notes.map((n) => (
          <div key={n.id} className="border-t border-[var(--line)] pt-2 mt-2 first:border-0 first:pt-0 first:mt-0">
            <p className="text-[13px] leading-relaxed">{n.content}</p>
            <p className="font-label text-[10px] text-[var(--muted)] mt-0.5">{formatDate(n.createdAt.slice(0, 10))}</p>
          </div>
        ))}
      </div>

      <div className="section-label mb-3 !text-[var(--coach-blue)]">Edit History</div>
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
