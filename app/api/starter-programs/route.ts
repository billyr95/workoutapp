import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";

// GET — the 10 sign-up starter programs, in display order, with a per-workout day count so
// the picker can show a quick split summary without shipping every exercise up front.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.select().from(schema.starterPrograms);
  const sorted = rows
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      level: r.level,
      daysPerWeek: r.daysPerWeek,
      workoutNames: r.data.workouts.map((w) => w.name),
    }));

  return NextResponse.json(sorted);
}
