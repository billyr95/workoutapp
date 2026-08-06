import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ProgramData, ProgramExercise, ProgramWorkout } from "@/db/schema";

const VALID_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function getUser(userId: number) {
  const rows = await db.select().from(schema.users);
  const u = rows.find((u) => u.id === userId)!;
  // Explicit field list — never send the password hash to the client.
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    avatarUrl: u.avatarUrl,
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
    showWeight: u.showWeight,
    showProgram: u.showProgram,
    showMaxes: u.showMaxes,
    showWorkoutDays: u.showWorkoutDays,
    activeProgramId: u.activeProgramId,
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

export async function getProgramSnapshot(userId: number): Promise<ProgramData> {
  const schedule = await getSchedule(userId);
  const workouts = await getWorkoutsWithExercises(userId);
  return {
    schedule: schedule.map((s) => ({ day: s.day, workoutType: s.workoutType, category: s.category })),
    workouts: workouts.map((w) => ({
      name: w.name,
      exercises: w.exercises.map((e) => ({
        name: e.name,
        sets: e.sets,
        repMin: e.repMin,
        repMax: e.repMax,
        restSeconds: e.restSeconds,
      })),
    })),
  };
}

export async function lastSetsForExercise(userId: number, exerciseId: number) {
  const logs = (await getWorkoutLogsWithSets(userId)).sort((a, b) => b.date.localeCompare(a.date));
  for (const log of logs) {
    const sets = log.sets.filter((s) => s.exerciseId === exerciseId);
    if (sets.length) return sets.sort((a, b) => a.setNumber - b.setNumber);
  }
  return null;
}

// Community library — every exercise/workout name ever entered, deduped by name,
// so anyone building a program can search and drag in what others have already typed.

export async function recordCommunityExercise(
  name: string,
  sets: number,
  repMin: number,
  repMax: number,
  restSeconds: number | null,
  userId: number
) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const existing = (await db.select().from(schema.communityExercises)).find((e) => e.name === trimmed);
  const updatedAt = new Date().toISOString();
  if (existing) {
    await db
      .update(schema.communityExercises)
      .set({ sets, repMin, repMax, restSeconds, contributedBy: userId, useCount: existing.useCount + 1, updatedAt })
      .where(eq(schema.communityExercises.id, existing.id));
  } else {
    await db
      .insert(schema.communityExercises)
      .values({ name: trimmed, sets, repMin, repMax, restSeconds, contributedBy: userId, useCount: 1, updatedAt });
  }
}

export async function recordCommunityWorkout(name: string, exercises: ProgramExercise[], userId: number) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const existing = (await db.select().from(schema.communityWorkouts)).find((w) => w.name === trimmed);
  const updatedAt = new Date().toISOString();
  if (existing) {
    // Never let an empty list stomp exercises someone already recorded for this name —
    // the community list only accumulates, it doesn't mirror the latest editor's state.
    const nextExercises = exercises.length > 0 ? exercises : existing.exercises;
    await db
      .update(schema.communityWorkouts)
      .set({ exercises: nextExercises, contributedBy: userId, useCount: existing.useCount + 1, updatedAt })
      .where(eq(schema.communityWorkouts.id, existing.id));
  } else {
    await db.insert(schema.communityWorkouts).values({ name: trimmed, exercises, contributedBy: userId, useCount: 1, updatedAt });
  }
}

export async function recordCommunityProgram(data: ProgramData, userId: number) {
  for (const w of data.workouts) {
    await recordCommunityWorkout(w.name, w.exercises, userId);
    for (const e of w.exercises) {
      await recordCommunityExercise(e.name, e.sets, e.repMin, e.repMax, e.restSeconds, userId);
    }
  }
}

export async function getCommunityExercises(q?: string) {
  const rows = await db.select().from(schema.communityExercises);
  const filtered = q ? rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())) : rows;
  return filtered.sort((a, b) => b.useCount - a.useCount || a.name.localeCompare(b.name)).slice(0, 30);
}

export async function getCommunityWorkouts(q?: string) {
  const rows = await db.select().from(schema.communityWorkouts);
  const filtered = q ? rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())) : rows;
  return filtered.sort((a, b) => b.useCount - a.useCount || a.name.localeCompare(b.name)).slice(0, 30);
}

function clampInt(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// Defensively reshapes/validates an arbitrary payload (from a hand-built XML file or
// the from-scratch program builder) into well-formed ProgramData, dropping anything
// malformed rather than trusting client-side validation alone.
export function validateProgramData(raw: unknown): { data: ProgramData; errors: string[] } {
  const errors: string[] = [];
  const r = (raw ?? {}) as { schedule?: unknown; workouts?: unknown };
  const scheduleIn = Array.isArray(r.schedule) ? r.schedule : [];
  const workoutsIn = Array.isArray(r.workouts) ? r.workouts : [];

  const workoutNames = new Set<string>();
  const workouts: ProgramWorkout[] = [];
  for (const wRaw of workoutsIn.slice(0, 40)) {
    const w = (wRaw ?? {}) as { name?: unknown; exercises?: unknown };
    const name = typeof w.name === "string" ? w.name.trim().slice(0, 80) : "";
    if (!name) {
      errors.push("Skipped a workout with no name.");
      continue;
    }
    if (workoutNames.has(name)) {
      errors.push(`Duplicate workout name "${name}" — kept the first.`);
      continue;
    }

    const exercisesIn = Array.isArray(w.exercises) ? w.exercises : [];
    const exercises: ProgramExercise[] = [];
    for (const eRaw of exercisesIn.slice(0, 40)) {
      const e = (eRaw ?? {}) as { name?: unknown; sets?: unknown; repMin?: unknown; repMax?: unknown; restSeconds?: unknown };
      const exName = typeof e.name === "string" ? e.name.trim().slice(0, 80) : "";
      const sets = clampInt(e.sets, 1, 20);
      const repMin = clampInt(e.repMin, 1, 100);
      const repMax = clampInt(e.repMax, 1, 100);
      if (!exName || sets == null || repMin == null || repMax == null) {
        errors.push(`Skipped exercise "${exName || "(unnamed)"}" in "${name}" — needs a name, sets, repMin, and repMax.`);
        continue;
      }
      exercises.push({
        name: exName,
        sets,
        repMin: Math.min(repMin, repMax),
        repMax: Math.max(repMin, repMax),
        restSeconds: clampInt(e.restSeconds, 0, 1800),
      });
    }

    workoutNames.add(name);
    workouts.push({ name, exercises });
  }

  const usedDays = new Set<string>();
  const schedule: ProgramData["schedule"] = [];
  for (const sRaw of scheduleIn.slice(0, 7)) {
    const s = (sRaw ?? {}) as { day?: unknown; workoutType?: unknown; category?: unknown };
    const day = typeof s.day === "string" ? s.day : "";
    if (!VALID_DAYS.includes(day)) {
      errors.push(`Skipped invalid day "${day}".`);
      continue;
    }
    if (usedDays.has(day)) {
      errors.push(`Duplicate schedule entry for ${day} — kept the first.`);
      continue;
    }
    const workoutType = typeof s.workoutType === "string" ? s.workoutType.trim().slice(0, 80) : "";
    if (!workoutType) {
      errors.push(`Skipped ${day} — missing a workout type (Rest, Cardio, or a workout name).`);
      continue;
    }
    let category: string | null = null;
    if (workoutType !== "Rest" && workoutType !== "Cardio") {
      category = s.category === "Hypertrophy" ? "Hypertrophy" : "Strength";
    }
    usedDays.add(day);
    schedule.push({ day, workoutType, category });
  }

  return { data: { schedule, workouts }, errors };
}
