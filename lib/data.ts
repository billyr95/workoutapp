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

// Plain-text digest of the trailing 7 days, fed to the AI weekly review prompt.
export async function buildWeeklySummary(userId: number): Promise<string> {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const todayStr = today.toISOString().slice(0, 10);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);

  const schedule = await getSchedule(userId);
  const workouts = await getWorkoutsWithExercises(userId);
  const exerciseNameById = new Map<number, string>();
  workouts.forEach((w) => w.exercises.forEach((e) => exerciseNameById.set(e.id, e.name)));

  const logs = (await getWorkoutLogsWithSets(userId))
    .filter((l) => l.date >= weekAgoStr && l.date <= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  const cardio = (await getCardioLogs(userId)).filter((c) => c.date >= weekAgoStr && c.date <= todayStr);
  const weights = (await getWeightLogs(userId)).filter((w) => w.date >= weekAgoStr && w.date <= todayStr);
  const prs = (await getPersonalRecords(userId)).filter((p) => p.date >= weekAgoStr && p.date <= todayStr);

  const lines: string[] = [`Training window: ${weekAgoStr} to ${todayStr} (last 7 days).`];

  if (schedule.length > 0) {
    lines.push(
      "Weekly schedule: " +
        schedule.map((s) => `${s.day}: ${s.workoutType}${s.category ? ` (${s.category})` : ""}`).join("; ") +
        "."
    );
  }

  if (logs.length === 0) {
    lines.push("No workouts were logged this week.");
  } else {
    lines.push(`Logged ${logs.length} workout session(s) this week:`);
    for (const log of logs) {
      const workout = workouts.find((w) => w.id === log.workoutId);
      const byExercise = new Map<number, typeof log.sets>();
      for (const s of log.sets) {
        if (!byExercise.has(s.exerciseId)) byExercise.set(s.exerciseId, []);
        byExercise.get(s.exerciseId)!.push(s);
      }
      const exerciseSummaries = [...byExercise.entries()].map(([exId, sets]) => {
        const name = exerciseNameById.get(exId) ?? "Unknown exercise";
        const setsStr = [...sets].sort((a, b) => a.setNumber - b.setNumber).map((s) => `${s.weight}x${s.reps}`).join(", ");
        return `${name} (${setsStr})`;
      });
      lines.push(`- ${log.date}${workout ? ` [${workout.name}]` : ""}: ${exerciseSummaries.join("; ")}`);
    }
  }

  if (cardio.length > 0) {
    lines.push(
      "Cardio sessions: " +
        cardio.map((c) => `${c.date} ${c.type} ${c.durationMinutes}min${c.distance ? ` (${c.distance}mi)` : ""}`).join("; ") +
        "."
    );
  }

  if (weights.length > 0) {
    const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length >= 2) {
      const delta = sorted[sorted.length - 1].weight - sorted[0].weight;
      lines.push(
        `Weight went from ${sorted[0].weight}lb (${sorted[0].date}) to ${sorted[sorted.length - 1].weight}lb (${sorted[sorted.length - 1].date}), a change of ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}lb.`
      );
    } else {
      lines.push(`Weight logged once this week: ${sorted[0].weight}lb on ${sorted[0].date}.`);
    }
  } else {
    lines.push("No weigh-ins logged this week.");
  }

  if (prs.length > 0) {
    lines.push(
      "New personal records this week: " +
        prs.map((p) => `${p.exerciseName} ${p.weight}lb x ${p.reps} on ${p.date}`).join("; ") +
        "."
    );
  }

  return lines.join("\n");
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

