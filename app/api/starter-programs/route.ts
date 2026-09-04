import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";

// GET — the 10 sign-up starter programs, in display order, with their full schedule/workout
// data so the picker can expand a card into its day-by-day breakdown without a second fetch.
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
      data: r.data,
    }));

  return NextResponse.json(sorted);
}
