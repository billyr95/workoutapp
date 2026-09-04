import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";

// DELETE — permanently deletes the signed-in user's account and every row tied to it
// (workouts, logs, programs, coaching relationships in either direction, socials, AI caches).
// Irreversible — the client signs the user out immediately after this succeeds.
export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const workouts = await db.select().from(schema.workouts).where(eq(schema.workouts.userId, userId));
  const workoutIds = workouts.map((w) => w.id);
  const logs = await db.select().from(schema.workoutLogs).where(eq(schema.workoutLogs.userId, userId));
  const logIds = logs.map((l) => l.id);

  if (logIds.length) await db.delete(schema.setLogs).where(inArray(schema.setLogs.workoutLogId, logIds));
  await db.delete(schema.workoutLogs).where(eq(schema.workoutLogs.userId, userId));
  if (workoutIds.length) await db.delete(schema.exercises).where(inArray(schema.exercises.workoutId, workoutIds));
  await db.delete(schema.workouts).where(eq(schema.workouts.userId, userId));
  await db.delete(schema.schedule).where(eq(schema.schedule.userId, userId));
  await db.delete(schema.programs).where(eq(schema.programs.userId, userId));
  await db.delete(schema.weightLogs).where(eq(schema.weightLogs.userId, userId));
  await db.delete(schema.measurements).where(eq(schema.measurements.userId, userId));
  await db.delete(schema.personalRecords).where(eq(schema.personalRecords.userId, userId));
  await db.delete(schema.cardioLogs).where(eq(schema.cardioLogs.userId, userId));
  await db.delete(schema.follows).where(eq(schema.follows.followerId, userId));
  await db.delete(schema.follows).where(eq(schema.follows.followingId, userId));
  await db.delete(schema.dailyInsights).where(eq(schema.dailyInsights.userId, userId));
  await db.delete(schema.aiReviews).where(eq(schema.aiReviews.userId, userId));
  await db.delete(schema.coachNotes).where(eq(schema.coachNotes.coachId, userId));
  await db.delete(schema.coachNotes).where(eq(schema.coachNotes.clientId, userId));
  await db.delete(schema.programEditLog).where(eq(schema.programEditLog.coachId, userId));
  await db.delete(schema.programEditLog).where(eq(schema.programEditLog.clientId, userId));
  await db.delete(schema.coachRelationships).where(eq(schema.coachRelationships.coachId, userId));
  await db.delete(schema.coachRelationships).where(eq(schema.coachRelationships.clientId, userId));

  await db.delete(schema.users).where(eq(schema.users.id, userId));

  return NextResponse.json({ ok: true });
}
