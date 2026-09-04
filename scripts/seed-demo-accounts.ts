// Creates (or resets) two demo accounts for portfolio/interview walkthroughs, each backfilled
// with a full year (DAYS_OF_HISTORY) of logged sessions:
//   - demo_coach ("Jordan Blake"): a coach with their own populated training history AND an
//     active client relationship to demo_client, so the coaching dashboard shows real data —
//     history, weight trend, PRs, a flagged edit, and coach notes.
//   - demo_client ("Sam Reyes"): the coach's one client, populated the same way. Not meant to
//     be logged into directly, but has its own real credentials if you want to see that side too.
//
// Safe to re-run any time: fully deletes both accounts and everything tied to them, then
// rebuilds from scratch — run it before a demo/interview to reset to a clean state.
//
// Run with: npx tsx --env-file=.env.local scripts/seed-demo-accounts.ts

import { hash } from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../db";
import { saveProgram, loadProgram } from "../lib/data";
import { starterProgramSeeds } from "../db/starterProgramSeeds";
import type { ProgramWorkout } from "../db/schema";

const DEMO_PASSWORD = "RepraDemo2026!";
const DAYS_OF_HISTORY = 365;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Real gyms move in 2.5lb (or 5lb on barbells) increments, not arbitrary decimals.
function roundToPlate(weight: number, step: number) {
  return Math.max(0, Math.round(weight / step) * step);
}

type ExerciseProfile = { startWeight: number; gainRate: number; noise: number; plateStep: number };

// Each exercise gets its OWN randomized starting point and pace — so "Hip Thrust" and "Leg
// Extension" (both nominally "isolation") don't end up converging on the same number just
// because they're in the same rough category. Generated once per exercise and reused across
// every session so a given lift still has a consistent identity/trajectory, not pure noise.
// gainRate scales with sqrt(weeks) — see weightForSession — so a full year lands on a plausible
// total gain (newbie-fast early progress that tapers into a plateau) instead of linear-forever.
function profileFor(name: string): ExerciseProfile {
  const n = name.toLowerCase();
  if (n.includes("squat") || n.includes("deadlift")) {
    return { startWeight: randRange(95, 145), gainRate: randRange(6, 11), noise: 8, plateStep: 5 };
  }
  if ((n.includes("bench press") && !n.includes("dumbbell") && !n.includes("machine") && !n.includes("incline")) || n.includes("overhead press") || n.includes("barbell row")) {
    return { startWeight: randRange(55, 90), gainRate: randRange(3.5, 7), noise: 6, plateStep: 5 };
  }
  if (n.includes("pull-up") || n.includes("push-up") || n.includes("dip")) {
    return { startWeight: randRange(0, 15), gainRate: randRange(0.5, 2.5), noise: 3, plateStep: 2.5 };
  }
  return { startWeight: randRange(10, 45), gainRate: randRange(2, 4.5), noise: 6, plateStep: 2.5 };
}

// Trend-plus-noise instead of a clean staircase: fast early progress that decelerates over the
// year (sqrt curve — real newbie-gains-then-plateau shape, not a straight line to infinity),
// plus any given session can land a little heavier or lighter than the trend, same as real logs.
function weightForSession(profile: ExerciseProfile, weekIndex: number) {
  const trend = profile.startWeight + profile.gainRate * Math.sqrt(weekIndex);
  const jittered = trend + randRange(-profile.noise, profile.noise);
  const floor = Math.max(0, profile.startWeight * 0.7);
  return roundToPlate(Math.max(floor, jittered), profile.plateStep);
}

// Set 1 usually lands near the top of the rep range (occasionally hits it exactly, sometimes
// a couple under), with fatigue dropping later sets by a randomized amount rather than a fixed 1.
function repsForSet(repMin: number, repMax: number, setNumber: number) {
  const top = repMax - Math.round(randRange(0, Math.min(2, repMax - repMin)));
  const fatigue = (setNumber - 1) * Math.round(randRange(1, 2));
  return Math.max(repMin, Math.min(repMax, top - fatigue));
}

