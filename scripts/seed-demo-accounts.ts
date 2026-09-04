// Creates (or resets) two demo accounts for portfolio/interview walkthroughs:
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
const WEEKS_OF_HISTORY = 5;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function baseWeightFor(name: string): number {
  const n = name.toLowerCase();
  if (n.includes("squat") || n.includes("deadlift")) return 135;
  if (n.includes("bench press") && !n.includes("dumbbell") && !n.includes("machine") && !n.includes("incline")) return 115;
  if (n.includes("overhead press") || n.includes("barbell row")) return 85;
  if (n.includes("pull-up") || n.includes("push-up") || n.includes("dip")) return 0;
  return 25;
}

function weeklyIncrementFor(name: string): number {
  const n = name.toLowerCase();
  if (n.includes("squat") || n.includes("deadlift") || (n.includes("bench press") && !n.includes("dumbbell")) || n.includes("overhead press") || n.includes("barbell row")) return 5;
  if (n.includes("pull-up") || n.includes("push-up") || n.includes("dip")) return 0;
  return 2.5;
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

// Applies a starter template and backfills WEEKS_OF_HISTORY of logged sessions with weight
// that climbs a little each week, plus weekly weigh-ins trending toward the account's goal.
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

  const today = new Date();
  const totalDays = WEEKS_OF_HISTORY * 7;
  const loggedByExercise = new Map<string, { weight: number; reps: number; date: string }>();
  let lastWorkoutLogId: number | null = null;

  for (let daysAgo = totalDays; daysAgo >= 1; daysAgo--) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const dayName = DAY_NAMES[d.getDay()];
    const sched = starter.data.schedule.find((s) => s.day === dayName);
    if (!sched || sched.workoutType === "Rest" || sched.workoutType === "Cardio") continue;

    const workout = workoutByName.get(sched.workoutType);
    const workoutId = workoutIdByName.get(sched.workoutType);
    if (!workout || !workoutId) continue;

    const weekIndex = Math.floor((totalDays - daysAgo) / 7); // 0 = oldest week, increases toward today
    const dateStr = isoDate(d);
    const [log] = await db.insert(schema.workoutLogs).values({ userId, date: dateStr, workoutId }).returning();
    lastWorkoutLogId = log.id;

    const sets: { workoutLogId: number; exerciseId: number; setNumber: number; weight: number; reps: number }[] = [];
    for (const ex of workout.exercises) {
      const exerciseId = exerciseIdByName.get(ex.name);
      if (!exerciseId) continue;
      const weight = baseWeightFor(ex.name) + weekIndex * weeklyIncrementFor(ex.name);
      for (let setNumber = 1; setNumber <= ex.sets; setNumber++) {
        const reps = Math.max(ex.repMin, ex.repMax - (setNumber - 1));
        sets.push({ workoutLogId: log.id, exerciseId, setNumber, weight, reps });
      }
      const prev = loggedByExercise.get(ex.name);
      // Set 1 always logs repMax reps (see the setNumber loop above) — record that, not repMin,
      // so the PR actually matches a set that gets shown in that session's log.
      if (!prev || weight >= prev.weight) loggedByExercise.set(ex.name, { weight, reps: ex.repMax, date: dateStr });
    }
    if (sets.length) await db.insert(schema.setLogs).values(sets);
  }

  // Weekly weigh-ins trending toward the goal, not quite reaching it yet.
  const weightLogValues = [];
  for (let w = WEEKS_OF_HISTORY; w >= 0; w--) {
    const d = new Date(today);
    d.setDate(d.getDate() - w * 7);
    const progress = (WEEKS_OF_HISTORY - w) / (WEEKS_OF_HISTORY + 1.5); // stops short of the goal
    const weight = Math.round((startingWeight + (goalWeight - startingWeight) * progress) * 10) / 10;
    weightLogValues.push({ userId, date: isoDate(d), weight });
  }
  await db.insert(schema.weightLogs).values(weightLogValues);

  // PRs: the heaviest set actually logged per exercise, matching what /api/workouts' PR
  // detection would have produced if these sessions had been logged one at a time for real.
  const prValues = [...loggedByExercise.entries()].map(([exerciseName, pr]) => ({
    userId,
    exerciseName,
    weight: pr.weight,
    reps: pr.reps,
    date: pr.date,
  }));
  if (prValues.length) await db.insert(schema.personalRecords).values(prValues);

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
    invitedAt: daysAgo(WEEKS_OF_HISTORY * 7 + 2),
    respondedAt: daysAgo(WEEKS_OF_HISTORY * 7 + 1),
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