// Who follows `targetId`, or who `targetId` follows — each entry annotated with whether
// the viewer follows them, so the list can render a follow/unfollow button inline.
export async function getConnections(targetId: number, direction: "followers" | "following", viewerId: number) {
  const [allFollows, allUsers] = await Promise.all([db.select().from(schema.follows), db.select().from(schema.users)]);
  const userById = new Map(allUsers.map((u) => [u.id, u]));

  const relatedIds =
    direction === "followers"
      ? allFollows.filter((f) => f.followingId === targetId).map((f) => f.followerId)
      : allFollows.filter((f) => f.followerId === targetId).map((f) => f.followingId);

  return relatedIds
    .map((id) => userById.get(id))
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      avatarUrl: u.avatarUrl,
      isSelf: u.id === viewerId,
      isFollowing: allFollows.some((f) => f.followerId === viewerId && f.followingId === u.id),
    }));
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

// ---- Coaching ----
// A coach only gets access to a client's data/mutations once a coachRelationships row
// between them is "active" (the client accepted the coach's invite).
export async function hasActiveCoachAccess(coachId: number, clientId: number): Promise<boolean> {
  const rows = await db.select().from(schema.coachRelationships);
  return rows.some((r) => r.coachId === coachId && r.clientId === clientId && r.status === "active");
}

export async function logProgramEdit(coachId: number, clientId: number, summary: string) {
  await db.insert(schema.programEditLog).values({ coachId, clientId, summary, createdAt: new Date().toISOString() });
}

// Active clients only, for the desktop sidebar's persistent client nav — server-side so it
// renders with the shell on first paint instead of popping in after a client fetch.
export async function getActiveCoachClients(coachId: number) {
  const [relationships, allUsers] = await Promise.all([db.select().from(schema.coachRelationships), db.select().from(schema.users)]);
  const userById = new Map(allUsers.map((u) => [u.id, u]));
  return relationships
    .filter((r) => r.coachId === coachId && r.status === "active")
    .map((r) => userById.get(r.clientId))
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map((u) => ({ username: u.username, name: u.name, avatarUrl: u.avatarUrl }));
}

export type ClientDashboardStats = {
  lastActivityDate: string | null;
  daysSinceActivity: number | null;
  workoutsThisWeek: number;
  scheduledDaysThisWeek: number;
  completedDaysThisWeek: number;
  weightTrend: { direction: "up" | "down" | "flat" | null; onTrack: boolean | null };
};

// Powers the coaching dashboard's "going quiet" flags, adherence rate, and weight-trend
// indicator — takes each table pre-filtered to one client so the coach dashboard route can
// fetch every table once and reuse it across all of its clients, instead of re-querying per client.
export function computeClientDashboardStats(
  client: { startingWeight: number; goalWeight: number },
  workoutLogs: { date: string }[],
  cardioLogs: { date: string }[],
  schedule: { day: string; workoutType: string }[],
  weightLogs: { date: string; weight: number }[]
): ClientDashboardStats {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const activityDates = new Set([...workoutLogs.map((l) => l.date), ...cardioLogs.map((c) => c.date)]);
  const lastActivityDate = activityDates.size > 0 ? [...activityDates].reduce((max, d) => (d > max ? d : max)) : null;
  const daysSinceActivity = lastActivityDate
    ? Math.floor((new Date(todayStr).getTime() - new Date(lastActivityDate).getTime()) / 86400000)
    : null;

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);
  const workoutsThisWeek = workoutLogs.filter((l) => l.date >= weekAgoStr).length;

  // Adherence: for each of the trailing 7 calendar days that the client's weekly split actually
  // scheduled as a workout/cardio day (not Rest), did they log anything that day?
  const scheduledByDay = new Map(schedule.map((s) => [s.day, s.workoutType !== "Rest"]));
  let scheduledDaysThisWeek = 0;
  let completedDaysThisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayName = VALID_DAYS[d.getDay()];
    if (!scheduledByDay.get(dayName)) continue;
    scheduledDaysThisWeek++;
    if (activityDates.has(d.toISOString().slice(0, 10))) completedDaysThisWeek++;
  }

  // Weight trend over the last 30 days, checked against whether their stated goal is to
  // gain or lose relative to their starting weight (flat goal = no meaningful "on track").
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthAgoStr = monthAgo.toISOString().slice(0, 10);
  const recentWeights = weightLogs.filter((w) => w.date >= monthAgoStr).sort((a, b) => a.date.localeCompare(b.date));
  let direction: "up" | "down" | "flat" | null = null;
  if (recentWeights.length >= 2) {
    const delta = recentWeights[recentWeights.length - 1].weight - recentWeights[0].weight;
    direction = delta > 0.5 ? "up" : delta < -0.5 ? "down" : "flat";
  }
  const goalDirection = client.goalWeight > client.startingWeight ? "gain" : client.goalWeight < client.startingWeight ? "lose" : "maintain";
  let onTrack: boolean | null = null;
  if (direction !== null && goalDirection !== "maintain") {
    onTrack = (goalDirection === "gain" && direction === "up") || (goalDirection === "lose" && direction === "down");
  }

  return {
    lastActivityDate,
    daysSinceActivity,
    workoutsThisWeek,
    scheduledDaysThisWeek,
    completedDaysThisWeek,
    weightTrend: { direction, onTrack },
  };
}