async function deleteAccountIfExists(username: string) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
  if (!user) return;
  const id = user.id;

  const workouts = await db.select().from(schema.workouts).where(eq(schema.workouts.userId, id));
  const workoutIds = workouts.map((w) => w.id);
  const logs = await db.select().from(schema.workoutLogs).where(eq(schema.workoutLogs.userId, id));
  const logIds = logs.map((l) => l.id);

  if (logIds.length) await db.delete(schema.setLogs).where(inArray(schema.setLogs.workoutLogId, logIds));
  await db.delete(schema.workoutLogs).where(eq(schema.workoutLogs.userId, id));
  if (workoutIds.length) await db.delete(schema.exercises).where(inArray(schema.exercises.workoutId, workoutIds));
  await db.delete(schema.workouts).where(eq(schema.workouts.userId, id));
  await db.delete(schema.schedule).where(eq(schema.schedule.userId, id));
  await db.delete(schema.programs).where(eq(schema.programs.userId, id));
  await db.delete(schema.weightLogs).where(eq(schema.weightLogs.userId, id));
  await db.delete(schema.measurements).where(eq(schema.measurements.userId, id));
  await db.delete(schema.personalRecords).where(eq(schema.personalRecords.userId, id));
  await db.delete(schema.cardioLogs).where(eq(schema.cardioLogs.userId, id));
  await db.delete(schema.follows).where(eq(schema.follows.followerId, id));
  await db.delete(schema.follows).where(eq(schema.follows.followingId, id));
  await db.delete(schema.dailyInsights).where(eq(schema.dailyInsights.userId, id));
  await db.delete(schema.aiReviews).where(eq(schema.aiReviews.userId, id));
  await db.delete(schema.coachNotes).where(eq(schema.coachNotes.coachId, id));
  await db.delete(schema.coachNotes).where(eq(schema.coachNotes.clientId, id));
  await db.delete(schema.programEditLog).where(eq(schema.programEditLog.coachId, id));
  await db.delete(schema.programEditLog).where(eq(schema.programEditLog.clientId, id));
  await db.delete(schema.coachRelationships).where(eq(schema.coachRelationships.coachId, id));
  await db.delete(schema.coachRelationships).where(eq(schema.coachRelationships.clientId, id));
  await db.delete(schema.users).where(eq(schema.users.id, id));
}

async function createAccount(opts: {
  name: string;
  username: string;
  email: string;
  isCoach: boolean;
  heightFeet: number;
  heightInches: number;
  startingWeight: number;
  goalWeight: number;
  goalText: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  const passwordHash = await hash(DEMO_PASSWORD, 10);
  const [user] = await db
    .insert(schema.users)
    .values({
      ...opts,
      passwordHash,
      showWeight: true,
      showProgram: true,
      showMaxes: true,
      showWorkoutDays: true,
    })
    .returning();
  return user;
}

// Inserts rows in chunks instead of one round-trip per row/session — a full year of daily
// sessions is thousands of rows, and Neon's HTTP driver is latency- not throughput-bound.
async function batchInsert<T extends Record<string, unknown>>(
  table: Parameters<typeof db.insert>[0],
  rows: T[],
  batchSize: number,
  withReturning: boolean
) {
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    if (withReturning) {
      out.push(...(await db.insert(table).values(chunk).returning()));
    } else {
      await db.insert(table).values(chunk);
    }
  }
  return out;
}

