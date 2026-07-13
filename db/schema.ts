import { pgTable, serial, text, integer, real, boolean, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // nullable: legacy/unclaimed profile rows (pre-auth data) have no login yet
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  username: text("username").unique(),
  avatarUrl: text("avatar_url"),
  name: text("name").notNull(),
  heightFeet: integer("height_feet").notNull(),
  heightInches: integer("height_inches").notNull(),
  startingWeight: real("starting_weight").notNull(),
  goalWeight: real("goal_weight").notNull(),
  goalText: text("goal_text").notNull(),
  calories: integer("calories").notNull(),
  protein: integer("protein").notNull(),
  carbs: integer("carbs").notNull(),
  fat: integer("fat").notNull(),
  // public-profile visibility — private (false) by default until the user opts in
  showWeight: boolean("show_weight").notNull().default(false),
  showProgram: boolean("show_program").notNull().default(false),
  showMaxes: boolean("show_maxes").notNull().default(false),
  showWorkoutDays: boolean("show_workout_days").notNull().default(false),
  // the saved program (if any) currently loaded onto the live schedule
  activeProgramId: integer("active_program_id"),
});

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull(),
  followingId: integer("following_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const schedule = pgTable("schedule", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  day: text("day").notNull(), // "Monday" ... "Sunday"
  workoutType: text("workout_type").notNull(), // "Upper A" | "Cardio" | "Rest" ...
  category: text("category"), // "Strength" | "Hypertrophy" | null
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(), // "Upper A" etc, matches schedule.workoutType
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull(),
  name: text("name").notNull(),
  sets: integer("sets").notNull(),
  repMin: integer("rep_min").notNull(),
  repMax: integer("rep_max").notNull(),
  restSeconds: integer("rest_seconds"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const workoutLogs = pgTable("workout_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(), // ISO date
  workoutId: integer("workout_id").notNull(),
});

export const setLogs = pgTable("set_logs", {
  id: serial("id").primaryKey(),
  workoutLogId: integer("workout_log_id").notNull(),
  exerciseId: integer("exercise_id").notNull(),
  setNumber: integer("set_number").notNull(),
  weight: real("weight").notNull(), // supports 0.1 increments
  reps: integer("reps").notNull(),
  rpe: real("rpe"),
});

export const cardioLogs = pgTable("cardio_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  type: text("type").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  distance: real("distance"),
  averageHeartRate: integer("average_heart_rate"),
  calories: integer("calories"),
});

export const weightLogs = pgTable("weight_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  weight: real("weight").notNull(), // supports 0.1 increments
});

export const measurements = pgTable("measurements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  waist: real("waist"),
  chest: real("chest"),
  leftArm: real("left_arm"),
  rightArm: real("right_arm"),
  leftThigh: real("left_thigh"),
  rightThigh: real("right_thigh"),
  neck: real("neck"),
});

export const personalRecords = pgTable("personal_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  weight: real("weight").notNull(),
  reps: integer("reps").notNull(),
  date: text("date").notNull(),
});

export type ProgramExercise = { name: string; sets: number; repMin: number; repMax: number; restSeconds: number | null };
export type ProgramWorkout = { name: string; exercises: ProgramExercise[] };
export type ProgramData = {
  schedule: { day: string; workoutType: string; category: string | null }[];
  workouts: ProgramWorkout[];
};

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  data: jsonb("data").$type<ProgramData>().notNull(),
  createdAt: text("created_at").notNull(),
});
