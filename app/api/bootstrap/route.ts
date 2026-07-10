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
  return NextResponse.json({
    user: getUser(),
    schedule: getSchedule(),
    workouts: getWorkoutsWithExercises(),
    personalRecords: getPersonalRecords(),
    weightLogs: getWeightLogs(),
    measurements: getMeasurements(),
    cardioLogs: getCardioLogs(),
    workoutLogs: getWorkoutLogsWithSets(),
  });
}
