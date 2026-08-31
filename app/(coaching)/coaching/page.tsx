"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingMark from "@/components/LoadingMark";
import { withMinDuration } from "@/lib/minDuration";
import { smoothPath } from "@/components/ProgressCharts";

type Actor = { username: string | null; name: string; avatarUrl: string | null };
type WeightTrend = { direction: "up" | "down" | "flat" | null; onTrack: boolean | null };
type ClientRelationship = {
  id: number;
  status: "pending" | "active";
  invitedAt: string;
  client: Actor;
  flaggedCount: number;
  lastActivityDate: string | null;
  daysSinceActivity: number | null;
  workoutsThisWeek: number;
  scheduledDaysThisWeek: number;
  completedDaysThisWeek: number;
  weightTrend: WeightTrend;
};
type ActivityEvent =
  | { type: "workout"; id: string; date: string; client: Actor; workoutName: string }
  | { type: "cardio"; id: string; date: string; client: Actor; cardioType: string; durationMinutes: number }
  | { type: "pr"; id: string; date: string; client: Actor; exerciseName: string; weight: number; reps: number };
type FlaggedEdit = { id: number; summary: string; flagNote: string | null; createdAt: string; client: Actor };

const QUIET_THRESHOLD_DAYS = 5;

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function activityLine(e: ActivityEvent) {
  if (e.type === "workout") return { label: "Workout", detail: e.workoutName };
  if (e.type === "cardio") return { label: "Cardio", detail: `${e.durationMinutes} min ${e.cardioType}` };
  return { label: "PR", detail: `${e.exerciseName} — ${e.weight}lb × ${e.reps}` };
}

function WeightTrendBadge({ trend }: { trend: WeightTrend }) {
  if (trend.direction === null || trend.direction === "flat") {
    return <span className="font-label text-[11px] text-[var(--muted)]">—</span>;
  }
  const arrow = trend.direction === "up" ? "↑" : "↓";
  const color = trend.onTrack === true ? "var(--olive)" : trend.onTrack === false ? "var(--red)" : "var(--chalk-dim)";
  return (
    <span className="font-label text-[11px]" style={{ color }}>
      {arrow} {trend.direction === "up" ? "Gaining" : "Losing"}
    </span>
  );
}

