import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasActiveCoachAccess, addExerciseToWorkout, removeExerciseById, updateExerciseById, logProgramEdit } from "@/lib/data";

// body: { workoutId, name, sets, repMin, repMax, restSeconds? } — same shape as /api/exercises, scoped to a client.
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
  const result = await addExerciseToWorkout(clientId, body.workoutId, {
    name: body.name,
    sets: body.sets,
    repMin: body.repMin,
    repMax: body.repMax,
    restSeconds: body.restSeconds ?? null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logProgramEdit(coachId, clientId, result.summary);
  return NextResponse.json(result.data);
}

// body: { id, name, sets, repMin, repMax, restSeconds? } — same shape as /api/exercises, scoped to a client.
export async function PATCH(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const coachId = Number(session.user.id);

  const { clientId: clientIdParam } = await params;
  const clientId = Number(clientIdParam);
  if (!(await hasActiveCoachAccess(coachId, clientId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const result = await updateExerciseById(clientId, body.id, {
    name: body.name,
    sets: body.sets,
    repMin: body.repMin,
    repMax: body.repMax,
    restSeconds: body.restSeconds ?? null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logProgramEdit(coachId, clientId, result.summary);
  return NextResponse.json(result.data);
}

// body: { id }
export async function DELETE(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const coachId = Number(session.user.id);

  const { clientId: clientIdParam } = await params;
  const clientId = Number(clientIdParam);
  if (!(await hasActiveCoachAccess(coachId, clientId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await req.json();
  const result = await removeExerciseById(clientId, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logProgramEdit(coachId, clientId, result.summary);
  return NextResponse.json({ ok: true });
}
