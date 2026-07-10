import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const viewerId = Number(session.user.id);

  const { username } = await params;
  const allUsers = await db.select().from(schema.users);
  const target = allUsers.find((u) => u.username === username);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allFollows = await db.select().from(schema.follows);
  const followerCount = allFollows.filter((f) => f.followingId === target.id).length;
  const followingCount = allFollows.filter((f) => f.followerId === target.id).length;
  const isFollowing = allFollows.some((f) => f.followerId === viewerId && f.followingId === target.id);
  const isSelf = viewerId === target.id;

  const profile: {
    id: number;
    username: string | null;
    name: string;
    avatarUrl: string | null;
    isSelf: boolean;
    isFollowing: boolean;
    followerCount: number;
    followingCount: number;
    weight: { value: number; date: string } | null;
    program: Awaited<ReturnType<typeof buildProgram>> | null;
    maxes: { exerciseName: string; weight: number; reps: number; date: string }[] | null;
    workoutDays:
      | {
          date: string;
          workoutName: string;
          skipped: boolean;
          sets: { exerciseName: string; setNumber: number; weight: number; reps: number }[];
        }[]
      | null;
  } = {
    id: target.id,
    username: target.username,
    name: target.name,
    avatarUrl: target.avatarUrl,
    isSelf,
    isFollowing,
    followerCount,
    followingCount,
    weight: null,
    program: null,
    maxes: null,
    workoutDays: null,
  };

  if (target.showWeight) {
    const weightLogs = await db.select().from(schema.weightLogs);
    const mine = weightLogs.filter((w) => w.userId === target.id).sort((a, b) => b.date.localeCompare(a.date));
    if (mine.length > 0) profile.weight = { value: mine[0].weight, date: mine[0].date };
  }

  if (target.showProgram) {
    profile.program = await buildProgram(target.id);
  }

  if (target.showMaxes) {
    const prs = await db.select().from(schema.personalRecords);
    profile.maxes = prs
      .filter((p) => p.userId === target.id)
      .map((p) => ({ exerciseName: p.exerciseName, weight: p.weight, reps: p.reps, date: p.date }));
  }

  if (target.showWorkoutDays) {
    const logs = await db.select().from(schema.workoutLogs);
    const workouts = await db.select().from(schema.workouts);
    const exercises = await db.select().from(schema.exercises);
    const allSets = await db.select().from(schema.setLogs);
    const workoutNameById = new Map(workouts.map((w) => [w.id, w.name]));
    const exerciseNameById = new Map(exercises.map((e) => [e.id, e.name]));

    profile.workoutDays = logs
      .filter((l) => l.userId === target.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20)
      .map((l) => ({
        date: l.date,
        workoutName: workoutNameById.get(l.workoutId) ?? "Workout",
        skipped: l.skipped,
        sets: allSets
          .filter((s) => s.workoutLogId === l.id)
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((s) => ({
            exerciseName: exerciseNameById.get(s.exerciseId) ?? "Exercise",
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
          })),
      }));
  }

  return NextResponse.json(profile);
}

async function buildProgram(userId: number) {
  const scheduleRows = await db.select().from(schema.schedule);
  const workoutRows = await db.select().from(schema.workouts);
  const exerciseRows = await db.select().from(schema.exercises);

  const workouts = workoutRows
    .filter((w) => w.userId === userId)
    .map((w) => ({
      name: w.name,
      exercises: exerciseRows
        .filter((e) => e.workoutId === w.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((e) => ({ name: e.name, sets: e.sets, repMin: e.repMin, repMax: e.repMax, restSeconds: e.restSeconds })),
    }));

  return {
    schedule: scheduleRows
      .filter((s) => s.userId === userId)
      .map((s) => ({ day: s.day, workoutType: s.workoutType, category: s.category })),
    workouts,
  };
}
