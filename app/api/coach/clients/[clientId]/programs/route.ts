import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasActiveCoachAccess, listPrograms, saveProgram, deleteProgram, logProgramEdit } from "@/lib/data";

async function authorize(clientIdParam: string) {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const coachId = Number(session.user.id);
  const clientId = Number(clientIdParam);
  if (!(await hasActiveCoachAccess(coachId, clientId))) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { coachId, clientId };
}

export async function GET(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId: clientIdParam } = await params;
  const auth_ = await authorize(clientIdParam);
  if (auth_.error) return auth_.error;

  return NextResponse.json(await listPrograms(auth_.clientId));
}

// body: { name, data? } — same shape as /api/programs, scoped to a client.
export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId: clientIdParam } = await params;
  const auth_ = await authorize(clientIdParam);
  if (auth_.error) return auth_.error;

  const body = await req.json();
  const result = await saveProgram(auth_.clientId, typeof body.name === "string" ? body.name : "", body.data);
  if (!result.ok) return NextResponse.json({ error: result.error, errors: result.errors ?? [] }, { status: result.status });

  await logProgramEdit(auth_.coachId, auth_.clientId, result.summary);
  return NextResponse.json(result.data);
}

// body: { id }
export async function DELETE(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId: clientIdParam } = await params;
  const auth_ = await authorize(clientIdParam);
  if (auth_.error) return auth_.error;

  const { id } = await req.json();
  const result = await deleteProgram(auth_.clientId, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logProgramEdit(auth_.coachId, auth_.clientId, result.summary);
  return NextResponse.json({ ok: true });
}
