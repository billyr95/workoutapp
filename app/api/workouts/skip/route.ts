import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";

async function ownedWorkout(userId: number, workoutId: number) {
  const allWorkouts = await db.select().from(schema.workouts);
  const workout = allWorkouts.find((w) => w.id === workoutId);
  return workout && workout.userId === userId ? workout : null;
}

// body: { workoutId, date }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { workoutId, date } = await req.json();
  if (!workoutId || !date) return NextResponse.json({ error: "Missing workoutId or date" }, { status: 400 });
  if (!(await ownedWorkout(userId, workoutId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allLogs = await db.select().from(schema.workoutLogs);
  const existingLog = allLogs.find((l) => l.userId === userId && l.date === date && l.workoutId === workoutId);

  if (existingLog) {
    await db.delete(schema.setLogs).where(eq(schema.setLogs.workoutLogId, existingLog.id));
    await db.update(schema.workoutLogs).set({ skipped: true }).where(eq(schema.workoutLogs.id, existingLog.id));
  } else {
    await db.insert(schema.workoutLogs).values({ userId, date, workoutId, skipped: true });
  }

  return NextResponse.json({ ok: true });
}

// body: { workoutId, date }
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { workoutId, date } = await req.json();
  if (!workoutId || !date) return NextResponse.json({ error: "Missing workoutId or date" }, { status: 400 });
  if (!(await ownedWorkout(userId, workoutId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allLogs = await db.select().from(schema.workoutLogs);
  const existingLog = allLogs.find(
    (l) => l.userId === userId && l.date === date && l.workoutId === workoutId && l.skipped
  );
  if (existingLog) {
    await db.delete(schema.workoutLogs).where(eq(schema.workoutLogs.id, existingLog.id));
  }

  return NextResponse.json({ ok: true });
}
