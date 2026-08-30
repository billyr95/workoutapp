import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addExerciseToWorkout, removeExerciseById } from "@/lib/data";

// body: { workoutId, name, sets, repMin, repMax, restSeconds? }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const body = await req.json();
  const result = await addExerciseToWorkout(userId, body.workoutId, {
    name: body.name,
    sets: body.sets,
    repMin: body.repMin,
    repMax: body.repMax,
    restSeconds: body.restSeconds ?? null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json(result.data);
}

// body: { id }
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { id } = await req.json();
  const result = await removeExerciseById(userId, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true });
}
