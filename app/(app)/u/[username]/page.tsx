"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type WorkoutDaySet = { exerciseName: string; setNumber: number; weight: number; reps: number };
type WorkoutDay = { date: string; workoutName: string; sets: WorkoutDaySet[] };

type PublicProfile = {
  id: number;
  username: string | null;
  name: string;
  avatarUrl: string | null;
  isSelf: boolean;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  weight: { value: number; date: string } | null;
  program: {
    schedule: { day: string; workoutType: string; category: string | null }[];
    workouts: { name: string; exercises: { name: string; sets: number; repMin: number; repMax: number; restSeconds: number | null }[] }[];
  } | null;
  maxes: { exerciseName: string; weight: number; reps: number; date: string }[] | null;
  workoutDays: WorkoutDay[] | null;
};

function groupSetsByExercise(sets: WorkoutDaySet[]) {
  const order: string[] = [];
  const byExercise = new Map<string, WorkoutDaySet[]>();
  for (const s of sets) {
    if (!byExercise.has(s.exerciseName)) {
      byExercise.set(s.exerciseName, []);
      order.push(s.exerciseName);
    }
    byExercise.get(s.exerciseName)!.push(s);
  }
  return order.map((name) => ({ name, sets: byExercise.get(name)! }));
}

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null | "not-found">(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [savingProgram, setSavingProgram] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    fetch(`/api/users/${params.username}`).then(async (res) => {
      if (!res.ok) {
        setProfile("not-found");
        return;
      }
      setProfile(await res.json());
    });
  }, [params.username]);

  if (profile === null) return <p className="font-mono text-sm text-[var(--muted)]">Loading…</p>;
  if (profile === "not-found") {
    return <div className="card text-center text-[var(--muted)] font-mono text-xs">No user found with that username.</div>;
  }

  async function toggleFollow() {
    if (profile === null || profile === "not-found") return;
    setFollowBusy(true);
    const wasFollowing = profile.isFollowing;
    await fetch("/api/follow", {
      method: wasFollowing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id }),
    });
    setProfile((prev) =>
      prev && prev !== "not-found"
        ? { ...prev, isFollowing: !wasFollowing, followerCount: prev.followerCount + (wasFollowing ? -1 : 1) }
        : prev
    );
    setFollowBusy(false);
  }

  async function saveProgram() {
    if (profile === null || profile === "not-found" || !profile.username) return;
    setSavingProgram(true);
    const res = await fetch("/api/programs/save-from-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: profile.username }),
    });
    const json = await res.json();
    setSavingProgram(false);
    flash(res.ok ? "Saved — find it in your Programs dropdown on the Schedule page" : json.error || "Couldn't save program");
  }

  const nothingShared = !profile.weight && !profile.program && !profile.maxes && !profile.workoutDays;

  return (
    <div>
      <div className="card mb-4 flex items-center gap-3.5">
        <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-[var(--line)] bg-[var(--surface2)] flex items-center justify-center">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-2xl text-[var(--muted)]">{profile.name[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-xl truncate">{profile.name}</div>
          <div className="font-mono text-xs text-[var(--chalk-dim)]">@{profile.username}</div>
          <div className="font-mono text-[11px] text-[var(--muted)] mt-1">
            {profile.followerCount} follower{profile.followerCount === 1 ? "" : "s"} · {profile.followingCount} following
          </div>
        </div>
        {!profile.isSelf && (
          <button
            className={profile.isFollowing ? "btn-ghost !py-1.5 !px-3 !text-[11px] rounded shrink-0" : "btn !py-1.5 !px-3 !text-[11px] shrink-0"}
            onClick={toggleFollow}
            disabled={followBusy}
          >
            {profile.isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>

      {nothingShared && (
        <div className="card text-center text-[var(--muted)] font-mono text-xs">
          {profile.isSelf ? "You haven't shared any details publicly yet — turn on visibility in Profile settings." : "This user hasn't shared any details yet."}
        </div>
      )}

      {profile.workoutDays && profile.workoutDays.length > 0 && (
        <>
          <div className="section-label mb-3">Workout History</div>
          <div className="mb-4">
            {profile.workoutDays.map((d, i) => {
              const isOpen = expandedDay === i;
              const hasSets = d.sets.length > 0;
              return (
                <div key={i} className="card !py-3 !px-4 mb-2">
                  <button
                    className="flex justify-between w-full text-left"
                    onClick={() => hasSets && setExpandedDay(isOpen ? null : i)}
                  >
                    <span className="font-mono text-xs">{d.date}</span>
                    <span className="font-mono text-xs text-[var(--chalk-dim)] flex items-center gap-1.5">
                      {d.workoutName}
                      {hasSets && <span className="text-[var(--muted)]">{isOpen ? "▲" : "▼"}</span>}
                    </span>
                  </button>
                  {isOpen && hasSets && (
                    <div className="mt-2.5 pt-2.5 border-t border-[var(--line)]">
                      {groupSetsByExercise(d.sets).map((ex) => (
                        <div key={ex.name} className="flex justify-between mb-1 last:mb-0">
                          <span className="font-mono text-[12px]">{ex.name}</span>
                          <span className="font-mono text-[11px] text-[var(--chalk-dim)]">
                            {ex.sets.map((s) => `${s.weight}×${s.reps}`).join(", ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {profile.weight && (
        <>
          <div className="section-label mb-3">Current Weight</div>
          <div className="card mb-4">
            <div className="font-display text-3xl">{profile.weight.value}lb</div>
            <div className="font-mono text-xs text-[var(--chalk-dim)]">as of {profile.weight.date}</div>
          </div>
        </>
      )}

      {profile.maxes && profile.maxes.length > 0 && (
        <>
          <div className="section-label mb-3">Maxes</div>
          {profile.maxes.map((m) => (
            <div key={m.exerciseName} className="card !py-3 !px-4 flex justify-between items-center mb-2">
              <span className="font-mono text-[13px]">{m.exerciseName}</span>
              <span className="font-mono text-[11px] uppercase tracking-wide text-[var(--olive)]">
                {m.weight}lb × {m.reps} — {m.date}
              </span>
            </div>
          ))}
        </>
      )}

      {profile.program && profile.program.schedule.length > 0 && (
        <>
          <div className="section-label mb-3 mt-4 flex items-center justify-between !gap-3">
            <span>Workout Program</span>
            {!profile.isSelf && profile.isFollowing && (
              <button
                className="btn-ghost !py-1 !px-2.5 !text-[11px] normal-case tracking-normal rounded shrink-0"
                onClick={saveProgram}
                disabled={savingProgram}
              >
                {savingProgram ? "Saving…" : "Save Their Program"}
              </button>
            )}
          </div>
          <div className="grid gap-2 mb-4">
            {profile.program.schedule.map((s) => {
              const workout = profile.program!.workouts.find((w) => w.name === s.workoutType);
              return (
                <div key={s.day} className="card !py-3 !px-3.5">
                  <div className="flex justify-between items-center">
                    <span className="font-display text-lg w-24">{s.day}</span>
                    <span className="font-mono text-xs text-[var(--chalk-dim)]">
                      {s.workoutType}
                      {s.category ? ` · ${s.category}` : ""}
                    </span>
                  </div>
                  {workout && workout.exercises.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[var(--line)]">
                      {workout.exercises.map((ex) => (
                        <div key={ex.name} className="font-mono text-[11px] text-[var(--chalk-dim)]">
                          {ex.name} — {ex.sets}×{ex.repMin}
                          {ex.repMax !== ex.repMin ? `-${ex.repMax}` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--olive)] text-[#101410] font-mono text-xs px-4 py-2.5 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
