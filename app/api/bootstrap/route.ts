import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUser,
  getSchedule,
  getWorkoutsWithExercises,
  getPersonalRecords,
  getWeightLogs,
  getMeasurements,
  getCardioLogs,
  getWorkoutLogsWithSets,
} from "@/lib/data";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const [user, schedule, workouts, personalRecords, weightLogs, measurements, cardioLogs, workoutLogs] =
    await Promise.all([
      getUser(userId),
      getSchedule(userId),
      getWorkoutsWithExercises(userId),
      getPersonalRecords(userId),
      getWeightLogs(userId),
      getMeasurements(userId),
      getCardioLogs(userId),
      getWorkoutLogsWithSets(userId),
    ]);

  return NextResponse.json({
    user,
    schedule,
    workouts,
    personalRecords,
    weightLogs,
    measurements,
    cardioLogs,
    workoutLogs,
  });
}
