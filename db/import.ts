import { readFileSync } from "fs";
import { join } from "path";
import { db, schema } from "./index";

const USER_ID = 1;

type JsonExercise = {
  name: string;
  sets: number;
  minReps?: number;
  maxReps?: number;
  rest?: number;
  duration?: string;
};

type JsonWorkout = {
  id: string;
  name: string;
  category?: string;
  exercises?: JsonExercise[];
};

function mapExercise(ex: JsonExercise) {
  if (ex.duration) {
    // Distance/duration-based movement (e.g. "40m" farmer carry) — no rep range in the source data.
    return { name: `${ex.name} (${ex.duration})`, sets: ex.sets, repMin: 1, repMax: 1, restSeconds: ex.rest ?? null };
  }
  return {
    name: ex.name,
    sets: ex.sets,
    repMin: ex.minReps!,
    repMax: ex.maxReps ?? ex.minReps!,
    restSeconds: ex.rest ?? null,
  };
}

async function importData() {
  const raw = JSON.parse(readFileSync(join(__dirname, "import-data.json"), "utf-8"));
  const jsonWorkouts: JsonWorkout[] = raw.workouts;

  for (const jw of jsonWorkouts) {
    if (!jw.exercises || jw.exercises.length === 0) continue; // cardio entries have no exercise list

    const allWorkouts = await db.select().from(schema.workouts);
    let workout = allWorkouts.find((w) => w.userId === USER_ID && w.name === jw.name);

    if (!workout) {
      [workout] = await db.insert(schema.workouts).values({ userId: USER_ID, name: jw.name }).returning();
      console.log(`Created workout: ${jw.name}`);
    }

    const allExercises = await db.select().from(schema.exercises);
    const existingExercises = allExercises.filter((e) => e.workoutId === workout!.id);

    if (existingExercises.length > 0) {
      console.log(`Skipping ${jw.name} — already has ${existingExercises.length} exercises.`);
      continue;
    }

    for (let i = 0; i < jw.exercises.length; i++) {
      const mapped = mapExercise(jw.exercises[i]);
      await db.insert(schema.exercises).values({ workoutId: workout!.id, sortOrder: i, ...mapped });
    }
    console.log(`Inserted ${jw.exercises.length} exercises for ${jw.name}`);
  }

  // Logs
  const allWeightLogs = await db.select().from(schema.weightLogs);
  const existingWeightDates = new Set(allWeightLogs.filter((w) => w.userId === USER_ID).map((w) => w.date));
  for (const w of raw.logs?.weight ?? []) {
    if (existingWeightDates.has(w.date)) continue;
    await db.insert(schema.weightLogs).values({ userId: USER_ID, date: w.date, weight: w.weight });
    console.log(`Logged weight ${w.weight} on ${w.date}`);
  }

  const allMeasurements = await db.select().from(schema.measurements);
  const existingMeasurementDates = new Set(allMeasurements.filter((m) => m.userId === USER_ID).map((m) => m.date));
  for (const m of raw.logs?.measurements ?? []) {
    if (existingMeasurementDates.has(m.date)) continue;
    await db.insert(schema.measurements).values({
      userId: USER_ID,
      date: m.date,
      waist: m.waist ?? null,
      chest: m.chest ?? null,
      leftArm: m.arms ?? null,
      rightArm: m.arms ?? null,
      leftThigh: m.thighs ?? null,
      rightThigh: m.thighs ?? null,
      neck: m.neck ?? null,
    });
    console.log(`Logged measurements on ${m.date}`);
  }

  console.log("Import complete.");
}

importData();
