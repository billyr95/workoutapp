import type { ProgramData } from "./schema";

export type StarterProgramSeed = {
  slug: string;
  name: string;
  level: string;
  daysPerWeek: number;
  data: ProgramData;
};

// Hand-translated from a source XML using a different vocabulary than this app's own program
// format (numeric day slots + workout-id references instead of weekday names, a single `reps`
// string like "5-8"/"AMRAP"/"5/5/5+" instead of separate repMin/repMax). Day 1 = Monday. Rep
// strings without a clean numeric range: "AMRAP" -> 10-20 (a workable target, not a hard rule),
// "5/5/5+" (5/3/1 straight sets, last one open-ended) -> 5-5. The source's <progression>
// (percentage-based week scheme) has no home in ProgramData and is intentionally dropped —
// sets/reps/rest for every exercise still import fine.
export const starterProgramSeeds: StarterProgramSeed[] = [
  {
    slug: "ppl-6",
    name: "Push Pull Legs",
    level: "intermediate",
    daysPerWeek: 6,
    data: {
      schedule: [
        { day: "Monday", workoutType: "Push - Heavy", category: null },
        { day: "Tuesday", workoutType: "Pull - Heavy", category: null },
        { day: "Wednesday", workoutType: "Legs - Heavy", category: null },
        { day: "Thursday", workoutType: "Push - Hypertrophy", category: null },
        { day: "Friday", workoutType: "Pull - Hypertrophy", category: null },
        { day: "Saturday", workoutType: "Legs - Hypertrophy", category: null },
        { day: "Sunday", workoutType: "Rest", category: null },
      ],
      workouts: [
        {
          name: "Push - Heavy",
          exercises: [
            { name: "Barbell Bench Press", sets: 4, repMin: 5, repMax: 8, restSeconds: 180 },
            { name: "Overhead Press", sets: 3, repMin: 6, repMax: 8, restSeconds: 150 },
            { name: "Incline Dumbbell Press", sets: 3, repMin: 8, repMax: 10, restSeconds: 120 },
            { name: "Dumbbell Lateral Raise", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
            { name: "Cable Triceps Pushdown", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Overhead Cable Triceps Extension", sets: 2, repMin: 12, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Pull - Heavy",
          exercises: [
            { name: "Weighted Pull-Up", sets: 4, repMin: 5, repMax: 8, restSeconds: 180 },
            { name: "Barbell Row", sets: 4, repMin: 6, repMax: 8, restSeconds: 150 },
            { name: "Lat Pulldown", sets: 3, repMin: 8, repMax: 10, restSeconds: 120 },
            { name: "Face Pull", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
            { name: "Barbell Curl", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Hammer Curl", sets: 2, repMin: 10, repMax: 12, restSeconds: 60 },
          ],
        },
        {
          name: "Legs - Heavy",
          exercises: [
            { name: "Barbell Back Squat", sets: 4, repMin: 5, repMax: 8, restSeconds: 180 },
            { name: "Romanian Deadlift", sets: 3, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Leg Press", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Leg Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Standing Calf Raise", sets: 4, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Hanging Leg Raise", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Push - Hypertrophy",
          exercises: [
            { name: "Incline Barbell Bench Press", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Machine Chest Press", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Seated Dumbbell Shoulder Press", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Cable Lateral Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Cable Fly", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
            { name: "Rope Triceps Pushdown", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Pull - Hypertrophy",
          exercises: [
            { name: "Chest Supported Row", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Neutral Grip Lat Pulldown", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Single Arm Cable Row", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Reverse Pec Deck", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Incline Dumbbell Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Cable Curl", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Legs - Hypertrophy",
          exercises: [
            { name: "Hack Squat", sets: 3, repMin: 8, repMax: 12, restSeconds: 150 },
            { name: "Bulgarian Split Squat", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Leg Extension", sets: 3, repMin: 12, repMax: 15, restSeconds: 75 },
            { name: "Seated Leg Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 75 },
            { name: "Seated Calf Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Cable Crunch", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
      ],
    },
  },

  {
    slug: "upper-lower-4",
    name: "Upper Lower",
    level: "beginner-intermediate",
    daysPerWeek: 4,
    data: {
      schedule: [
        { day: "Monday", workoutType: "Upper A", category: null },
        { day: "Tuesday", workoutType: "Lower A", category: null },
        { day: "Wednesday", workoutType: "Rest", category: null },
        { day: "Thursday", workoutType: "Upper B", category: null },
        { day: "Friday", workoutType: "Lower B", category: null },
        { day: "Saturday", workoutType: "Rest", category: null },
        { day: "Sunday", workoutType: "Rest", category: null },
      ],
      workouts: [
        {
          name: "Upper A",
          exercises: [
            { name: "Barbell Bench Press", sets: 4, repMin: 5, repMax: 8, restSeconds: 180 },
            { name: "Barbell Row", sets: 4, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Overhead Press", sets: 3, repMin: 6, repMax: 10, restSeconds: 120 },
            { name: "Lat Pulldown", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Dumbbell Lateral Raise", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
            { name: "Triceps Pushdown", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Dumbbell Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Lower A",
          exercises: [
            { name: "Back Squat", sets: 4, repMin: 5, repMax: 8, restSeconds: 180 },
            { name: "Romanian Deadlift", sets: 3, repMin: 8, repMax: 10, restSeconds: 150 },
            { name: "Leg Press", sets: 3, repMin: 10, repMax: 12, restSeconds: 120 },
            { name: "Leg Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Calf Raise", sets: 4, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Cable Crunch", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
        {
          name: "Upper B",
          exercises: [
            { name: "Incline Dumbbell Press", sets: 4, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Pull-Up", sets: 4, repMin: 6, repMax: 10, restSeconds: 120 },
            { name: "Seated Cable Row", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Machine Shoulder Press", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Cable Lateral Raise", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Overhead Triceps Extension", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Hammer Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Lower B",
          exercises: [
            { name: "Front Squat", sets: 3, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Hip Thrust", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Bulgarian Split Squat", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Leg Extension", sets: 3, repMin: 12, repMax: 15, restSeconds: 75 },
            { name: "Seated Leg Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 75 },
            { name: "Seated Calf Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
      ],
    },
  },

  {
    slug: "bro-split-5",
    name: "Bro Split",
    level: "intermediate",
    daysPerWeek: 5,
    data: {
      schedule: [
        { day: "Monday", workoutType: "Chest", category: null },
        { day: "Tuesday", workoutType: "Back", category: null },
        { day: "Wednesday", workoutType: "Shoulders", category: null },
        { day: "Thursday", workoutType: "Arms", category: null },
        { day: "Friday", workoutType: "Legs", category: null },
        { day: "Saturday", workoutType: "Rest", category: null },
        { day: "Sunday", workoutType: "Rest", category: null },
      ],
      workouts: [
        {
          name: "Chest",
          exercises: [
            { name: "Barbell Bench Press", sets: 4, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Incline Dumbbell Press", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Machine Chest Press", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Cable Fly", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
            { name: "Push-Up", sets: 2, repMin: 10, repMax: 20, restSeconds: 60 },
          ],
        },
        {
          name: "Back",
          exercises: [
            { name: "Deadlift", sets: 3, repMin: 4, repMax: 6, restSeconds: 180 },
            { name: "Pull-Up", sets: 4, repMin: 6, repMax: 10, restSeconds: 120 },
            { name: "Barbell Row", sets: 3, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Lat Pulldown", sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
            { name: "Seated Cable Row", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Face Pull", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
        {
          name: "Shoulders",
          exercises: [
            { name: "Overhead Press", sets: 4, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Seated Dumbbell Press", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Dumbbell Lateral Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Cable Lateral Raise", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Reverse Pec Deck", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
        {
          name: "Arms",
          exercises: [
            { name: "Barbell Curl", sets: 4, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Skull Crusher", sets: 4, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Incline Dumbbell Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Rope Triceps Pushdown", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Hammer Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Overhead Triceps Extension", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Legs",
          exercises: [
            { name: "Back Squat", sets: 4, repMin: 6, repMax: 10, restSeconds: 180 },
            { name: "Romanian Deadlift", sets: 3, repMin: 8, repMax: 12, restSeconds: 150 },
            { name: "Leg Press", sets: 3, repMin: 10, repMax: 15, restSeconds: 120 },
            { name: "Leg Extension", sets: 3, repMin: 12, repMax: 15, restSeconds: 75 },
            { name: "Leg Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 75 },
            { name: "Standing Calf Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
      ],
    },
  },

  {
    slug: "arnold-6",
    name: "Arnold Split",
    level: "advanced",
    daysPerWeek: 6,
    data: {
      schedule: [
        { day: "Monday", workoutType: "Chest + Back A", category: null },
        { day: "Tuesday", workoutType: "Shoulders + Arms A", category: null },
        { day: "Wednesday", workoutType: "Legs A", category: null },
        { day: "Thursday", workoutType: "Chest + Back B", category: null },
        { day: "Friday", workoutType: "Shoulders + Arms B", category: null },
        { day: "Saturday", workoutType: "Legs B", category: null },
        { day: "Sunday", workoutType: "Rest", category: null },
      ],
      workouts: [
        {
          name: "Chest + Back A",
          exercises: [
            { name: "Barbell Bench Press", sets: 4, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Pull-Up", sets: 4, repMin: 6, repMax: 10, restSeconds: 120 },
            { name: "Incline Dumbbell Press", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Barbell Row", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Cable Fly", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
            { name: "Lat Pulldown", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
          ],
        },
        {
          name: "Shoulders + Arms A",
          exercises: [
            { name: "Overhead Press", sets: 4, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Dumbbell Lateral Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Barbell Curl", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Skull Crusher", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Hammer Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Triceps Pushdown", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Legs A",
          exercises: [
            { name: "Back Squat", sets: 4, repMin: 6, repMax: 10, restSeconds: 180 },
            { name: "Romanian Deadlift", sets: 3, repMin: 8, repMax: 12, restSeconds: 150 },
            { name: "Leg Press", sets: 3, repMin: 10, repMax: 15, restSeconds: 120 },
            { name: "Leg Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 75 },
            { name: "Calf Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
        {
          name: "Chest + Back B",
          exercises: [
            { name: "Incline Barbell Bench Press", sets: 4, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Weighted Pull-Up", sets: 4, repMin: 6, repMax: 10, restSeconds: 120 },
            { name: "Dumbbell Bench Press", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Chest Supported Row", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Machine Chest Fly", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
            { name: "Straight Arm Pulldown", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Shoulders + Arms B",
          exercises: [
            { name: "Seated Dumbbell Press", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Cable Lateral Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Reverse Pec Deck", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Incline Dumbbell Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Overhead Triceps Extension", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Cable Curl", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Legs B",
          exercises: [
            { name: "Front Squat", sets: 3, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Hip Thrust", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Bulgarian Split Squat", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Leg Extension", sets: 3, repMin: 12, repMax: 15, restSeconds: 75 },
            { name: "Seated Leg Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 75 },
            { name: "Seated Calf Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
      ],
    },
  },

  {
    slug: "full-body-3",
    name: "Full Body",
    level: "beginner",
    daysPerWeek: 3,
    data: {
      schedule: [
        { day: "Monday", workoutType: "Full Body A", category: null },
        { day: "Tuesday", workoutType: "Rest", category: null },
        { day: "Wednesday", workoutType: "Full Body B", category: null },
        { day: "Thursday", workoutType: "Rest", category: null },
        { day: "Friday", workoutType: "Full Body C", category: null },
        { day: "Saturday", workoutType: "Rest", category: null },
        { day: "Sunday", workoutType: "Rest", category: null },
      ],
      workouts: [
        {
          name: "Full Body A",
          exercises: [
            { name: "Back Squat", sets: 3, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Bench Press", sets: 3, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Lat Pulldown", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Romanian Deadlift", sets: 2, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Lateral Raise", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Dumbbell Curl", sets: 2, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Full Body B",
          exercises: [
            { name: "Romanian Deadlift", sets: 3, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Incline Dumbbell Press", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Seated Cable Row", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Leg Press", sets: 3, repMin: 10, repMax: 15, restSeconds: 120 },
            { name: "Overhead Press", sets: 2, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Triceps Pushdown", sets: 2, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Full Body C",
          exercises: [
            { name: "Front Squat", sets: 3, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Overhead Press", sets: 3, repMin: 6, repMax: 10, restSeconds: 120 },
            { name: "Pull-Up", sets: 3, repMin: 6, repMax: 10, restSeconds: 120 },
            { name: "Hip Thrust", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Dumbbell Lateral Raise", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Hammer Curl", sets: 2, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
      ],
    },
  },

  {
    slug: "phul-4",
    name: "PHUL",
    level: "intermediate",
    daysPerWeek: 4,
    data: {
      schedule: [
        { day: "Monday", workoutType: "Upper Power", category: null },
        { day: "Tuesday", workoutType: "Lower Power", category: null },
        { day: "Wednesday", workoutType: "Rest", category: null },
        { day: "Thursday", workoutType: "Upper Hypertrophy", category: null },
        { day: "Friday", workoutType: "Lower Hypertrophy", category: null },
        { day: "Saturday", workoutType: "Rest", category: null },
        { day: "Sunday", workoutType: "Rest", category: null },
      ],
      workouts: [
        {
          name: "Upper Power",
          exercises: [
            { name: "Barbell Bench Press", sets: 4, repMin: 3, repMax: 6, restSeconds: 180 },
            { name: "Barbell Row", sets: 4, repMin: 3, repMax: 6, restSeconds: 180 },
            { name: "Overhead Press", sets: 3, repMin: 5, repMax: 8, restSeconds: 150 },
            { name: "Weighted Pull-Up", sets: 3, repMin: 5, repMax: 8, restSeconds: 150 },
            { name: "Barbell Curl", sets: 3, repMin: 8, repMax: 10, restSeconds: 90 },
            { name: "Skull Crusher", sets: 3, repMin: 8, repMax: 10, restSeconds: 90 },
          ],
        },
        {
          name: "Lower Power",
          exercises: [
            { name: "Back Squat", sets: 4, repMin: 3, repMax: 6, restSeconds: 180 },
            { name: "Deadlift", sets: 3, repMin: 3, repMax: 6, restSeconds: 180 },
            { name: "Leg Press", sets: 3, repMin: 6, repMax: 10, restSeconds: 120 },
            { name: "Leg Curl", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Calf Raise", sets: 4, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Upper Hypertrophy",
          exercises: [
            { name: "Incline Dumbbell Press", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Lat Pulldown", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Machine Chest Press", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Seated Cable Row", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Lateral Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Cable Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Triceps Pushdown", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Lower Hypertrophy",
          exercises: [
            { name: "Front Squat", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Romanian Deadlift", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Bulgarian Split Squat", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Leg Extension", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
            { name: "Seated Leg Curl", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
            { name: "Calf Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
      ],
    },
  },

  {
    slug: "phat-5",
    name: "PHAT",
    level: "advanced",
    daysPerWeek: 5,
    data: {
      schedule: [
        { day: "Monday", workoutType: "Upper Power", category: null },
        { day: "Tuesday", workoutType: "Lower Power", category: null },
        { day: "Wednesday", workoutType: "Rest", category: null },
        { day: "Thursday", workoutType: "Back + Shoulders", category: null },
        { day: "Friday", workoutType: "Lower Hypertrophy", category: null },
        { day: "Saturday", workoutType: "Chest + Arms", category: null },
        { day: "Sunday", workoutType: "Rest", category: null },
      ],
      workouts: [
        {
          name: "Upper Power",
          exercises: [
            { name: "Bench Press", sets: 4, repMin: 3, repMax: 5, restSeconds: 180 },
            { name: "Barbell Row", sets: 4, repMin: 3, repMax: 5, restSeconds: 180 },
            { name: "Overhead Press", sets: 3, repMin: 5, repMax: 8, restSeconds: 150 },
            { name: "Weighted Pull-Up", sets: 3, repMin: 5, repMax: 8, restSeconds: 150 },
            { name: "Barbell Curl", sets: 3, repMin: 8, repMax: 10, restSeconds: 90 },
            { name: "Close Grip Bench Press", sets: 3, repMin: 8, repMax: 10, restSeconds: 90 },
          ],
        },
        {
          name: "Lower Power",
          exercises: [
            { name: "Back Squat", sets: 4, repMin: 3, repMax: 5, restSeconds: 180 },
            { name: "Deadlift", sets: 3, repMin: 3, repMax: 5, restSeconds: 180 },
            { name: "Leg Press", sets: 3, repMin: 6, repMax: 10, restSeconds: 120 },
            { name: "Leg Curl", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Calf Raise", sets: 4, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Back + Shoulders",
          exercises: [
            { name: "Lat Pulldown", sets: 4, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Chest Supported Row", sets: 4, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Single Arm Cable Row", sets: 3, repMin: 10, repMax: 15, restSeconds: 75 },
            { name: "Dumbbell Lateral Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Reverse Pec Deck", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Face Pull", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
        {
          name: "Lower Hypertrophy",
          exercises: [
            { name: "Hack Squat", sets: 4, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Romanian Deadlift", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Bulgarian Split Squat", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Leg Extension", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Seated Leg Curl", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Calf Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
        {
          name: "Chest + Arms",
          exercises: [
            { name: "Incline Dumbbell Press", sets: 4, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Machine Chest Press", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Cable Fly", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Incline Dumbbell Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Hammer Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Rope Triceps Pushdown", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Overhead Triceps Extension", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
      ],
    },
  },

  {
    slug: "ppl-heavy-hypertrophy",
    name: "PPL Heavy and Hypertrophy",
    level: "intermediate",
    daysPerWeek: 6,
    data: {
      schedule: [
        { day: "Monday", workoutType: "Push Heavy", category: null },
        { day: "Tuesday", workoutType: "Pull Heavy", category: null },
        { day: "Wednesday", workoutType: "Legs Heavy", category: null },
        { day: "Thursday", workoutType: "Push Hypertrophy", category: null },
        { day: "Friday", workoutType: "Pull Hypertrophy", category: null },
        { day: "Saturday", workoutType: "Legs Hypertrophy", category: null },
        { day: "Sunday", workoutType: "Rest", category: null },
      ],
      workouts: [
        {
          name: "Push Heavy",
          exercises: [
            { name: "Bench Press", sets: 5, repMin: 3, repMax: 6, restSeconds: 180 },
            { name: "Overhead Press", sets: 4, repMin: 5, repMax: 8, restSeconds: 150 },
            { name: "Incline Dumbbell Press", sets: 3, repMin: 8, repMax: 10, restSeconds: 120 },
            { name: "Lateral Raise", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
            { name: "Triceps Pushdown", sets: 3, repMin: 8, repMax: 12, restSeconds: 75 },
          ],
        },
        {
          name: "Pull Heavy",
          exercises: [
            { name: "Weighted Pull-Up", sets: 4, repMin: 4, repMax: 8, restSeconds: 180 },
            { name: "Barbell Row", sets: 4, repMin: 5, repMax: 8, restSeconds: 150 },
            { name: "Lat Pulldown", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Barbell Curl", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Face Pull", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Legs Heavy",
          exercises: [
            { name: "Back Squat", sets: 5, repMin: 3, repMax: 6, restSeconds: 180 },
            { name: "Romanian Deadlift", sets: 4, repMin: 6, repMax: 8, restSeconds: 150 },
            { name: "Leg Press", sets: 3, repMin: 8, repMax: 10, restSeconds: 120 },
            { name: "Leg Curl", sets: 3, repMin: 10, repMax: 12, restSeconds: 90 },
            { name: "Calf Raise", sets: 4, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Push Hypertrophy",
          exercises: [
            { name: "Incline Bench Press", sets: 4, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Machine Chest Press", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Cable Fly", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Cable Lateral Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Rope Triceps Pushdown", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
        {
          name: "Pull Hypertrophy",
          exercises: [
            { name: "Chest Supported Row", sets: 4, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Neutral Grip Pulldown", sets: 4, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Single Arm Row", sets: 3, repMin: 10, repMax: 15, restSeconds: 75 },
            { name: "Reverse Pec Deck", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Incline Dumbbell Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Legs Hypertrophy",
          exercises: [
            { name: "Hack Squat", sets: 4, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Bulgarian Split Squat", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Leg Extension", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Seated Leg Curl", sets: 4, repMin: 10, repMax: 15, restSeconds: 75 },
            { name: "Calf Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Cable Crunch", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
      ],
    },
  },

  {
    slug: "upper-emphasis-5",
    name: "Upper Body Emphasis",
    level: "intermediate",
    daysPerWeek: 5,
    data: {
      schedule: [
        { day: "Monday", workoutType: "Chest + Back A", category: null },
        { day: "Tuesday", workoutType: "Legs A", category: null },
        { day: "Wednesday", workoutType: "Arms + Shoulders", category: null },
        { day: "Thursday", workoutType: "Rest", category: null },
        { day: "Friday", workoutType: "Chest + Back B", category: null },
        { day: "Saturday", workoutType: "Legs + Arms", category: null },
        { day: "Sunday", workoutType: "Rest", category: null },
      ],
      workouts: [
        {
          name: "Chest + Back A",
          exercises: [
            { name: "Bench Press", sets: 4, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Pull-Up", sets: 4, repMin: 6, repMax: 10, restSeconds: 120 },
            { name: "Incline Dumbbell Press", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Barbell Row", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Cable Fly", sets: 3, repMin: 12, repMax: 15, restSeconds: 60 },
            { name: "Lat Pulldown", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
          ],
        },
        {
          name: "Legs A",
          exercises: [
            { name: "Back Squat", sets: 4, repMin: 6, repMax: 10, restSeconds: 180 },
            { name: "Romanian Deadlift", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Leg Press", sets: 3, repMin: 10, repMax: 15, restSeconds: 120 },
            { name: "Leg Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 75 },
            { name: "Calf Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
        {
          name: "Arms + Shoulders",
          exercises: [
            { name: "Overhead Press", sets: 3, repMin: 6, repMax: 10, restSeconds: 120 },
            { name: "Lateral Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Barbell Curl", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Skull Crusher", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Hammer Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Triceps Pushdown", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Chest + Back B",
          exercises: [
            { name: "Incline Barbell Bench Press", sets: 4, repMin: 6, repMax: 10, restSeconds: 150 },
            { name: "Weighted Pull-Up", sets: 4, repMin: 6, repMax: 10, restSeconds: 120 },
            { name: "Machine Chest Press", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Chest Supported Row", sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
            { name: "Machine Fly", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Straight Arm Pulldown", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
        {
          name: "Legs + Arms",
          exercises: [
            { name: "Front Squat", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Hip Thrust", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Bulgarian Split Squat", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Leg Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 75 },
            { name: "Cable Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Overhead Triceps Extension", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
      ],
    },
  },

  {
    slug: "531-accessories",
    name: "5/3/1 Plus Accessories",
    level: "intermediate-advanced",
    daysPerWeek: 4,
    data: {
      schedule: [
        { day: "Monday", workoutType: "Overhead Press", category: null },
        { day: "Tuesday", workoutType: "Deadlift", category: null },
        { day: "Wednesday", workoutType: "Rest", category: null },
        { day: "Thursday", workoutType: "Bench Press", category: null },
        { day: "Friday", workoutType: "Squat", category: null },
        { day: "Saturday", workoutType: "Rest", category: null },
        { day: "Sunday", workoutType: "Rest", category: null },
      ],
      workouts: [
        {
          name: "Overhead Press",
          exercises: [
            { name: "Overhead Press", sets: 3, repMin: 5, repMax: 5, restSeconds: 180 },
            { name: "Pull-Up", sets: 4, repMin: 6, repMax: 10, restSeconds: 120 },
            { name: "Dumbbell Bench Press", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Lateral Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Barbell Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Deadlift",
          exercises: [
            { name: "Deadlift", sets: 3, repMin: 5, repMax: 5, restSeconds: 180 },
            { name: "Leg Press", sets: 3, repMin: 10, repMax: 15, restSeconds: 120 },
            { name: "Leg Curl", sets: 3, repMin: 10, repMax: 15, restSeconds: 75 },
            { name: "Hanging Leg Raise", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
            { name: "Calf Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
        {
          name: "Bench Press",
          exercises: [
            { name: "Bench Press", sets: 3, repMin: 5, repMax: 5, restSeconds: 180 },
            { name: "Barbell Row", sets: 4, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Incline Dumbbell Press", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Lat Pulldown", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Triceps Pushdown", sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
          ],
        },
        {
          name: "Squat",
          exercises: [
            { name: "Back Squat", sets: 3, repMin: 5, repMax: 5, restSeconds: 180 },
            { name: "Romanian Deadlift", sets: 3, repMin: 8, repMax: 12, restSeconds: 120 },
            { name: "Bulgarian Split Squat", sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
            { name: "Leg Extension", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Calf Raise", sets: 4, repMin: 12, repMax: 20, restSeconds: 60 },
            { name: "Cable Crunch", sets: 3, repMin: 12, repMax: 20, restSeconds: 60 },
          ],
        },
      ],
    },
  },
];
