import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasActiveCoachAccess, loadProgram, logProgramEdit } from "@/lib/data";

// body: { programId }
export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const coachId = Number(session.user.id);

  const { clientId: clientIdParam } = await params;
  const clientId = Number(clientIdParam);
  if (!(await hasActiveCoachAccess(coachId, clientId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { programId } = await req.json();
  const result = await loadProgram(clientId, programId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logProgramEdit(coachId, clientId, result.summary);
  return NextResponse.json({ ok: true });
}
