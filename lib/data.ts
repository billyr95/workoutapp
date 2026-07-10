import { db, schema } from "@/db";

const USER_ID = 1; // single-user app for now

export async function getUser() {
  const rows = await db.select().from(schema.users);
  return rows.find((u) => u.id === USER_ID)!;
}

export async function getSchedule() {
  const rows = await db.select().from(schema.schedule);
  return rows.filter((s) => s.userId === USER_ID);
}

export async function getWorkoutsWithExercises() {
  const allWorkouts = await db.select().from(schema.workouts);
  const workouts = allWorkouts.filter((w) => w.userId === USER_ID);
  const allExercises = await db.select().from(schema.exercises);
  return workouts.map((w) => ({
    ...w,
    exercises: allExercises
      .filter((e) => e.workoutId === w.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

export async function getPersonalRecords() {
  const rows = await db.select().from(schema.personalRecords);
  return rows.filter((p) => p.userId === USER_ID);
}

export async function getWeightLogs() {
  const rows = await db.select().from(schema.weightLogs);
  return rows.filter((w) => w.userId === USER_ID).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getMeasurements() {
  const rows = await db.select().from(schema.measurements);
  return rows.filter((m) => m.userId === USER_ID).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCardioLogs() {
  const rows = await db.select().from(schema.cardioLogs);
  return rows.filter((c) => c.userId === USER_ID).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getWorkoutLogsWithSets() {
  const allLogs = await db.select().from(schema.workoutLogs);
  const logs = allLogs.filter((l) => l.userId === USER_ID);
  const allSets = await db.select().from(schema.setLogs);
  return logs.map((l) => ({
    ...l,
    sets: allSets.filter((s) => s.workoutLogId === l.id),
  }));
}

export async function lastSetsForExercise(exerciseId: number) {
  const logs = (await getWorkoutLogsWithSets()).sort((a, b) => b.date.localeCompare(a.date));
  for (const log of logs) {
    const sets = log.sets.filter((s) => s.exerciseId === exerciseId);
    if (sets.length) return sets.sort((a, b) => a.setNumber - b.setNumber);
  }
  return null;
}

export { USER_ID };