type MutationResult<T> = { ok: true; data: T; summary: string } | { ok: false; error: string; status: number; errors?: string[] };

// Shared by the self-service /api/schedule route (targetUserId = session user) and the
// coach-scoped /api/coach/clients/[clientId]/schedule route (targetUserId = the client) —
// same upsert semantics either way, only the caller's authorization differs.
export async function upsertScheduleDay(
  targetUserId: number,
  day: string,
  type: "Rest" | "Cardio" | "Workout",
  name?: string,
  category?: string
): Promise<MutationResult<null>> {
  if (!VALID_DAYS.includes(day)) return { ok: false, error: "Invalid day", status: 400 };

  let workoutType: string;
  let categoryValue: string | null;

  if (type === "Rest") {
    workoutType = "Rest";
    categoryValue = null;
  } else if (type === "Cardio") {
    workoutType = "Cardio";
    categoryValue = null;
  } else if (type === "Workout") {
    const trimmedName = (name ?? "").trim();
    if (!trimmedName) return { ok: false, error: "Workout name is required", status: 400 };
    if (category !== "Strength" && category !== "Hypertrophy") {
      return { ok: false, error: "Category must be Strength or Hypertrophy", status: 400 };
    }
    workoutType = trimmedName;
    categoryValue = category;

    const allWorkouts = await db.select().from(schema.workouts);
    const existingWorkout = allWorkouts.find((w) => w.userId === targetUserId && w.name === trimmedName);
    if (!existingWorkout) {
      await db.insert(schema.workouts).values({ userId: targetUserId, name: trimmedName });
      // Brand new workout for this user — no exercises yet, but the name itself is worth recording.
      await recordCommunityWorkout(trimmedName, [], targetUserId);
    }
  } else {
    return { ok: false, error: "Invalid type", status: 400 };
  }

  const allSchedule = await db.select().from(schema.schedule);
  const existingDay = allSchedule.find((s) => s.userId === targetUserId && s.day === day);
  if (existingDay) {
    await db.update(schema.schedule).set({ workoutType, category: categoryValue }).where(eq(schema.schedule.id, existingDay.id));
  } else {
    await db.insert(schema.schedule).values({ userId: targetUserId, day, workoutType, category: categoryValue });
  }

  return { ok: true, data: null, summary: `Set ${day} to ${workoutType}${categoryValue ? ` (${categoryValue})` : ""}` };
}

