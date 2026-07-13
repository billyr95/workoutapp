import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { getProgramSnapshot } from "@/lib/data";

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
    program: Awaited<ReturnType<typeof getProgramSnapshot>> | null;
    maxes: { exerciseName: string; weight: number; reps: number; date: string }[] | null;
    workoutDays:
      | {
          date: string;
          workoutName: string;
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
    profile.program = await getProgramSnapshot(target.id);
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