// Applies a starter template and backfills DAYS_OF_HISTORY of logged sessions with weight that
// climbs fastest early and tapers off, plus weigh-ins trending toward the account's goal.
async function populateTraining(userId: number, starterSlug: string, startingWeight: number, goalWeight: number) {
  const starter = starterProgramSeeds.find((s) => s.slug === starterSlug)!;
  const saved = await saveProgram(userId, starter.name, starter.data);
  if (!saved.ok) throw new Error(`saveProgram failed for user ${userId}: ${saved.error}`);
  const loaded = await loadProgram(userId, saved.data.id);
  if (!loaded.ok) throw new Error(`loadProgram failed for user ${userId}: ${loaded.error}`);

  const workoutRows = await db.select().from(schema.workouts).where(eq(schema.workouts.userId, userId));
  const workoutIdByName = new Map(workoutRows.map((w) => [w.name, w.id]));
  const exerciseRows = await db.select().from(schema.exercises).where(inArray(schema.exercises.workoutId, workoutRows.map((w) => w.id)));
  const exerciseIdByName = new Map(exerciseRows.map((e) => [e.name, e.id]));
  const workoutByName = new Map<string, ProgramWorkout>(starter.data.workouts.map((w) => [w.name, w]));

  // One randomized trajectory per exercise, reused across every session it appears in.
  const profileByExercise = new Map<string, ExerciseProfile>();
  for (const w of starter.data.workouts) {
    for (const ex of w.exercises) {
      if (!profileByExercise.has(ex.name)) profileByExercise.set(ex.name, profileFor(ex.name));
    }
  }

  const today = new Date();
  const totalDays = DAYS_OF_HISTORY;

  // Pass 1: figure out which days are real sessions (no DB calls yet).
  const sessionDays: { dateStr: string; workoutId: number; workout: ProgramWorkout; weekIndex: number }[] = [];
  for (let daysAgo = totalDays; daysAgo >= 1; daysAgo--) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const dayName = DAY_NAMES[d.getDay()];
    const sched = starter.data.schedule.find((s) => s.day === dayName);
    if (!sched || sched.workoutType === "Rest" || sched.workoutType === "Cardio") continue;

    const workout = workoutByName.get(sched.workoutType);
    const workoutId = workoutIdByName.get(sched.workoutType);
    if (!workout || !workoutId) continue;

    sessionDays.push({ dateStr: isoDate(d), workoutId, workout, weekIndex: (totalDays - daysAgo) / 7 });
  }

  // Pass 2: bulk-insert one workoutLogs row per session, in order, so the returned ids line up
  // positionally with sessionDays — safe here since nothing else writes to this table concurrently.
  const insertedLogs = await batchInsert(
    schema.workoutLogs,
    sessionDays.map((s) => ({ userId, date: s.dateStr, workoutId: s.workoutId })),
    200,
    true
  );

  // Pass 3: build every set for every session, then bulk-insert once at the end.
  const loggedByExercise = new Map<string, { weight: number; reps: number; date: string }>();
  const allSets: { workoutLogId: number; exerciseId: number; setNumber: number; weight: number; reps: number }[] = [];
  for (let i = 0; i < sessionDays.length; i++) {
    const { workout, weekIndex, dateStr } = sessionDays[i];
    const workoutLogId = insertedLogs[i].id as number;
    for (const ex of workout.exercises) {
      const exerciseId = exerciseIdByName.get(ex.name);
      if (!exerciseId) continue;
      const profile = profileByExercise.get(ex.name)!;
      const weight = weightForSession(profile, weekIndex);
      let firstSetReps = ex.repMax;
      for (let setNumber = 1; setNumber <= ex.sets; setNumber++) {
        const reps = repsForSet(ex.repMin, ex.repMax, setNumber);
        if (setNumber === 1) firstSetReps = reps;
        allSets.push({ workoutLogId, exerciseId, setNumber, weight, reps });
      }
      const prev = loggedByExercise.get(ex.name);
      if (!prev || weight >= prev.weight) loggedByExercise.set(ex.name, { weight, reps: firstSetReps, date: dateStr });
    }
  }
  await batchInsert(schema.setLogs, allSets, 500, false);

  // Weigh-ins every 2-3 days, wobbling around the trend line toward the goal (never quite
  // reaching it) — real body weight fluctuates day to day, not a ruler-straight line.
  const weightLogValues = [];
  for (let daysAgo = totalDays; daysAgo >= 0; daysAgo -= Math.round(randRange(2, 3))) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const progress = (totalDays - daysAgo) / (totalDays + 10); // stops short of the goal
    const trend = startingWeight + (goalWeight - startingWeight) * progress;
    const weight = Math.round((trend + randRange(-1.3, 1.3)) * 10) / 10;
    weightLogValues.push({ userId, date: isoDate(d), weight });
  }
  await batchInsert(schema.weightLogs, weightLogValues, 200, false);

  // PRs: the heaviest set actually logged per exercise, matching what /api/workouts' PR
  // detection would have produced if these sessions had been logged one at a time for real.
  const prValues = [...loggedByExercise.entries()].map(([exerciseName, pr]) => ({
    userId,
    exerciseName,
    weight: pr.weight,
    reps: pr.reps,
    date: pr.date,
  }));
  if (prValues.length) await batchInsert(schema.personalRecords, prValues, 200, false);

  const lastWorkoutLogId = insertedLogs.length ? (insertedLogs[insertedLogs.length - 1].id as number) : null;
  return { lastWorkoutLogId };
}

