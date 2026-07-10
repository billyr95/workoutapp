"use client";

import { useEffect, useState, useCallback } from "react";

export type Exercise = {
  id: number;
  workoutId: number;
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number | null;
  sortOrder: number;
};

export type Workout = {
  id: number;
  userId: number;
  name: string;
  exercises: Exercise[];
};

export type ScheduleDay = {
  id: number;
  userId: number;
  day: string;
  workoutType: string;
  category: string | null;
};

export type SetLog = {
  id: number;
  workoutLogId: number;
  exerciseId: number;
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
};

export type WorkoutLog = {
  id: number;
  userId: number;
  date: string;
  workoutId: number;
  skipped: boolean;
  sets: SetLog[];
};

export type AppData = {
  user: {
    id: number;
    email: string | null;
    username: string | null;
    avatarUrl: string | null;
    name: string;
    heightFeet: number;
    heightInches: number;
    startingWeight: number;
    goalWeight: number;
    goalText: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    showWeight: boolean;
    showProgram: boolean;
    showMaxes: boolean;
    showWorkoutDays: boolean;
  };
  schedule: ScheduleDay[];
  workouts: Workout[];
  personalRecords: { id: number; exerciseName: string; weight: number; reps: number; date: string }[];
  weightLogs: { id: number; date: string; weight: number }[];
  measurements: {
    id: number;
    date: string;
    waist: number | null;
    chest: number | null;
    leftArm: number | null;
    rightArm: number | null;
    leftThigh: number | null;
    rightThigh: number | null;
    neck: number | null;
  }[];
  cardioLogs: {
    id: number;
    date: string;
    type: string;
    durationMinutes: number;
    distance: number | null;
    averageHeartRate: number | null;
    calories: number | null;
  }[];
  workoutLogs: WorkoutLog[];
};

export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/bootstrap", { cache: "no-store" });
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, refetch };
}
