import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";

// body: { showWeight?, showProgram?, showMaxes?, showWorkoutDays?, goalText?, heightFeet?, heightInches?, startingWeight?, goalWeight? }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const body = await req.json();
  const values: Partial<{
    showWeight: boolean;
    showProgram: boolean;
    showMaxes: boolean;
    showWorkoutDays: boolean;
    goalText: string;
    heightFeet: number;
    heightInches: number;
    startingWeight: number;
    goalWeight: number;
  }> = {};
  for (const key of ["showWeight", "showProgram", "showMaxes", "showWorkoutDays"] as const) {
    if (typeof body[key] === "boolean") values[key] = body[key];
  }
  if (typeof body.goalText === "string") values.goalText = body.goalText.trim().slice(0, 200);
  for (const key of ["heightFeet", "heightInches", "startingWeight", "goalWeight"] as const) {
    if (typeof body[key] === "number" && Number.isFinite(body[key])) values[key] = body[key];
  }
  if (Object.keys(values).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db.update(schema.users).set(values).where(eq(schema.users.id, userId));
  return NextResponse.json({ ok: true });
}
