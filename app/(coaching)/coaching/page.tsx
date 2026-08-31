"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingMark from "@/components/LoadingMark";
import { withMinDuration } from "@/lib/minDuration";

type Actor = { username: string | null; name: string; avatarUrl: string | null };
type ClientRelationship = {
  id: number;
  status: "pending" | "active";
  invitedAt: string;
  client: Actor;
  lastWorkoutDate: string | null;
  workoutsThisWeek: number;
  flaggedCount: number;
};
type ActivityEvent =
  | { type: "workout"; id: string; date: string; client: Actor; workoutName: string }
  | { type: "cardio"; id: string; date: string; client: Actor; cardioType: string; durationMinutes: number }
  | { type: "pr"; id: string; date: string; client: Actor; exerciseName: string; weight: number; reps: number };

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CoachingPage() {
  const [relationships, setRelationships] = useState<ClientRelationship[] | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[] | null>(null);
  const [username, setUsername] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = () => {
    const fetchClients = fetch("/api/coach/clients").then((res) => res.json());
    withMinDuration(fetchClients).then(setRelationships);
    fetch("/api/coach/activity").then((res) => res.json()).then(setActivity);
  };

  useEffect(() => {
    refetch();
  }, []);

  if (relationships === null) {
    return (
      <div className="flex justify-center py-16">
        <LoadingMark className="h-10 w-auto" />
      </div>
    );
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError(null);
    const res = await fetch("/api/coach/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const json = await res.json();
    setInviting(false);
    if (!res.ok) {
      setError(json.error || "Couldn't send invite");
      return;
    }
    setUsername("");
    refetch();
  }

  const pending = relationships.filter((r) => r.status === "pending");
  const active = relationships.filter((r) => r.status === "active");
  const totalFlagged = active.reduce((sum, r) => sum + r.flaggedCount, 0);

  return (
    <div>
      <div className="section-label mb-3 !text-[var(--coach-blue)]">Coaching Dashboard</div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat value={active.length} label="Clients" />
        <Stat value={pending.length} label="Pending" />
        <Stat value={totalFlagged} label="Flagged" accent={totalFlagged > 0} />
      </div>

      <form onSubmit={invite} className="card !border-[var(--coach-blue-dim)] mb-4">
        <div className="font-label text-xs text-[var(--chalk-dim)] mb-2">Invite a client</div>
        <div className="flex gap-2">
          <input placeholder="Their username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} required />
          <button type="submit" className="btn !bg-[var(--coach-blue)] !text-white shrink-0" disabled={inviting}>
            {inviting ? "Inviting…" : "Invite"}
          </button>
        </div>
        {error && <p className="font-label text-xs text-[var(--red)] mt-2">{error}</p>}
      </form>

      {pending.length > 0 && (
        <>
          <div className="section-label mb-3 !text-[var(--coach-blue)]">Pending</div>
          {pending.map((r) => (
            <div key={r.id} className="card !py-3 !px-3.5 mb-2 flex items-center gap-3">
              <Avatar name={r.client.name} avatarUrl={r.client.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="font-label text-[13px]">{r.client.name}</div>
                <div className="font-label text-[11px] text-[var(--chalk-dim)]">@{r.client.username}</div>
              </div>
              <span className="font-label text-[10px] uppercase tracking-wide text-[var(--muted)]">Waiting</span>
            </div>
          ))}
        </>
      )}

      <div className="section-label mb-3 !text-[var(--coach-blue)]">Clients</div>
      {active.length === 0 && (
        <div className="card text-center text-[var(--muted)] font-label text-xs mb-4">No active clients yet.</div>
      )}
      {active.map((r) => (
        <Link
          key={r.id}
          href={`/coaching/${r.client.username}`}
          className="card !py-3 !px-3.5 mb-2 flex items-center gap-3 hover:!border-[var(--coach-blue)]"
        >
          <Avatar name={r.client.name} avatarUrl={r.client.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="font-label text-[13px]">{r.client.name}</div>
            <div className="font-label text-[11px] text-[var(--chalk-dim)]">
              {r.lastWorkoutDate ? `Last workout ${formatDate(r.lastWorkoutDate)}` : "No workouts logged"} · {r.workoutsThisWeek} this week
            </div>
          </div>
          {r.flaggedCount > 0 && (
            <span className="font-label text-[10px] uppercase tracking-wide text-[var(--red)] shrink-0">{r.flaggedCount} flagged</span>
          )}
        </Link>
      ))}

      <div className="section-label mb-3 mt-4 !text-[var(--coach-blue)]">Recent Activity</div>
      {activity === null ? (
        <p className="font-label text-xs text-[var(--muted)]">Loading…</p>
      ) : activity.length === 0 ? (
        <div className="card text-center text-[var(--muted)] font-label text-xs">Nothing logged by your clients yet.</div>
      ) : (
        activity.map((e) => (
          <div key={e.id} className="card !py-3 !px-3.5 mb-2 flex items-start gap-3">
            <Link href={`/coaching/${e.client.username}`} className="shrink-0">
              <Avatar name={e.client.name} avatarUrl={e.client.avatarUrl} />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="font-label text-[13px]">
                <Link href={`/coaching/${e.client.username}`} className="hover:underline">{e.client.name}</Link>
                {e.type === "workout" && <> logged <span className="text-[var(--chalk-dim)]">{e.workoutName}</span></>}
                {e.type === "cardio" && <> logged <span className="text-[var(--chalk-dim)]">{e.durationMinutes} min {e.cardioType}</span></>}
                {e.type === "pr" && <> hit a new PR: <span className="text-[var(--olive)]">{e.exerciseName} — {e.weight}lb × {e.reps}</span></>}
              </div>
              <div className="font-label text-[11px] text-[var(--muted)] mt-0.5">{formatDate(e.date)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="card !py-3 text-center">
      <div className={`font-display text-2xl ${accent ? "text-[var(--red)]" : ""}`}>{value}</div>
      <div className="font-label text-[10px] uppercase tracking-wide text-[var(--muted)] mt-0.5">{label}</div>
    </div>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-[var(--line)] bg-[var(--surface2)] flex items-center justify-center">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-display text-sm text-[var(--muted)]">{name[0]?.toUpperCase()}</span>
      )}
    </div>
  );
}
