import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";

type Actor = { username: string | null; name: string; avatarUrl: string | null };
type FeedEvent =
  | { type: "workout"; id: string; date: string; actor: Actor; workoutName: string }
  | { type: "cardio"; id: string; date: string; actor: Actor; cardioType: string; durationMinutes: number; distance: number | null }
  | { type: "pr"; id: string; date: string; actor: Actor; exerciseName: string; weight: number; reps: number };

// GET — a chronological feed of recent workouts, cardio sessions, and PRs from people the
// viewer follows. Only includes activity from users who've opted their workout days (showWorkoutDays)
// and/or maxes (showMaxes) into public visibility — the same toggles that gate their profile page.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const viewerId = Number(session.user.id);

  const allFollows = await db.select().from(schema.follows);
  const followingIds = allFollows.filter((f) => f.followerId === viewerId).map((f) => f.followingId);
  if (followingIds.length === 0) return NextResponse.json([]);

  const followingSet = new Set(followingIds);
  const allUsers = await db.select().from(schema.users);
  const userById = new Map(allUsers.map((u) => [u.id, u]));

  const workoutDaysVisibleIds = new Set(allUsers.filter((u) => followingSet.has(u.id) && u.showWorkoutDays).map((u) => u.id));
  const maxesVisibleIds = new Set(allUsers.filter((u) => followingSet.has(u.id) && u.showMaxes).map((u) => u.id));

  const actorFor = (userId: number): Actor => {
    const u = userById.get(userId)!;
    return { username: u.username, name: u.name, avatarUrl: u.avatarUrl };
  };

  const events: FeedEvent[] = [];

  if (workoutDaysVisibleIds.size > 0) {
    const [workoutLogs, workouts] = await Promise.all([db.select().from(schema.workoutLogs), db.select().from(schema.workouts)]);
    const workoutNameById = new Map(workouts.map((w) => [w.id, w.name]));
    for (const log of workoutLogs) {
      if (!workoutDaysVisibleIds.has(log.userId)) continue;
      events.push({
        type: "workout",
        id: `w${log.id}`,
        date: log.date,
        actor: actorFor(log.userId),
        workoutName: workoutNameById.get(log.workoutId) ?? "Workout",
      });
    }

    const cardioLogs = await db.select().from(schema.cardioLogs);
    for (const c of cardioLogs) {
      if (!workoutDaysVisibleIds.has(c.userId)) continue;
      events.push({
        type: "cardio",
        id: `c${c.id}`,
        date: c.date,
        actor: actorFor(c.userId),
        cardioType: c.type,
        durationMinutes: c.durationMinutes,
        distance: c.distance,
      });
    }
  }

  if (maxesVisibleIds.size > 0) {
    const prs = await db.select().from(schema.personalRecords);
    for (const p of prs) {
      if (!maxesVisibleIds.has(p.userId)) continue;
      events.push({
        type: "pr",
        id: `p${p.id}`,
        date: p.date,
        actor: actorFor(p.userId),
        exerciseName: p.exerciseName,
        weight: p.weight,
        reps: p.reps,
      });
    }
  }

  events.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  return NextResponse.json(events.slice(0, 40));
}
