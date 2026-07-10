import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// body: { day, type: "Rest" | "Cardio" | "Workout", name?, category? }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const body = await req.json();
  const { day, type } = body;
  if (!DAYS.includes(day)) return NextResponse.json({ error: "Invalid day" }, { status: 400 });

  let workoutType: string;
  let category: string | null;

  if (type === "Rest") {
    workoutType = "Rest";
    category = null;
  } else if (type === "Cardio") {
    workoutType = "Cardio";
    category = null;
  } else if (type === "Workout") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Workout name is required" }, { status: 400 });
    if (body.category !== "Strength" && body.category !== "Hypertrophy") {
      return NextResponse.json({ error: "Category must be Strength or Hypertrophy" }, { status: 400 });
    }
    workoutType = name;
    category = body.category;

    const allWorkouts = await db.select().from(schema.workouts);
    const existingWorkout = allWorkouts.find((w) => w.userId === userId && w.name === name);
    if (!existingWorkout) {
      await db.insert(schema.workouts).values({ userId, name });
    }
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const allSchedule = await db.select().from(schema.schedule);
  const existingDay = allSchedule.find((s) => s.userId === userId && s.day === day);

  if (existingDay) {
    await db.update(schema.schedule).set({ workoutType, category }).where(eq(schema.schedule.id, existingDay.id));
  } else {
    await db.insert(schema.schedule).values({ userId, day, workoutType, category });
  }

  return NextResponse.json({ ok: true });
}