export default function CoachingPage() {
  const [relationships, setRelationships] = useState<ClientRelationship[] | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[] | null>(null);
  const [flagged, setFlagged] = useState<FlaggedEdit[] | null>(null);
  const [username, setUsername] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = () => {
    const fetchClients = fetch("/api/coach/clients").then((res) => res.json());
    withMinDuration(fetchClients).then(setRelationships);
    fetch("/api/coach/activity").then((res) => res.json()).then(setActivity);
    fetch("/api/coach/flagged").then((res) => res.json()).then(setFlagged);
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
  const goingQuiet = active
    .filter((r) => r.daysSinceActivity === null || r.daysSinceActivity >= QUIET_THRESHOLD_DAYS)
    .sort((a, b) => (b.daysSinceActivity ?? Infinity) - (a.daysSinceActivity ?? Infinity));

  const inviteForm = (
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
  );

  const pendingList = pending.length > 0 && (
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
  );

  return (
    <div>
      <div className="section-label mb-3 !text-[var(--coach-blue)]">Coaching Dashboard</div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mb-4">
        <Stat value={active.length} label="Clients" />
        <Stat value={goingQuiet.length} label="Going Quiet" accent={goingQuiet.length > 0} />
        <Stat value={totalFlagged} label="Flagged" accent={totalFlagged > 0} />
        <Stat value={pending.length} label="Pending" />
      </div>

      {goingQuiet.length > 0 && (
        <div className="mb-4">
          <div className="section-label mb-3 !text-[var(--red)]">Going Quiet</div>
          {goingQuiet.map((r) => (
            <Link
              key={r.id}
              href={`/coaching/${r.client.username}`}
              className="card !py-3 !px-3.5 mb-2 flex items-center gap-3 !border-[var(--red-dim)] hover:!border-[var(--red)]"
            >
              <Avatar name={r.client.name} avatarUrl={r.client.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="font-label text-[13px]">{r.client.name}</div>
                <div className="font-label text-[11px] text-[var(--red)]">
                  {r.daysSinceActivity === null ? "No activity logged yet" : `${r.daysSinceActivity} days since last activity`}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {flagged && flagged.length > 0 && (
        <div className="mb-4">
          <div className="section-label mb-3 !text-[var(--coach-blue)]">Flagged Edits — Needs Review</div>
          {flagged.map((f) => (
            <Link
              key={f.id}
              href={`/coaching/${f.client.username}`}
              className="card !py-3 !px-3.5 mb-2 flex items-start gap-3 hover:!border-[var(--coach-blue)]"
            >
              <Avatar name={f.client.name} avatarUrl={f.client.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="font-label text-[13px]">
                  <span className="font-semibold">{f.client.name}</span> flagged: {f.summary}
                </div>
                {f.flagNote && <p className="font-label text-[11px] text-[var(--red)] mt-0.5">&ldquo;{f.flagNote}&rdquo;</p>}
                <div className="font-label text-[11px] text-[var(--muted)] mt-0.5">{formatDate(f.createdAt.slice(0, 10))}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Desktop: chart + invite/pending rail side by side. Mobile keeps the simple stack below. */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4 lg:mb-6">
        <div className="lg:col-span-2">
          <div className="section-label mb-3 !text-[var(--coach-blue)]">Client Activity</div>
          <div className="card !border-[var(--coach-blue-dim)] h-full">
            <ActivityVolumeChart activity={activity} />
          </div>
        </div>
        <div>
          {inviteForm}
          {pendingList}
        </div>
      </div>

      <div className="lg:hidden">
        {inviteForm}
        {pendingList}
      </div>

      <div className="section-label mb-3 !text-[var(--coach-blue)]">Clients</div>
      {active.length === 0 && (
        <div className="card text-center text-[var(--muted)] font-label text-xs mb-4">No active clients yet.</div>
      )}

      {/* Mobile: cards */}
      <div className="lg:hidden">
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
                {r.scheduledDaysThisWeek > 0
                  ? `${r.completedDaysThisWeek}/${r.scheduledDaysThisWeek} scheduled days this week`
                  : `${r.workoutsThisWeek} workout${r.workoutsThisWeek === 1 ? "" : "s"} this week`}
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <WeightTrendBadge trend={r.weightTrend} />
              {r.flaggedCount > 0 && (
                <span className="font-label text-[10px] uppercase tracking-wide text-[var(--red)]">{r.flaggedCount} flagged</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: table */}
      {active.length > 0 && (
        <div className="hidden lg:block card !border-[var(--coach-blue-dim)] !p-0 overflow-hidden mb-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--coach-blue-dim)]">
                <th className="text-left font-label text-[10px] uppercase tracking-wide text-[var(--muted)] px-4 py-3">Client</th>
                <th className="text-left font-label text-[10px] uppercase tracking-wide text-[var(--muted)] px-4 py-3">Last Activity</th>
                <th className="text-left font-label text-[10px] uppercase tracking-wide text-[var(--muted)] px-4 py-3">Adherence</th>
                <th className="text-left font-label text-[10px] uppercase tracking-wide text-[var(--muted)] px-4 py-3">Weight Trend</th>
                <th className="text-right font-label text-[10px] uppercase tracking-wide text-[var(--muted)] px-4 py-3">Flags</th>
              </tr>
            </thead>
            <tbody>
              {active.map((r) => (
                <tr key={r.id} className="border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--surface2)]">
                  <td className="px-4 py-3">
                    <Link href={`/coaching/${r.client.username}`} className="flex items-center gap-2.5 hover:underline">
                      <Avatar name={r.client.name} avatarUrl={r.client.avatarUrl} small />
                      <span className="font-label text-[12px]">{r.client.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-label text-[12px] text-[var(--chalk-dim)]">
                    {r.daysSinceActivity === null
                      ? "No activity yet"
                      : r.daysSinceActivity === 0
                        ? "Today"
                        : `${r.daysSinceActivity}d ago`}
                  </td>
                  <td className="px-4 py-3 font-label text-[12px] text-[var(--chalk-dim)]">
                    {r.scheduledDaysThisWeek > 0 ? `${r.completedDaysThisWeek}/${r.scheduledDaysThisWeek} this week` : "—"}
                  </td>
                  <td className="px-4 py-3"><WeightTrendBadge trend={r.weightTrend} /></td>
                  <td className="px-4 py-3 text-right">
                    {r.flaggedCount > 0 ? (
                      <span className="font-label text-[11px] uppercase tracking-wide text-[var(--red)]">{r.flaggedCount}</span>
                    ) : (
                      <span className="font-label text-[11px] text-[var(--muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="section-label mb-3 mt-4 !text-[var(--coach-blue)]">Recent Activity</div>
      {activity === null ? (
        <p className="font-label text-xs text-[var(--muted)]">Loading…</p>
      ) : activity.length === 0 ? (
        <div className="card text-center text-[var(--muted)] font-label text-xs">Nothing logged by your clients yet.</div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="lg:hidden">
            {activity.map((e) => (
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
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden lg:block card !border-[var(--coach-blue-dim)] !p-0 overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--coach-blue-dim)]">
                  <th className="text-left font-label text-[10px] uppercase tracking-wide text-[var(--muted)] px-4 py-3">Client</th>
                  <th className="text-left font-label text-[10px] uppercase tracking-wide text-[var(--muted)] px-4 py-3">Type</th>
                  <th className="text-left font-label text-[10px] uppercase tracking-wide text-[var(--muted)] px-4 py-3">Detail</th>
                  <th className="text-right font-label text-[10px] uppercase tracking-wide text-[var(--muted)] px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((e) => {
                  const line = activityLine(e);
                  return (
                    <tr key={e.id} className="border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--surface2)]">
                      <td className="px-4 py-3">
                        <Link href={`/coaching/${e.client.username}`} className="flex items-center gap-2.5 hover:underline">
                          <Avatar name={e.client.name} avatarUrl={e.client.avatarUrl} small />
                          <span className="font-label text-[12px]">{e.client.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-label text-[11px] uppercase tracking-wide text-[var(--coach-blue)]">{line.label}</td>
                      <td className="px-4 py-3 font-label text-[12px] text-[var(--chalk-dim)]">{line.detail}</td>
                      <td className="px-4 py-3 font-label text-[11px] text-[var(--muted)] text-right">{formatDate(e.date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// Daily count of workout/cardio/PR events across every client, last 14 days — the dashboard's
// at-a-glance "is anyone actually training" chart.
function ActivityVolumeChart({ activity }: { activity: ActivityEvent[] | null }) {
  const days = 14;
  const today = new Date();
  const buckets: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  const indexByDate = new Map(buckets.map((b, i) => [b.date, i]));
  for (const e of activity ?? []) {
    const idx = indexByDate.get(e.date);
    if (idx !== undefined) buckets[idx].count += 1;
  }

  const w = 700, h = 220, pad = 24;
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const yFor = (count: number) => h - pad - (count / maxCount) * (h - pad * 2);
  const xFor = (i: number) => pad + (i / (buckets.length - 1)) * (w - pad * 2);
  const points = buckets.map((b, i) => [xFor(i), yFor(b.count)] as const);
  const path = smoothPath(points);
  const areaPath = `${path} L ${points[points.length - 1][0]} ${h - pad} L ${points[0][0]} ${h - pad} Z`;

  if (activity !== null && activity.length === 0) {
    return <div className="flex items-center justify-center h-full min-h-[220px] font-label text-xs text-[var(--muted)]">Nothing logged by your clients yet.</div>;
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        <linearGradient id="coachActivityFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--coach-blue)" stopOpacity={0.25} />
          <stop offset="100%" stopColor="var(--coach-blue)" stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0, maxCount].map((v, i) => (
        <line key={i} x1={pad} y1={yFor(v)} x2={w - pad} y2={yFor(v)} stroke="var(--line)" strokeWidth={1} />
      ))}
      <path d={areaPath} fill="url(#coachActivityFill)" stroke="none" />
      <path d={path} fill="none" stroke="var(--coach-blue)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="var(--coach-blue)" stroke="var(--surface)" strokeWidth={1.5} />
      ))}
      {buckets.map((b, i) => {
        if (i % 3 !== 0 && i !== buckets.length - 1) return null;
        const anchor = i === 0 ? "start" : i === buckets.length - 1 ? "end" : "middle";
        return (
          <text key={i} x={xFor(i)} y={h - pad + 16} fill="var(--muted)" fontFamily="Manrope" fontSize={10} textAnchor={anchor}>
            {formatDate(b.date)}
          </text>
        );
      })}
    </svg>
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

function Avatar({ name, avatarUrl, small }: { name: string; avatarUrl: string | null; small?: boolean }) {
  const size = small ? "w-7 h-7" : "w-9 h-9";
  return (
    <div className={`${size} rounded-full overflow-hidden shrink-0 border border-[var(--line)] bg-[var(--surface2)] flex items-center justify-center`}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className={`font-display ${small ? "text-xs" : "text-sm"} text-[var(--muted)]`}>{name[0]?.toUpperCase()}</span>
      )}
    </div>
  );
}
