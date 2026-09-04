import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { saveProgram, loadProgram } from "@/lib/data";

// POST — copy a starter program's data into a program owned by the current user (same
// validated-data path as the builder/XML import), then apply it to their live schedule.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { id } = await params;
  const starterId = Number(id);
  const [starter] = await db.select().from(schema.starterPrograms).where(eq(schema.starterPrograms.id, starterId));
  if (!starter) return NextResponse.json({ error: "Starter program not found" }, { status: 404 });

  const saved = await saveProgram(userId, starter.name, starter.data);
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status });

  const loaded = await loadProgram(userId, saved.data.id);
  if (!loaded.ok) return NextResponse.json({ error: loaded.error }, { status: loaded.status });

  return NextResponse.json({ ok: true, programId: saved.data.id });
}