export async function addExerciseToWorkout(
  targetUserId: number,
  workoutId: number,
  input: { name: string; sets: number; repMin: number; repMax: number; restSeconds: number | null }
): Promise<MutationResult<typeof schema.exercises.$inferSelect>> {
  const { name, sets, repMin, repMax, restSeconds } = input;
  if (!workoutId || !name || !sets || !repMin || !repMax) {
    return { ok: false, error: "Missing required fields", status: 400 };
  }

  const allWorkouts = await db.select().from(schema.workouts);
  const workout = allWorkouts.find((w) => w.id === workoutId);
  if (!workout || workout.userId !== targetUserId) {
    return { ok: false, error: "Not found", status: 404 };
  }

  const allExercises = await db.select().from(schema.exercises);
  const existingCount = allExercises.filter((e) => e.workoutId === workoutId).length;

  const [row] = await db
    .insert(schema.exercises)
    .values({ workoutId, name, sets, repMin, repMax, restSeconds: restSeconds ?? null, sortOrder: existingCount })
    .returning();

  await recordCommunityExercise(name, sets, repMin, repMax, restSeconds ?? null, targetUserId);
  const siblingExercises = [...allExercises.filter((e) => e.workoutId === workoutId), row].sort((a, b) => a.sortOrder - b.sortOrder);
  await recordCommunityWorkout(
    workout.name,
    siblingExercises.map((e) => ({ name: e.name, sets: e.sets, repMin: e.repMin, repMax: e.repMax, restSeconds: e.restSeconds })),
    targetUserId
  );

  return { ok: true, data: row, summary: `Added ${name} to ${workout.name}` };
}

export async function updateExerciseById(
  targetUserId: number,
  id: number,
  input: { name: string; sets: number; repMin: number; repMax: number; restSeconds: number | null }
): Promise<MutationResult<typeof schema.exercises.$inferSelect>> {
  const { name, sets, repMin, repMax, restSeconds } = input;
  if (!id || !name || !sets || !repMin || !repMax) {
    return { ok: false, error: "Missing required fields", status: 400 };
  }

  const allExercises = await db.select().from(schema.exercises);
  const exercise = allExercises.find((e) => e.id === id);
  if (!exercise) return { ok: false, error: "Not found", status: 404 };

  const allWorkouts = await db.select().from(schema.workouts);
  const workout = allWorkouts.find((w) => w.id === exercise.workoutId);
  if (!workout || workout.userId !== targetUserId) {
    return { ok: false, error: "Not found", status: 404 };
  }

  const [row] = await db
    .update(schema.exercises)
    .set({ name, sets, repMin, repMax, restSeconds: restSeconds ?? null })
    .where(eq(schema.exercises.id, id))
    .returning();

  await recordCommunityExercise(name, sets, repMin, repMax, restSeconds ?? null, targetUserId);
  const siblingExercises = allExercises
    .filter((e) => e.workoutId === exercise.workoutId)
    .map((e) => (e.id === id ? row : e))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  await recordCommunityWorkout(
    workout.name,
    siblingExercises.map((e) => ({ name: e.name, sets: e.sets, repMin: e.repMin, repMax: e.repMax, restSeconds: e.restSeconds })),
    targetUserId
  );

  return { ok: true, data: row, summary: `Updated ${name} in ${workout.name}` };
}

export async function removeExerciseById(targetUserId: number, id: number): Promise<MutationResult<null>> {
  if (!id) return { ok: false, error: "Missing id", status: 400 };

  const allExercises = await db.select().from(schema.exercises);
  const exercise = allExercises.find((e) => e.id === id);
  if (!exercise) return { ok: false, error: "Not found", status: 404 };

  const allWorkouts = await db.select().from(schema.workouts);
  const workout = allWorkouts.find((w) => w.id === exercise.workoutId);
  if (!workout || workout.userId !== targetUserId) {
    return { ok: false, error: "Not found", status: 404 };
  }

  await db.delete(schema.exercises).where(eq(schema.exercises.id, id));

  const remaining = allExercises.filter((e) => e.workoutId === exercise.workoutId && e.id !== id).sort((a, b) => a.sortOrder - b.sortOrder);
  await recordCommunityWorkout(
    workout.name,
    remaining.map((e) => ({ name: e.name, sets: e.sets, repMin: e.repMin, repMax: e.repMax, restSeconds: e.restSeconds })),
    targetUserId
  );

  return { ok: true, data: null, summary: `Removed ${exercise.name} from ${workout.name}` };
}

