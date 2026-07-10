import { db, schema } from "./index";

async function seed() {
  const existing = await db.select().from(schema.users);
  if (existing.length > 0) {
    console.log("Already seeded, skipping.");
    return;
  }

  const [user] = await db
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
    .returning();

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
    await db.insert(schema.schedule).values({ userId: user.id, ...s });
  }

  const workoutNames = ["Upper A", "Lower A", "Upper B", "Lower B"];
  const workoutIds: Record<string, number> = {};
  for (const name of workoutNames) {
    const [w] = await db.insert(schema.workouts).values({ userId: user.id, name }).returning();
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
  for (let i = 0; i < upperAExercises.length; i++) {
    await db.insert(schema.exercises).values({ workoutId: workoutIds["Upper A"], sortOrder: i, ...upperAExercises[i] });
  }

  const [workoutLog] = await db
    .insert(schema.workoutLogs)
    .values({ userId: user.id, date: "2026-07-08", workoutId: workoutIds["Upper A"] })
    .returning();

  const allExercises = await db.select().from(schema.exercises);
  const bench = allExercises.find((e) => e.name === "Bench Press");

  if (bench) {
    const benchSets = [
      { weight: 135, reps: 8, rpe: 8 },
      { weight: 135, reps: 7, rpe: 9 },
      { weight: 135, reps: 6, rpe: 9 },
      { weight: 135, reps: 5, rpe: 10 },
    ];
    for (let i = 0; i < benchSets.length; i++) {
      await db.insert(schema.setLogs).values({
        workoutLogId: workoutLog.id,
        exerciseId: bench.id,
        setNumber: i + 1,
        ...benchSets[i],
      });
    }

    await db.insert(schema.personalRecords).values({
      userId: user.id,
      exerciseName: "Bench Press",
      weight: 135,
      reps: 8,
      date: "2026-07-08",
    });
  }

  await db.insert(schema.cardioLogs).values({
    userId: user.id,
    date: "2026-07-09",
    type: "Stationary Bike",
    durationMinutes: 40,
    distance: 12.4,
    averageHeartRate: 142,
    calories: 385,
  });

  await db.insert(schema.weightLogs).values({ userId: user.id, date: "2026-07-08", weight: 194 });

  await db.insert(schema.measurements).values({ userId: user.id, date: "2026-07-08", waist: 32 });

  console.log("Seed complete. User id:", user.id);
}

seed();
