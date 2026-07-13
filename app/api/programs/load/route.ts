import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";

// body: { programId }
// Applies a saved program on top of the user's live schedule/workouts. Existing
// workouts/exercises are matched by name and updated in place (never deleted) so
// historical logs and progress-graph data never get orphaned by loading a program.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { programId } = await req.json();
  if (!programId) return NextResponse.json({ error: "Missing programId" }, { status: 400 });

  const allPrograms = await db.select().from(schema.programs);
  const program = allPrograms.find((p) => p.id === programId);
  if (!program || program.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { schedule, workouts } = program.data;

  for (const w of workouts) {
    const allWorkouts = await db.select().from(schema.workouts);
    let workout = allWorkouts.find((existing) => existing.userId === userId && existing.name === w.name);
    if (!workout) {
      [workout] = await db.insert(schema.workouts).values({ userId, name: w.name }).returning();
    }

    const allExercises = await db.select().from(schema.exercises);
    const existingExercises = allExercises.filter((e) => e.workoutId === workout!.id);

    for (let i = 0; i < w.exercises.length; i++) {
      const ex = w.exercises[i];
      const existing = existingExercises.find((e) => e.name === ex.name);
      if (existing) {
        await db
          .update(schema.exercises)
          .set({ sets: ex.sets, repMin: ex.repMin, repMax: ex.repMax, restSeconds: ex.restSeconds, sortOrder: i })
          .where(eq(schema.exercises.id, existing.id));
      } else {
        await db.insert(schema.exercises).values({
          workoutId: workout!.id,
          name: ex.name,
          sets: ex.sets,
          repMin: ex.repMin,
          repMax: ex.repMax,
          restSeconds: ex.restSeconds,
          sortOrder: i,
        });
      }
    }
  }

  for (const s of schedule) {
    const allSchedule = await db.select().from(schema.schedule);
    const existingDay = allSchedule.find((row) => row.userId === userId && row.day === s.day);
    if (existingDay) {
      await db
        .update(schema.schedule)
        .set({ workoutType: s.workoutType, category: s.category })
        .where(eq(schema.schedule.id, existingDay.id));
    } else {
      await db.insert(schema.schedule).values({ userId, day: s.day, workoutType: s.workoutType, category: s.category });
    }
  }

  await db.update(schema.users).set({ activeProgramId: programId }).where(eq(schema.users.id, userId));

  return NextResponse.json({ ok: true });
}