// Shared by the self-service /api/programs routes (targetUserId = session user) and the
// coach-scoped /api/coach/clients/[clientId]/programs routes (targetUserId = the client).
export async function listPrograms(targetUserId: number) {
  const allPrograms = await db.select().from(schema.programs);
  return allPrograms
    .filter((p) => p.userId === targetUserId)
    .map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// body.data omitted = snapshot the target's current live schedule/workouts (and make it their
// active program); body.data provided (from the builder or an XML upload) = save unapplied.
export async function saveProgram(
  targetUserId: number,
  name: string,
  providedData?: unknown
): Promise<MutationResult<{ id: number; name: string; createdAt: string; errors: string[] }>> {
  const trimmedName = name.trim();
  if (!trimmedName) return { ok: false, error: "Program name is required", status: 400 };

  const usingProvidedData = providedData !== undefined;
  let errors: string[] = [];
  let data: ProgramData;
  if (usingProvidedData) {
    const validated = validateProgramData(providedData);
    data = validated.data;
    errors = validated.errors;
    if (data.schedule.length === 0 && data.workouts.length === 0) {
      return { ok: false, error: "Program has no valid schedule days or workouts", status: 400, errors };
    }
  } else {
    data = await getProgramSnapshot(targetUserId);
  }

  const [row] = await db
    .insert(schema.programs)
    .values({ userId: targetUserId, name: trimmedName, data, createdAt: new Date().toISOString() })
    .returning();
  await recordCommunityProgram(data, targetUserId);

  if (!usingProvidedData) {
    // Saving the current setup means that's the program they're now "on."
    await db.update(schema.users).set({ activeProgramId: row.id }).where(eq(schema.users.id, targetUserId));
  }

  return {
    ok: true,
    data: { id: row.id, name: row.name, createdAt: row.createdAt, errors },
    summary: `Saved program "${trimmedName}"`,
  };
}

export async function deleteProgram(targetUserId: number, id: number): Promise<MutationResult<null>> {
  if (!id) return { ok: false, error: "Missing id", status: 400 };

  const allPrograms = await db.select().from(schema.programs);
  const program = allPrograms.find((p) => p.id === id);
  if (!program || program.userId !== targetUserId) return { ok: false, error: "Not found", status: 404 };

  await db.delete(schema.programs).where(eq(schema.programs.id, id));

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, targetUserId));
  if (user?.activeProgramId === id) {
    await db.update(schema.users).set({ activeProgramId: null }).where(eq(schema.users.id, targetUserId));
  }

  return { ok: true, data: null, summary: `Deleted program "${program.name}"` };
}

// Applies a saved program on top of the target's live schedule/workouts. Existing
// workouts/exercises are matched by name and updated in place (never deleted) so
// historical logs and progress-graph data never get orphaned by loading a program.
export async function loadProgram(targetUserId: number, programId: number): Promise<MutationResult<null>> {
  if (!programId) return { ok: false, error: "Missing programId", status: 400 };

  const allPrograms = await db.select().from(schema.programs);
  const program = allPrograms.find((p) => p.id === programId);
  if (!program || program.userId !== targetUserId) return { ok: false, error: "Not found", status: 404 };

  const { schedule, workouts } = program.data;

  for (const w of workouts) {
    const allWorkouts = await db.select().from(schema.workouts);
    let workout = allWorkouts.find((existing) => existing.userId === targetUserId && existing.name === w.name);
    if (!workout) {
      [workout] = await db.insert(schema.workouts).values({ userId: targetUserId, name: w.name }).returning();
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
    const existingDay = allSchedule.find((row) => row.userId === targetUserId && row.day === s.day);
    if (existingDay) {
      await db.update(schema.schedule).set({ workoutType: s.workoutType, category: s.category }).where(eq(schema.schedule.id, existingDay.id));
    } else {
      await db.insert(schema.schedule).values({ userId: targetUserId, day: s.day, workoutType: s.workoutType, category: s.category });
    }
  }

  await db.update(schema.users).set({ activeProgramId: programId }).where(eq(schema.users.id, targetUserId));

  return { ok: true, data: null, summary: `Loaded program "${program.name}"` };
}
