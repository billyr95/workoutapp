import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { hasActiveCoachAccess } from "@/lib/data";

// body: { content, workoutLogId } — workoutLogId ties the note to one of the client's logged
// workout days; must belong to this client.
export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const coachId = Number(session.user.id);

  const { clientId: clientIdParam } = await params;
  const clientId = Number(clientIdParam);
  if (!(await hasActiveCoachAccess(coachId, clientId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { content, workoutLogId } = await req.json();
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Note can't be empty" }, { status: 400 });
  }

  let validatedLogId: number | null = null;
  if (workoutLogId != null) {
    const [log] = await db.select().from(schema.workoutLogs).where(eq(schema.workoutLogs.id, Number(workoutLogId)));
    if (!log || log.userId !== clientId) return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    validatedLogId = log.id;
  }

  const [row] = await db
    .insert(schema.coachNotes)
    .values({ coachId, clientId, workoutLogId: validatedLogId, content: content.trim(), createdAt: new Date().toISOString() })
    .returning();

  return NextResponse.json(row);
}
