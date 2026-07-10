import { db, schema } from "@/db";

export async function getUser(userId: number) {
  const rows = await db.select().from(schema.users);
  const u = rows.find((u) => u.id === userId)!;
  // Explicit field list — never send the password hash to the client.
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    heightFeet: u.heightFeet,
    heightInches: u.heightInches,
    startingWeight: u.startingWeight,
    goalWeight: u.goalWeight,
    goalText: u.goalText,
    calories: u.calories,
    protein: u.protein,
    carbs: u.carbs,
    fat: u.fat,
  };
}

export async function getSchedule(userId: number) {
  const rows = await db.select().from(schema.schedule);
  return rows.filter((s) => s.userId === userId);
}

export async function getWorkoutsWithExercises(userId: number) {
  const allWorkouts = await db.select().from(schema.workouts);
  const workouts = allWorkouts.filter((w) => w.userId === userId);
  const allExercises = await db.select().from(schema.exercises);
  return workouts.map((w) => ({
    ...w,
    exercises: allExercises
      .filter((e) => e.workoutId === w.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

export async function getPersonalRecords(userId: number) {
  const rows = await db.select().from(schema.personalRecords);
  return rows.filter((p) => p.userId === userId);
}

export async function getWeightLogs(userId: number) {
  const rows = await db.select().from(schema.weightLogs);
  return rows.filter((w) => w.userId === userId).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getMeasurements(userId: number) {
  const rows = await db.select().from(schema.measurements);
  return rows.filter((m) => m.userId === userId).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCardioLogs(userId: number) {
  const rows = await db.select().from(schema.cardioLogs);
  return rows.filter((c) => c.userId === userId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getWorkoutLogsWithSets(userId: number) {
  const allLogs = await db.select().from(schema.workoutLogs);
  const logs = allLogs.filter((l) => l.userId === userId);
  const allSets = await db.select().from(schema.setLogs);
  return logs.map((l) => ({
    ...l,
    sets: allSets.filter((s) => s.workoutLogId === l.id),
  }));
}

export async function lastSetsForExercise(userId: number, exerciseId: number) {
  const logs = (await getWorkoutLogsWithSets(userId)).sort((a, b) => b.date.localeCompare(a.date));
  for (const log of logs) {
    const sets = log.sets.filter((s) => s.exerciseId === exerciseId);
    if (sets.length) return sets.sort((a, b) => a.setNumber - b.setNumber);
  }
  return null;
}
