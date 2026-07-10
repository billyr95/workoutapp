import { NextResponse } from "next/server";
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
  const [user, schedule, workouts, personalRecords, weightLogs, measurements, cardioLogs, workoutLogs] =
    await Promise.all([
      getUser(),
      getSchedule(),
      getWorkoutsWithExercises(),
      getPersonalRecords(),
      getWeightLogs(),
      getMeasurements(),
      getCardioLogs(),
      getWorkoutLogsWithSets(),
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
