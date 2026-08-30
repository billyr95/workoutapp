import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasActiveCoachAccess, upsertScheduleDay, logProgramEdit } from "@/lib/data";

// body: { day, type, name?, category? } — same shape as /api/schedule, scoped to a client.
export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const coachId = Number(session.user.id);

  const { clientId: clientIdParam } = await params;
  const clientId = Number(clientIdParam);
  if (!(await hasActiveCoachAccess(coachId, clientId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const result = await upsertScheduleDay(clientId, body.day, body.type, body.name, body.category);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logProgramEdit(coachId, clientId, result.summary);
  return NextResponse.json({ ok: true });
}
