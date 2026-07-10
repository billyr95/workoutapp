import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/db";
import { USER_ID } from "@/lib/data";

// body: { workoutId: number, date: string, sets: [{ exerciseId, setNumber, weight, reps, rpe }] }
export async function POST(req: Request) {
  const body = await req.json();
  const { workoutId, date, sets } = body;

  if (!workoutId || !date || !Array.isArray(sets) || sets.length === 0) {
    return NextResponse.json({ error: "Missing workoutId, date, or sets" }, { status: 400 });
  }

  // upsert workout log for this date + workout
  const existingLog = db
    .select()
    .from(schema.workoutLogs)
    .all()
    .find((l) => l.userId === USER_ID && l.date === date && l.workoutId === workoutId);

  let workoutLogId: number;
  if (existingLog) {
    workoutLogId = existingLog.id;
    db.delete(schema.setLogs).where(eq(schema.setLogs.workoutLogId, workoutLogId)).run();
  } else {
    const [created] = db
      .insert(schema.workoutLogs)
      .values({ userId: USER_ID, date, workoutId })
      .returning()
      .all();
    workoutLogId = created.id;
  }

  for (const s of sets) {
    db.insert(schema.setLogs)
      .values({
        workoutLogId,
        exerciseId: s.exerciseId,
        setNumber: s.setNumber,
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe ?? null,
      })
      .run();
  }

  // PR detection: group sets by exercise, compare heaviest weight against existing PR
  const exercises = db.select().from(schema.exercises).all();
  const byExercise = new Map<number, typeof sets>();
  for (const s of sets) {
    if (!byExercise.has(s.exerciseId)) byExercise.set(s.exerciseId, []);
    byExercise.get(s.exerciseId)!.push(s);
  }

  const newPRs: { exercise: string; weight: number; reps: number }[] = [];
  for (const [exerciseId, exSets] of byExercise) {
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) continue;
    const topSet = exSets.reduce((a, b) => (b.weight > a.weight ? b : a), exSets[0]);
    const existingPR = db
      .select()
      .from(schema.personalRecords)
      .all()
      .find((p) => p.userId === USER_ID && p.exerciseName === exercise.name);

    if (!existingPR || topSet.weight > existingPR.weight) {
      if (existingPR) {
        db.update(schema.personalRecords)
          .set({ weight: topSet.weight, reps: topSet.reps, date })
          .where(eq(schema.personalRecords.id, existingPR.id))
          .run();
      } else {
        db.insert(schema.personalRecords)
          .values({ userId: USER_ID, exerciseName: exercise.name, weight: topSet.weight, reps: topSet.reps, date })
          .run();
      }
      newPRs.push({ exercise: exercise.name, weight: topSet.weight, reps: topSet.reps });
    }
  }

  return NextResponse.json({ ok: true, workoutLogId, newPRs });
}
