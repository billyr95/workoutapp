import { db, schema } from "./index";

async function seed() {
  const existing = db.select().from(schema.users).all();
  if (existing.length > 0) {
    console.log("Already seeded, skipping.");
    return;
  }

  const [user] = db
    .insert(schema.users)
    .values({
      name: "Billy",
      heightFeet: 6,
      heightInches: 3,
      startingWeight: 194,
      goalWeight: 184,
      goalText: "Lean athletic physique (Fight Club Brad Pitt)",
      calories: 2400,
      protein: 190,
      carbs: 220,
      fat: 70,
    })
    .returning()
    .all();

  const scheduleRows = [
    { day: "Monday", workoutType: "Upper A", category: "Strength" },
    { day: "Tuesday", workoutType: "Lower A", category: "Strength" },
    { day: "Wednesday", workoutType: "Cardio", category: null },
    { day: "Thursday", workoutType: "Upper B", category: "Hypertrophy" },
    { day: "Friday", workoutType: "Lower B", category: "Hypertrophy" },
    { day: "Saturday", workoutType: "Cardio", category: null },
    { day: "Sunday", workoutType: "Rest", category: null },
  ];
  for (const s of scheduleRows) {
    db.insert(schema.schedule).values({ userId: user.id, ...s }).run();
  }

  const workoutNames = ["Upper A", "Lower A", "Upper B", "Lower B"];
  const workoutIds: Record<string, number> = {};
  for (const name of workoutNames) {
    const [w] = db
      .insert(schema.workouts)
      .values({ userId: user.id, name })
      .returning()
      .all();
    workoutIds[name] = w.id;
  }

  const upperAExercises = [
    { name: "Bench Press", sets: 4, repMin: 5, repMax: 8, restSeconds: 120 },
    { name: "Pull-ups", sets: 4, repMin: 6, repMax: 10, restSeconds: 90 },
    { name: "Incline Dumbbell Bench", sets: 3, repMin: 8, repMax: 10, restSeconds: null },
    { name: "Chest Supported Row", sets: 3, repMin: 8, repMax: 10, restSeconds: null },
    { name: "Standing Overhead Press", sets: 3, repMin: 6, repMax: 8, restSeconds: null },
    { name: "Lateral Raises", sets: 3, repMin: 15, repMax: 15, restSeconds: null },
    { name: "Hanging Leg Raises", sets: 3, repMin: 12, repMax: 15, restSeconds: null },
  ];
  upperAExercises.forEach((ex, i) => {
    db.insert(schema.exercises)
      .values({ workoutId: workoutIds["Upper A"], sortOrder: i, ...ex })
      .run();
  });

  const [workoutLog] = db
    .insert(schema.workoutLogs)
    .values({ userId: user.id, date: "2026-07-08", workoutId: workoutIds["Upper A"] })
    .returning()
    .all();

  const bench = db
    .select()
    .from(schema.exercises)
    .all()
    .find((e) => e.name === "Bench Press");

  if (bench) {
    const benchSets = [
      { weight: 135, reps: 8, rpe: 8 },
      { weight: 135, reps: 7, rpe: 9 },
      { weight: 135, reps: 6, rpe: 9 },
      { weight: 135, reps: 5, rpe: 10 },
    ];
    benchSets.forEach((s, i) => {
      db.insert(schema.setLogs)
        .values({
          workoutLogId: workoutLog.id,
          exerciseId: bench.id,
          setNumber: i + 1,
          ...s,
        })
        .run();
    });

    db.insert(schema.personalRecords)
      .values({
        userId: user.id,
        exerciseName: "Bench Press",
        weight: 135,
        reps: 8,
        date: "2026-07-08",
      })
      .run();
  }

  db.insert(schema.cardioLogs)
    .values({
      userId: user.id,
      date: "2026-07-09",
      type: "Stationary Bike",
      durationMinutes: 40,
      distance: 12.4,
      averageHeartRate: 142,
      calories: 385,
    })
    .run();

  db.insert(schema.weightLogs)
    .values({ userId: user.id, date: "2026-07-08", weight: 194 })
    .run();

  db.insert(schema.measurements)
    .values({ userId: user.id, date: "2026-07-08", waist: 32 })
    .run();

  console.log("Seed complete. User id:", user.id);
}

seed();
