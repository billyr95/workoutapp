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

function importData() {
  const raw = JSON.parse(readFileSync(join(__dirname, "import-data.json"), "utf-8"));
  const jsonWorkouts: JsonWorkout[] = raw.workouts;

  for (const jw of jsonWorkouts) {
    if (!jw.exercises || jw.exercises.length === 0) continue; // cardio entries have no exercise list

    let workout = db
      .select()
      .from(schema.workouts)
      .all()
      .find((w) => w.userId === USER_ID && w.name === jw.name);

    if (!workout) {
      [workout] = db.insert(schema.workouts).values({ userId: USER_ID, name: jw.name }).returning().all();
      console.log(`Created workout: ${jw.name}`);
    }

    const existingExercises = db
      .select()
      .from(schema.exercises)
      .all()
      .filter((e) => e.workoutId === workout!.id);

    if (existingExercises.length > 0) {
      console.log(`Skipping ${jw.name} — already has ${existingExercises.length} exercises.`);
      continue;
    }

    jw.exercises.forEach((ex, i) => {
      const mapped = mapExercise(ex);
      db.insert(schema.exercises)
        .values({ workoutId: workout!.id, sortOrder: i, ...mapped })
        .run();
    });
    console.log(`Inserted ${jw.exercises.length} exercises for ${jw.name}`);
  }

  // Logs
  const existingWeightDates = new Set(
    db.select().from(schema.weightLogs).all().filter((w) => w.userId === USER_ID).map((w) => w.date)
  );
  for (const w of raw.logs?.weight ?? []) {
    if (existingWeightDates.has(w.date)) continue;
    db.insert(schema.weightLogs).values({ userId: USER_ID, date: w.date, weight: w.weight }).run();
    console.log(`Logged weight ${w.weight} on ${w.date}`);
  }

  const existingMeasurementDates = new Set(
    db.select().from(schema.measurements).all().filter((m) => m.userId === USER_ID).map((m) => m.date)
  );
  for (const m of raw.logs?.measurements ?? []) {
    if (existingMeasurementDates.has(m.date)) continue;
    db.insert(schema.measurements)
      .values({
        userId: USER_ID,
        date: m.date,
        waist: m.waist ?? null,
        chest: m.chest ?? null,
        leftArm: m.arms ?? null,
        rightArm: m.arms ?? null,
        leftThigh: m.thighs ?? null,
        rightThigh: m.thighs ?? null,
        neck: m.neck ?? null,
      })
      .run();
    console.log(`Logged measurements on ${m.date}`);
  }

  console.log("Import complete.");
}

importData();
