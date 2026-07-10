import { db, schema } from "@/db";

const USER_ID = 1; // single-user app for now

export function getUser() {
  return db.select().from(schema.users).all().find((u) => u.id === USER_ID)!;
}

export function getSchedule() {
  return db.select().from(schema.schedule).all().filter((s) => s.userId === USER_ID);
}

export function getWorkoutsWithExercises() {
  const workouts = db.select().from(schema.workouts).all().filter((w) => w.userId === USER_ID);
  const allExercises = db.select().from(schema.exercises).all();
  return workouts.map((w) => ({
    ...w,
    exercises: allExercises
      .filter((e) => e.workoutId === w.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

export function getPersonalRecords() {
  return db
    .select()
    .from(schema.personalRecords)
    .all()
    .filter((p) => p.userId === USER_ID);
}

export function getWeightLogs() {
  return db
    .select()
    .from(schema.weightLogs)
    .all()
    .filter((w) => w.userId === USER_ID)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getMeasurements() {
  return db
    .select()
    .from(schema.measurements)
    .all()
    .filter((m) => m.userId === USER_ID)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getCardioLogs() {
  return db
    .select()
    .from(schema.cardioLogs)
    .all()
    .filter((c) => c.userId === USER_ID)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getWorkoutLogsWithSets() {
  const logs = db
    .select()
    .from(schema.workoutLogs)
    .all()
    .filter((l) => l.userId === USER_ID);
  const allSets = db.select().from(schema.setLogs).all();
  return logs.map((l) => ({
    ...l,
    sets: allSets.filter((s) => s.workoutLogId === l.id),
  }));
}

export function lastSetsForExercise(exerciseId: number) {
  const logs = getWorkoutLogsWithSets().sort((a, b) => b.date.localeCompare(a.date));
  for (const log of logs) {
    const sets = log.sets.filter((s) => s.exerciseId === exerciseId);
    if (sets.length) return sets.sort((a, b) => a.setNumber - b.setNumber);
  }
  return null;
}

export { USER_ID };
