import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";

type Actor = { username: string | null; name: string; avatarUrl: string | null };
type ActivityEvent =
  | { type: "workout"; id: string; date: string; client: Actor; workoutName: string }
  | { type: "cardio"; id: string; date: string; client: Actor; cardioType: string; durationMinutes: number }
  | { type: "pr"; id: string; date: string; client: Actor; exerciseName: string; weight: number; reps: number };

// GET — a combined, chronological feed of workouts/cardio/PRs across every active client of
// this coach. Unlike the peer activity feed, this isn't gated by the client's visibility
// toggles — an active coach relationship already implies full visibility.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isCoach) return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  const coachId = Number(session.user.id);

  const [relationships, allUsers] = await Promise.all([db.select().from(schema.coachRelationships), db.select().from(schema.users)]);
  const activeClientIds = new Set(relationships.filter((r) => r.coachId === coachId && r.status === "active").map((r) => r.clientId));
  if (activeClientIds.size === 0) return NextResponse.json([]);

  const userById = new Map(allUsers.map((u) => [u.id, u]));
  const actorFor = (userId: number): Actor => {
    const u = userById.get(userId)!;
    return { username: u.username, name: u.name, avatarUrl: u.avatarUrl };
  };

  const [workoutLogs, workouts, cardioLogs, personalRecords] = await Promise.all([
    db.select().from(schema.workoutLogs),
    db.select().from(schema.workouts),
    db.select().from(schema.cardioLogs),
    db.select().from(schema.personalRecords),
  ]);
  const workoutNameById = new Map(workouts.map((w) => [w.id, w.name]));

  const events: ActivityEvent[] = [];

  for (const log of workoutLogs) {
    if (!activeClientIds.has(log.userId)) continue;
    events.push({ type: "workout", id: `w${log.id}`, date: log.date, client: actorFor(log.userId), workoutName: workoutNameById.get(log.workoutId) ?? "Workout" });
  }
  for (const c of cardioLogs) {
    if (!activeClientIds.has(c.userId)) continue;
    events.push({ type: "cardio", id: `c${c.id}`, date: c.date, client: actorFor(c.userId), cardioType: c.type, durationMinutes: c.durationMinutes });
  }
  for (const p of personalRecords) {
    if (!activeClientIds.has(p.userId)) continue;
    events.push({ type: "pr", id: `p${p.id}`, date: p.date, client: actorFor(p.userId), exerciseName: p.exerciseName, weight: p.weight, reps: p.reps });
  }

  events.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  return NextResponse.json(events.slice(0, 40));
}
