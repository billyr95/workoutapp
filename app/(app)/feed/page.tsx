"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingMark from "@/components/LoadingMark";
import { withMinDuration } from "@/lib/minDuration";

type Actor = { username: string | null; name: string; avatarUrl: string | null };
type FeedEvent =
  | { type: "workout"; id: string; date: string; actor: Actor; workoutName: string }
  | { type: "cardio"; id: string; date: string; actor: Actor; cardioType: string; durationMinutes: number; distance: number | null }
  | { type: "pr"; id: string; date: string; actor: Actor; exerciseName: string; weight: number; reps: number };

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FeedPage() {
  const [events, setEvents] = useState<FeedEvent[] | null>(null);

  useEffect(() => {
    const fetchFeed = fetch("/api/feed").then((res) => res.json());
    withMinDuration(fetchFeed).then(setEvents);
  }, []);

  if (events === null) {
    return (
      <div className="flex justify-center py-16">
        <LoadingMark className="h-10 w-auto" />
      </div>
    );
  }

  return (
    <div>
      <div className="section-label mb-3">Activity</div>

      {events.length === 0 && (
        <div className="card text-center text-[var(--muted)] font-label text-xs">
          Nothing here yet — follow people from{" "}
          <Link href="/search" className="text-[var(--chalk)] underline">Search</Link> to see their workouts, cardio,
          and PRs. If you&apos;re already following people, ask them to turn on visibility in their Profile settings.
        </div>
      )}

      {events.map((e) => (
        <div key={e.id} className="card !py-3 !px-3.5 mb-2 flex items-start gap-3">
          <Link href={`/u/${e.actor.username}`} className="shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-[var(--line)] bg-[var(--surface2)] flex items-center justify-center">
              {e.actor.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.actor.avatarUrl} alt={e.actor.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-sm text-[var(--muted)]">{e.actor.name[0]?.toUpperCase()}</span>
              )}
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="font-label text-[13px]">
              <Link href={`/u/${e.actor.username}`} className="hover:underline">{e.actor.name}</Link>
              {e.type === "workout" && <> logged <span className="text-[var(--chalk-dim)]">{e.workoutName}</span></>}
              {e.type === "cardio" && (
                <>
                  {" "}logged <span className="text-[var(--chalk-dim)]">
                    {e.durationMinutes} min {e.cardioType}
                    {e.distance ? ` · ${e.distance}mi` : ""}
                  </span>
                </>
              )}
              {e.type === "pr" && (
                <>
                  {" "}hit a new PR:{" "}
                  <span className="text-[var(--olive)]">{e.exerciseName} — {e.weight}lb × {e.reps}</span>
                </>
              )}
            </div>
            <div className="font-label text-[11px] text-[var(--muted)] mt-0.5">{formatDate(e.date)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
