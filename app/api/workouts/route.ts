import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";

// body: { workoutId: number, date: string, sets: [{ exerciseId, setNumber, weight, reps, rpe }] }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const body = await req.json();
  const { workoutId, date, sets } = body;

  if (!workoutId || !date || !Array.isArray(sets) || sets.length === 0) {
    return NextResponse.json({ error: "Missing workoutId, date, or sets" }, { status: 400 });
  }

  const allWorkouts = await db.select().from(schema.workouts);
  const workout = allWorkouts.find((w) => w.id === workoutId);
  if (!workout || workout.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only accept sets for exercises that actually belong to this workout.
  const allExercises = await db.select().from(schema.exercises);
  const workoutExercises = allExercises.filter((e) => e.workoutId === workoutId);
  const validExerciseIds = new Set(workoutExercises.map((e) => e.id));
  const validSets = sets.filter((s: { exerciseId: number }) => validExerciseIds.has(s.exerciseId));
  if (validSets.length === 0) {
    return NextResponse.json({ error: "No valid sets for this workout" }, { status: 400 });
  }

  // upsert workout log for this date + workout
  const allLogs = await db.select().from(schema.workoutLogs);
  const existingLog = allLogs.find((l) => l.userId === userId && l.date === date && l.workoutId === workoutId);

  let workoutLogId: number;
  if (existingLog) {
    workoutLogId = existingLog.id;
    await db.delete(schema.setLogs).where(eq(schema.setLogs.workoutLogId, workoutLogId));
  } else {
    const [created] = await db
      .insert(schema.workoutLogs)
      .values({ userId, date, workoutId })
      .returning();
    workoutLogId = created.id;
  }

  for (const s of validSets) {
    await db.insert(schema.setLogs).values({
      workoutLogId,
      exerciseId: s.exerciseId,
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe ?? null,
    });
  }

  // PR detection: group sets by exercise, compare heaviest weight against existing PR
  const byExercise = new Map<number, typeof validSets>();
  for (const s of validSets) {
    if (!byExercise.has(s.exerciseId)) byExercise.set(s.exerciseId, []);
    byExercise.get(s.exerciseId)!.push(s);
  }

  const allPRs = await db.select().from(schema.personalRecords);
  const newPRs: { exercise: string; weight: number; reps: number }[] = [];
  for (const [exerciseId, exSets] of byExercise) {
    const exercise = workoutExercises.find((e) => e.id === exerciseId);
    if (!exercise) continue;
    const topSet = exSets.reduce((a, b) => (b.weight > a.weight ? b : a), exSets[0]);
    const existingPR = allPRs.find((p) => p.userId === userId && p.exerciseName === exercise.name);

    if (!existingPR || topSet.weight > existingPR.weight) {
      if (existingPR) {
        await db
          .update(schema.personalRecords)
          .set({ weight: topSet.weight, reps: topSet.reps, date })
          .where(eq(schema.personalRecords.id, existingPR.id));
      } else {
        await db
          .insert(schema.personalRecords)
          .values({ userId, exerciseName: exercise.name, weight: topSet.weight, reps: topSet.reps, date });
      }
      newPRs.push({ exercise: exercise.name, weight: topSet.weight, reps: topSet.reps });
    }
  }

  return NextResponse.json({ ok: true, workoutLogId, newPRs });
}