async function main() {
  await deleteAccountIfExists("demo_coach");
  await deleteAccountIfExists("demo_client");

  const coach = await createAccount({
    name: "Jordan Blake",
    username: "demo_coach",
    email: "demo.coach@repra.xyz",
    isCoach: true,
    heightFeet: 5,
    heightInches: 11,
    startingWeight: 190,
    goalWeight: 180,
    goalText: "Lean out while holding onto strength",
    calories: 2400,
    protein: 190,
    carbs: 220,
    fat: 70,
  });

  const client = await createAccount({
    name: "Sam Reyes",
    username: "demo_client",
    email: "demo.client@repra.xyz",
    isCoach: false,
    heightFeet: 5,
    heightInches: 8,
    startingWeight: 165,
    goalWeight: 175,
    goalText: "Build muscle, get a 225 bench",
    calories: 2800,
    protein: 170,
    carbs: 320,
    fat: 80,
  });

  await populateTraining(coach.id, "upper-lower-4", 190, 180);
  const { lastWorkoutLogId } = await populateTraining(client.id, "ppl-6", 165, 175);

  const clientLogs = await db.select().from(schema.workoutLogs).where(eq(schema.workoutLogs.userId, client.id));
  const sortedLogs = [...clientLogs].sort((a, b) => b.date.localeCompare(a.date));
  const recentLogId = lastWorkoutLogId ?? sortedLogs[0]?.id ?? null;
  const olderLogId = sortedLogs[Math.min(6, sortedLogs.length - 1)]?.id ?? null;

  const now = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  await db.insert(schema.coachRelationships).values({
    coachId: coach.id,
    clientId: client.id,
    status: "active",
    invitedAt: daysAgo(DAYS_OF_HISTORY + 2),
    respondedAt: daysAgo(DAYS_OF_HISTORY + 1),
  });

  await db.insert(schema.programEditLog).values([
    {
      coachId: coach.id,
      clientId: client.id,
      summary: "Increased Barbell Bench Press to 4 sets in Push - Heavy",
      createdAt: daysAgo(9),
      flagged: false,
      flagNote: null,
    },
    {
      coachId: coach.id,
      clientId: client.id,
      summary: "Swapped Leg Press for Hack Squat in Legs - Heavy",
      createdAt: daysAgo(3),
      flagged: true,
      flagNote: "Knees felt off on hack squat — can we go back to leg press?",
    },
  ]);

  const notes = [];
  if (recentLogId) {
    notes.push({
      coachId: coach.id,
      clientId: client.id,
      workoutLogId: recentLogId,
      content: "Strong push session — that bench top set looked smooth and controlled on the way down. Keep the pace right there.",
      createdAt: daysAgo(1),
    });
  }
  if (olderLogId && olderLogId !== recentLogId) {
    notes.push({
      coachId: coach.id,
      clientId: client.id,
      workoutLogId: olderLogId,
      content: "Let's dial in depth on squats before we add more weight next week — a couple reps looked high.",
      createdAt: daysAgo(12),
    });
  }
  if (notes.length) await db.insert(schema.coachNotes).values(notes);

  const createdAt = new Date().toISOString();
  await db.insert(schema.follows).values([
    { followerId: coach.id, followingId: client.id, createdAt },
    { followerId: client.id, followingId: coach.id, createdAt },
  ]);

  console.log("Demo accounts ready:\n");
  console.log(`  Coach login  — email: demo.coach@repra.xyz   password: ${DEMO_PASSWORD}`);
  console.log(`  Client login — email: demo.client@repra.xyz  password: ${DEMO_PASSWORD}`);
  console.log("\nLog in as the coach to see both the personal training side and the Coaching dashboard with Sam Reyes as an active client.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
