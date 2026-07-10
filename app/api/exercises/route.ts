import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

// body: { workoutId, name, sets, repMin, repMax, restSeconds? }
export async function POST(req: Request) {
  const body = await req.json();
  const { workoutId, name, sets, repMin, repMax, restSeconds } = body;
  if (!workoutId || !name || !sets || !repMin || !repMax) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const allExercises = await db.select().from(schema.exercises);
  const existingCount = allExercises.filter((e) => e.workoutId === workoutId).length;

  const [row] = await db
    .insert(schema.exercises)
    .values({
      workoutId,
      name,
      sets,
      repMin,
      repMax,
      restSeconds: restSeconds ?? null,
      sortOrder: existingCount,
    })
    .returning();

  return NextResponse.json(row);
}

// body: { id }
export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.delete(schema.exercises).where(eq(schema.exercises.id, id));
  return NextResponse.json({ ok: true });
}
